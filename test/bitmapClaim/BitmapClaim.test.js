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
    before(function () {
      this.bitValue = 100;
      this.bitPosition = 0;
    });

    it('Reverts with {NotContractOwner} if not called by owner', async function () {
      await expect(this.contract.connect(other).addBitValue(this.bitValue))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.addBitValue(this.bitValue);
      });

      it('adds value to new bit position', async function () {
        expect(await this.contract.bitPositionValueMap(this.bitPosition)).to.equal(this.bitValue);
      });

      it('increases maxBitCount by 1', async function () {
        expect(await this.contract.maxBitCount()).to.equal(1);
      });

      it('emits a BitValueSet event', function () {
        expect(this.receipt).to.emit(this.contract, 'BitValueSet').withArgs(this.bitPosition, this.bitValue);
      });
    });
  });

  describe('claim(address recipient, uint256[] claimBitPositions, bytes calldata validationData)', function () {
    it('Reverts with {ZeroLengthClaimBitPositions} if claimBitPositions has zero length', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [];

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData)).to.revertedWithCustomError(
        this.contract,
        'ZeroLengthClaimBitPositions'
      );
    });

    it('Reverts with {DuplicateClaimBit} if two bits of claimBitPositions are the same', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [0, 0];

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData))
        .to.revertedWithCustomError(this.contract, 'DuplicateClaimBit')
        .withArgs(0);
    });

    it('Reverts with {InvalidBitPosition} if claimBits is zero or exceeding maxBitCount.', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [10];
      const consolidatedClaimBits = 2 ** 10;

      await expect(this.contract.connect(other).claim(recipient, claimBitPositions, this.validationData))
        .to.revertedWithCustomError(this.contract, 'InvalidBitPosition')
        .withArgs(consolidatedClaimBits, 0);
    });

    context('when bit value is added', function () {
      beforeEach(async function () {
        this.bitValue = 100;
        await this.contract.addBitValue(this.bitValue);
      });

      it('Reverts with {AlreadyClaimed} if one of the the given claimBits has been claimed', async function () {
        const recipient = recipient1.address;
        const claimBitPositions = [0];
        const consolidatedClaimBits = 1;

        await this.contract.claim(recipient, claimBitPositions, this.validationData);
        await expect(this.contract.claim(recipient, claimBitPositions, this.validationData))
          .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
          .withArgs(recipient, consolidatedClaimBits, consolidatedClaimBits);
      });

      context('when successful', function () {
        it('sets claimed to claimBits', async function () {
          const recipient = recipient1.address;
          const claimBitPositions = [0];
          const consolidatedClaimBits = 1;

          await this.contract.claim(recipient, claimBitPositions, this.validationData);
          const claimedBitmap = await this.contract.claimed(recipient);
          expect(claimedBitmap).to.equal(consolidatedClaimBits);

          await this.contract.addBitValue(200);

          const claimBitPositions2 = [1];
          const consolidatedClaimBits2 = 2;
          await this.contract.claim(recipient, claimBitPositions2, this.validationData);
          const claimedBitmap2 = await this.contract.claimed(recipient);
          expect(claimedBitmap2).to.equal(BigInt(consolidatedClaimBits2 | consolidatedClaimBits));
        });

        it('emits a Claimed event', async function () {
          const recipient = recipient1.address;
          const claimBitPositions = [0];
          const consolidatedClaimBits = 1;

          await expect(this.contract.claim(recipient, claimBitPositions, this.validationData))
            .to.emit(this.contract, 'Claimed')
            .withArgs(recipient, 0, consolidatedClaimBits)
            .to.emit(this.contract, 'ValidateClaimCalled')
            .withArgs(recipient, claimBitPositions, this.validationData)
            .to.emit(this.contract, 'DeliverCalled')
            .withArgs(recipient, this.bitValue);
        });
      });
    });

    context('when reentrancy happens', function () {
      it('reverts with {AlreadyClaimed} when reentrancy happens at _validateClaim function', async function () {
        const bitmapClaimMockReentrancyAttackContract = await deployContract('BitmapClaimMockReentrancyAttack');
        bitmapClaimMockReentrancyAttackContract.setEnableValidateClaimReentrancy(true);

        const bitValue = 100;
        await bitmapClaimMockReentrancyAttackContract.addBitValue(bitValue);

        const recipient = recipient1.address;
        const claimBitPositions = [0];
        const consolidatedClaimBits = 1;

        await expect(bitmapClaimMockReentrancyAttackContract.claim(recipient, claimBitPositions, this.validationData))
          .to.be.revertedWithCustomError(bitmapClaimMockReentrancyAttackContract, 'AlreadyClaimed')
          .withArgs(recipient, consolidatedClaimBits, 1);
      });

      it('reverts with {AlreadyClaimed} when reentrancy happens at _deliver function', async function () {
        const bitmapClaimMockReentrancyAttackContract = await deployContract('BitmapClaimMockReentrancyAttack');
        bitmapClaimMockReentrancyAttackContract.setEnableValidateClaimReentrancy(false);

        const bitValue = 100;
        await bitmapClaimMockReentrancyAttackContract.addBitValue(bitValue);

        const recipient = recipient1.address;
        const claimBitPositions = [0];
        const consolidatedClaimBits = 1;

        await expect(bitmapClaimMockReentrancyAttackContract.claim(recipient, claimBitPositions, this.validationData))
          .to.be.revertedWithCustomError(bitmapClaimMockReentrancyAttackContract, 'AlreadyClaimed')
          .withArgs(recipient, consolidatedClaimBits, 1);
      });
    });
  });
});
