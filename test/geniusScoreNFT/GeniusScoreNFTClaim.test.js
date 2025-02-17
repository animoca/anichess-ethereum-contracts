const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

const {
  getOperatorFilterRegistryAddress,
  getForwarderRegistryAddress,
  getTokenMetadataResolverWithBaseURIAddress,
} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('GeniusScoreNFTClaim', function () {
  before(async function () {
    [deployer, signer, newSigner, recipient1, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.metadataResolverAddress = await getTokenMetadataResolverWithBaseURIAddress();
    this.operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.rewardContract = await deployContract(
      'ERC721Full',
      'GeniusScoreNFT',
      'GSN',
      this.metadataResolverAddress,
      this.operatorFilterRegistryAddress,
      this.forwarderRegistryAddress
    );

    this.rewardContractAddress = await this.rewardContract.getAddress();

    this.contract = await deployContract('GeniusScoreNFTClaim', this.rewardContract, await signer.getAddress());
    this.claimContractAddress = await this.contract.getAddress();

    await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), this.claimContractAddress);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the reward contract address is 0', async function () {
      await expect(deployContract('GeniusScoreNFTClaim', ethers.ZeroAddress, await signer.getAddress())).to.be.revertedWithCustomError(
        this.contract,
        'InvalidRewardContractAddress'
      );
    });
    context('when successful', function () {
      it('sets the reward contract', async function () {
        expect(await this.contract.REWARD_CONTRACT()).to.equal(this.rewardContractAddress);
      });
      it('sets the signer', async function () {
        expect(await this.contract.signer()).to.equal(await signer.getAddress());
      });
    });
  });

  describe('setSigner(address newSigner)', function () {
    it('Reverts with {SignerAlreadySet} if signer address has already been set', async function () {
      const signerAddress = await signer.getAddress();

      await expect(this.contract.setSigner(signerAddress)).to.revertedWithCustomError(this.contract, 'SignerAlreadySet').withArgs(signerAddress);
    });

    it('Reverts with {NotContractOwner} if not called by owner', async function () {
      const newSignerAddress = await newSigner.getAddress();

      await expect(this.contract.connect(other).setSigner(newSignerAddress))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other);
    });

    context('when successful', function () {
      it('sets signer to new value', async function () {
        const newSignerAddress = await newSigner.getAddress();

        await this.contract.setSigner(newSignerAddress);

        expect(await this.contract.signer()).to.equal(newSignerAddress);
      });
      it('emits a SignerSet event', async function () {
        const newSignerAddress = await newSigner.getAddress();

        await expect(this.contract.setSigner(newSignerAddress)).to.emit(this.contract, 'SignerSet').withArgs(newSignerAddress);
      });
    });
  });

  describe('claim(address recipient, uint96 score, bytes calldata signature)', function () {
    it('Reverts if the signature is not a valid ERC712 signature', async function () {
      const recipient = recipient1.address;
      const score = 123;
      const signature =
        '0x123456789012345678901234567890123456789012345678901234567890ABCEF123456789012345678901234567890123456789012345678901234567890ABCEF';

      await expect(this.contract.claim(recipient, score, signature)).to.be.revertedWithCustomError(this.contract, 'InvalidSignature');
    });

    it('Reverts if the recipient has already claimed', async function () {
      const recipient = recipient1.address;
      const score = 123;

      const domain = {
        name: 'GeniusScoreNFTClaim',
        version: '1.0',
        chainId: await getChainId(),
        verifyingContract: this.claimContractAddress,
      };

      const rewardClaimType = {
        GeniusScoreNFTClaim: [
          {name: 'recipient', type: 'address'},
          {name: 'score', type: 'uint96'},
        ],
      };

      const signature = await signer.signTypedData(domain, rewardClaimType, {
        recipient,
        score,
      });

      await this.contract.connect(other).claim(recipient, score, signature);

      await expect(this.contract.connect(other).claim(recipient, score, signature))
        .to.be.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient);
    });

    context('when successful', function () {
      it('should set claimed[recipient] to true', async function () {
        const recipient = recipient1.address;
        const score = 123;

        const domain = {
          name: 'GeniusScoreNFTClaim',
          version: '1.0',
          chainId: await getChainId(),
          verifyingContract: this.claimContractAddress,
        };

        const rewardClaimType = {
          GeniusScoreNFTClaim: [
            {name: 'recipient', type: 'address'},
            {name: 'score', type: 'uint96'},
          ],
        };

        const signature = await signer.signTypedData(domain, rewardClaimType, {
          recipient,
          score,
        });

        await this.contract.connect(other).claim(recipient, score, signature);

        expect(await this.contract.claimed(recipient)).to.equal(true);

        const balance = await this.rewardContract.balanceOf(recipient);
        expect(balance).to.equal(1);
      });

      it('should emit {Claimed} event', async function () {
        const recipient = recipient1.address;
        const score = 123;

        const domain = {
          name: 'GeniusScoreNFTClaim',
          version: '1.0',
          chainId: await getChainId(),
          verifyingContract: this.claimContractAddress,
        };

        const rewardClaimType = {
          GeniusScoreNFTClaim: [
            {name: 'recipient', type: 'address'},
            {name: 'score', type: 'uint96'},
          ],
        };

        const signature = await signer.signTypedData(domain, rewardClaimType, {
          recipient,
          score,
        });

        await expect(this.contract.connect(other).claim(recipient, score, signature)).to.emit(this.contract, 'Claimed').withArgs(recipient, score);
      });
    });
  });
});
