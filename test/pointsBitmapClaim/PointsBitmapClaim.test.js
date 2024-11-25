const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('PointsBitmapClaim', function () {
  before(async function () {
    [deployer, recipient1, recipient2, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.depositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.points = await deployContract('Points', this.forwarderRegistryAddress);
    this.contract = await deployContract('PointsBitmapClaim', this.points, this.forwarderRegistryAddress, this.depositReasonCode);

    await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the points contract address is 0', async function () {
      await expect(
        deployContract('PointsBitmapClaim', '0x0000000000000000000000000000000000000000', this.forwarderRegistryAddress, this.depositReasonCode)
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsContractAddress');
    });
    it('reverts if the forwarder registry address is 0', async function () {
      await expect(
        deployContract('PointsBitmapClaim', this.points, '0x0000000000000000000000000000000000000000', this.depositReasonCode)
      ).to.be.revertedWithCustomError(this.contract, 'InvalidForwarderRegistry');
    });
    context('when successful', function () {
      it('sets the points contract', async function () {
        expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
      });
      it('sets the deposit reason code', async function () {
        expect(await this.contract.DEPOSIT_REASON_CODE()).to.equal(await this.depositReasonCode);
      });
    });
  });

  describe('mock: __validateClaim(address recipient, uint256 claimBits, bytes calldata validationData)', function () {
    it('Reverts if the validationData is not a valid signature', async function () {
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode
      );

      const recipient = recipient1.address;
      const claimBits = 1;
      const validationData = '0x1234';

      await expect(this.contract.connect(deployer).__validateClaim(recipient, claimBits, validationData)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSignature'
      );
    });

    context('when successful', function () {
      it('Does not revert', async function () {
        const recipient = recipient1.address;
        const claimBits = 1;

        this.contract = await deployContract(
          'PointsBitmapClaimMock',
          await this.points.getAddress(),
          this.forwarderRegistryAddress,
          this.depositReasonCode
        );

        const domain = {
          name: 'PointsBitmapClaim',
          version: '1.0',
          chainId: await getChainId(),
          verifyingContract: await this.contract.getAddress(),
        };

        const pointsBitmapClaimType = {
          PointsBitmapClaim: [
            {name: 'recipient', type: 'address'},
            {name: 'claimBits', type: 'uint256'},
          ],
        };

        const validationData = await deployer.signTypedData(domain, pointsBitmapClaimType, {
          recipient,
          claimBits,
        });

        await expect(this.contract.connect(deployer).__validateClaim(recipient, claimBits, validationData)).to.not.be.reverted;
      });
    });
  });

  describe('mock: __deliver(address recipient, uint256 amount)', function () {
    it('Reverts if the validationData is not a valid signature', async function () {
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode
      );

      const recipient = recipient1.address;
      const claimBits = 1;
      const validationData = '0x1234';

      await expect(this.contract.connect(deployer).__validateClaim(recipient, claimBits, validationData)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSignature'
      );
    });

    context('when successful', function () {
      it('Updates points balance', async function () {
        const recipient = recipient1.address;
        const amount = 100;

        this.contract = await deployContract(
          'PointsBitmapClaimMock',
          await this.points.getAddress(),
          this.forwarderRegistryAddress,
          this.depositReasonCode
        );

        await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());

        await this.contract.connect(deployer).__deliver(recipient, amount);

        expect(await this.points.balances(recipient)).to.equal(amount);
      });
    });
  });

  context('meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode
      );
      expect(await this.contract.connect(deployer).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode
      );

      // Act

      // Assert
      expect(await this.contract.connect(deployer).__msgSender()).to.be.exist;
    });
  });
});
