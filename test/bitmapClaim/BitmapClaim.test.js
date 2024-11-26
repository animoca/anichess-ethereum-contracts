const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('BitmapClaim', function () {
  before(async function () {
    [deployer, operator, recipient1, recipient2, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.contract = await deployContract('BitmapClaimMock');
    this.validationData = '0x1234';
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('addBitValue(uint256 value)', function () {
    it('Reverts with {NotContractOwner} if not called by owner', async function () {
      const bitPosition = 1;
      const value = 100;

      await expect(this.contract.connect(other).addBitValue(value)).to.revertedWithCustomError(this.contract, 'NotContractOwner').withArgs(other);
    });

    context('when successful', function () {
      it('adds value to new bit position', async function () {
        const bitPosition = 0;
        const value = 100;

        await this.contract.connect(deployer).addBitValue(value);

        expect(await this.contract.bitPositionValueMap(bitPosition)).to.equal(value);
      });
      it('increases maxBitCount by 1', async function () {
        const value = 100;

        await this.contract.connect(deployer).addBitValue(value);

        expect(await this.contract.maxBitCount()).to.equal(1);
      });
      it('emits a BitValueSet event', async function () {
        const value = 100;

        await expect(this.contract.connect(deployer).addBitValue(value)).to.emit(this.contract, 'BitValueSet').withArgs(0, value);
      });
    });
  });

  describe('updateBitValue(uint256 bitPosition, uint256 value)', function () {
    it('Reverts with {NotContractOwner} if not called by owner', async function () {
      const bitPosition = 0;
      const value = 100;

      await this.contract.connect(deployer).addBitValue(value);

      await expect(this.contract.connect(other).updateBitValue(bitPosition, value))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other);
    });

    it('Reverts with {BitPositionTooBig} if bitPosition is larger than maxBitCount', async function () {
      const bitPosition = 1;
      const value = 100;

      await expect(this.contract.connect(deployer).updateBitValue(bitPosition, value))
        .to.revertedWithCustomError(this.contract, 'BitPositionTooBig')
        .withArgs(bitPosition, 0);
    });

    context('when successful', function () {
      it('sets value for bitPosition', async function () {
        const bitPosition = 0;
        const oldValue = 100;
        const newValue = 200;

        await this.contract.connect(deployer).addBitValue(oldValue);

        await this.contract.connect(deployer).updateBitValue(bitPosition, newValue);

        expect(await this.contract.bitPositionValueMap(bitPosition)).to.equal(newValue);
      });
      it('emits a BitValueSet event', async function () {
        const bitPosition = 0;
        const value = 100;

        await this.contract.connect(deployer).addBitValue(value);

        await expect(this.contract.connect(deployer).updateBitValue(bitPosition, value))
          .to.emit(this.contract, 'BitValueSet')
          .withArgs(bitPosition, value);
      });
    });
  });

  describe('claim(address recipient, uint256 claimBits, bytes calldata validationData)', function () {
    it('Reverts with {InvalidClaimBits} if claimBits is zero', async function () {
      const recipient = recipient1.address;
      const claimBits = 0;

      await expect(this.contract.connect(other).claim(recipient, claimBits, this.validationData))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimBits')
        .withArgs(claimBits);
    });

    it('Reverts with {InvalidClaimBits} if claimBits is too big', async function () {
      const recipient = recipient1.address;
      const claimBits = 1;

      await expect(this.contract.connect(other).claim(recipient, claimBits, this.validationData))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimBits')
        .withArgs(claimBits);
    });

    it('Reverts with {AlreadyClaimed} if one of the the given claimBits has been claimed', async function () {
      await this.contract.connect(deployer).addBitValue(100);
      await this.contract.connect(deployer).addBitValue(200);

      const recipient = recipient1.address;
      const claimBits = 1;

      await this.contract.connect(deployer).claim(recipient, claimBits, this.validationData);

      const claimBitsAgain = 3;

      await expect(this.contract.connect(deployer).claim(recipient, claimBitsAgain, this.validationData))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, claimBitsAgain, claimBits);
    });

    context('when successful', function () {
      it('sets claimed to claimBits', async function () {
        await this.contract.connect(deployer).addBitValue(100);
        await this.contract.connect(deployer).addBitValue(200);

        const recipient = recipient1.address;
        const claimBits = 1;

        await this.contract.connect(deployer).claim(recipient, claimBits, this.validationData);
        const claimedBitmap = await this.contract.claimed(recipient);
        expect(claimedBitmap).to.equal(claimBits);

        const claimBits2 = 2;
        await this.contract.connect(deployer).claim(recipient, claimBits2, this.validationData);
        const claimedBitmap2 = await this.contract.claimed(recipient);
        expect(claimedBitmap2).to.equal(BigInt(claimBits2 | claimBits));
      });

      it('emits a Claimed event', async function () {
        await this.contract.connect(deployer).addBitValue(100);

        const recipient = recipient1.address;
        const amount = 100;
        const bitPosition = 0;
        const claimBits = 1;

        await this.contract.connect(deployer).updateBitValue(bitPosition, amount);

        await expect(this.contract.connect(deployer).claim(recipient, claimBits, this.validationData))
          .to.emit(this.contract, 'Claimed')
          .withArgs(recipient, 0, claimBits)
          .to.emit(this.contract, 'ValidateClaimCalled')
          .withArgs(recipient, claimBits, this.validationData)
          .to.emit(this.contract, 'DeliverCalled')
          .withArgs(recipient, amount);
      });
    });
  });
});
