const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

const {FulfillRandomnessType} = require('../../../src/constants/RNGProvider');

describe('RNGProvider', function () {
  let deployer, other, signer;

  before(async function () {
    [deployer, other, signer] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('RNGProvider', await signer.getAddress());
    this.consumer = await deployContract('RNGConsumerMock', await this.contract.getAddress());
    this.domain = {
      name: 'RNGProvider',
      version: '1',
      chainId: await getChainId(),
      verifyingContract: await this.contract.getAddress(),
    };
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor(address)', function () {
    context('when successful', function () {
      it('sets the signer', async function () {
        expect(await this.contract.signer()).to.equal(signer);
      });
      it('emits a SignerSet event', async function () {
        await expect(this.contract.deploymentTransaction()).to.emit(this.contract, 'SignerSet').withArgs(signer);
      });
    });
  });

  describe('setSigner(address)', function () {
    it('reverts if not called by the contract owner', async function () {
      await expect(this.contract.connect(other).setSigner(other.address))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(deployer).setSigner(other.address);
      });
      it('sets the signer', async function () {
        expect(await this.contract.signer()).to.equal(other.address);
      });
      it('emits a SignerSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'SignerSet').withArgs(other.address);
      });
    });
  });

  describe('whitelistConsumer(address,bool)', function () {
    it('reverts if not called by the contract owner', async function () {
      await expect(this.contract.connect(other).whitelistConsumer(other.address, true))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful, adding a consumer', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(deployer).whitelistConsumer(other.address, true);
      });
      it('whitelists the consumer', async function () {
        expect(await this.contract.consumersWhitelist(other.address)).to.be.true;
      });
      it('emits a ConsumerWhitelistingUpdated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ConsumerWhitelistingUpdated').withArgs(other.address, true);
      });
    });

    context('when successful, removing a consumer', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(deployer).whitelistConsumer(other.address, false);
      });
      it('removes the consumer from the whitelist', async function () {
        expect(await this.contract.consumersWhitelist(other.address)).to.be.false;
      });
      it('emits a ConsumerWhitelistingUpdated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ConsumerWhitelistingUpdated').withArgs(other.address, false);
      });
    });

    describe('requestRandomness(uint32)', function () {
      it('reverts if not called by a whitelisted consumer', async function () {
        await expect(this.contract.requestRandomness(1))
          .to.be.revertedWithCustomError(this.contract, 'ConsumerNotWhitelisted')
          .withArgs(deployer.address);
      });

      context('when successful', function () {
        beforeEach(async function () {
          await this.contract.whitelistConsumer(other.address, true);
          this.receipt = await this.contract.connect(other).requestRandomness(3);
          this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [other.address, 3, 0]));
        });

        it('emits a RandomnessRequested event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'RandomnessRequested').withArgs(other.address, this.requestId, 3);
        });

        it('creates a request entry', async function () {
          const requestDetails = await this.contract.requestDetails(this.requestId);
          expect(requestDetails.consumer).to.equal(other.address);
          expect(requestDetails.fulfilled).to.be.false;
          expect(requestDetails.numWords).to.equal(3);
          expect(requestDetails.randomWords.length).to.equal(0);
        });

        it('increments the nonce', async function () {
          expect(await this.contract.nonce()).to.equal(1);
        });
      });
    });

    describe('fulfillRandomness(uint256,uint256[],bytes)', function () {
      it('reverts if the signer is not the expected signer', async function () {
        const randomWords = [1, 2, 3];
        const signature = await other.signTypedData(this.domain, FulfillRandomnessType, {
          requestId: 0,
          randomWords: randomWords,
        });
        await expect(this.contract.fulfillRandomness(0, randomWords, signature)).to.be.revertedWithCustomError(this.contract, 'InvalidSignature');
      });

      it('reverts if the request is unknown', async function () {
        const randomWords = [1, 2, 3];
        const signature = await signer.signTypedData(this.domain, FulfillRandomnessType, {
          requestId: 0,
          randomWords: randomWords,
        });
        await expect(this.contract.fulfillRandomness(0, randomWords, signature))
          .to.be.revertedWithCustomError(this.contract, 'UnknownRequestId')
          .withArgs(0);
      });

      it('reverts if the number of random words mismatches the request', async function () {
        await this.contract.whitelistConsumer(other.address, true);
        await this.contract.connect(other).requestRandomness(3);
        const randomWords = [1, 2, 3, 4];
        const requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [other.address, 3, 0]));
        const signature = await signer.signTypedData(this.domain, FulfillRandomnessType, {
          requestId: requestId,
          randomWords: randomWords,
        });
        await expect(this.contract.fulfillRandomness(requestId, randomWords, signature))
          .to.be.revertedWithCustomError(this.contract, 'WrongRandomWordsCount')
          .withArgs(3, 4);
      });

      it('reverts if the request was already fulfilled', async function () {
        await this.contract.whitelistConsumer(await this.consumer.getAddress(), true);
        await this.consumer.requestRandomness(3);
        const requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.consumer.getAddress(), 3, 0]));
        const randomWords = [1, 2, 3];
        const signature = await signer.signTypedData(this.domain, FulfillRandomnessType, {
          requestId: requestId,
          randomWords: randomWords,
        });
        await this.contract.fulfillRandomness(requestId, randomWords, signature);
        await expect(this.contract.fulfillRandomness(requestId, randomWords, signature))
          .to.be.revertedWithCustomError(this.contract, 'RequestAlreadyFulfilled')
          .withArgs(requestId);
      });

      context('when successful', function () {
        beforeEach(async function () {
          await this.contract.whitelistConsumer(await this.consumer.getAddress(), true);
          await this.consumer.requestRandomness(3);
          this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.consumer.getAddress(), 3, 0]));
          const randomWords = [1, 2, 3];
          const signature = await signer.signTypedData(this.domain, FulfillRandomnessType, {
            requestId: this.requestId,
            randomWords: randomWords,
          });
          this.receipt = await this.contract.fulfillRandomness(this.requestId, randomWords, signature);
        });

        it('sets the request status to fulfilled', async function () {
          const requestDetails = await this.contract.requestDetails(this.requestId);
          expect(requestDetails.fulfilled).to.be.true;
          expect(requestDetails.randomWords).to.deep.equal([1, 2, 3]);
        });

        it('emits a RandomnessFulfilled event', async function () {
          await expect(this.receipt)
            .to.emit(this.contract, 'RandomnessFulfilled')
            .withArgs(await this.consumer.getAddress(), this.requestId, [1, 2, 3]);
        });

        it('calls back the consumer', async function () {
          await expect(this.receipt).to.emit(this.consumer, 'FulfillRandomnessCalled').withArgs(this.requestId, [1, 2, 3]);
        });
      });
    });
  });
});
