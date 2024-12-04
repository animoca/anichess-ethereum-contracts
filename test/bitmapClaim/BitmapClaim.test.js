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

    it('Reverts with {UpdatingInvalidBitPosition} if bitPosition is larger than maxBitCount', async function () {
      const bitPosition = 1;
      const value = 100;

      await expect(this.contract.connect(deployer).updateBitValue(bitPosition, value))
        .to.revertedWithCustomError(this.contract, 'UpdatingInvalidBitPosition')
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

  describe('claim(address recipient, uint256[] claimBitPositions, bytes calldata validationData)', function () {
    it('Reverts with {InvalidClaimBitPositions} if claimBitPositions has zero length', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [];

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimBitPositions')
        .withArgs(claimBitPositions);
    });

    it('Reverts with {DuplicateClaimBit} if two bits of claimBitPositions are the same', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [0, 0];

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData))
        .to.revertedWithCustomError(this.contract, 'DuplicateClaimBit')
        .withArgs(0);
    });

    it('Reverts with {BitPositionTooBig} if one of the bit position is too big', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [10];
      const consolidatedClaimBits = 2 ** 10;

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData))
        .to.revertedWithCustomError(this.contract, 'BitPositionTooBig')
        .withArgs(consolidatedClaimBits, 0);
    });

    it('Reverts with {AlreadyClaimed} if one of the the given claimBits has been claimed', async function () {
      await this.contract.connect(deployer).addBitValue(100);
      await this.contract.connect(deployer).addBitValue(200);

      const recipient = recipient1.address;
      const claimBitPositions = [0];
      const consolidatedClaimBits = 1;

      await this.contract.connect(deployer).claim(recipient, claimBitPositions, this.validationData);

      const claimBitPositionsAgain = [1, 0];
      const consolidatedClaimBitsAgain = 3;

      await expect(this.contract.connect(deployer).claim(recipient, claimBitPositionsAgain, this.validationData))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, consolidatedClaimBitsAgain, consolidatedClaimBits);
    });

    context('when successful', function () {
      it('sets claimed to claimBits', async function () {
        await this.contract.connect(deployer).addBitValue(100);
        await this.contract.connect(deployer).addBitValue(200);

        const recipient = recipient1.address;
        const claimBitPositions = [0];
        const consolidatedClaimBits = 1;

        await this.contract.connect(deployer).claim(recipient, claimBitPositions, this.validationData);
        const claimedBitmap = await this.contract.claimed(recipient);
        expect(claimedBitmap).to.equal(consolidatedClaimBits);

        const claimBitPositions2 = [1];
        const consolidatedClaimBits2 = 2;
        await this.contract.connect(deployer).claim(recipient, claimBitPositions2, this.validationData);
        const claimedBitmap2 = await this.contract.claimed(recipient);
        expect(claimedBitmap2).to.equal(BigInt(consolidatedClaimBits2 | consolidatedClaimBits));
      });

      it('emits a Claimed event', async function () {
        const recipient = recipient1.address;
        const amount = 100;
        const claimBitPositions = [0];
        const consolidatedClaimBits = 1;

        await this.contract.connect(deployer).addBitValue(amount);

        await expect(this.contract.connect(deployer).claim(recipient, claimBitPositions, this.validationData))
          .to.emit(this.contract, 'Claimed')
          .withArgs(recipient, 0, consolidatedClaimBits)
          .to.emit(this.contract, 'ValidateClaimCalled')
          .withArgs(recipient, claimBitPositions, this.validationData)
          .to.emit(this.contract, 'DeliverCalled')
          .withArgs(recipient, amount);
      });
    });
  });
});
