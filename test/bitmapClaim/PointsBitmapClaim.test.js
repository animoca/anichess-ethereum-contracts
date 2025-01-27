const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const keccak256 = require('keccak256');

describe('PointsBitmapClaim', function () {
  before(async function () {
    [deployer, signer, newSigner, recipient1, recipient2, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.depositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.points = await deployContract('Points', this.forwarderRegistryAddress);
    this.contract = await deployContract(
      'PointsBitmapClaim',
      this.points,
      this.forwarderRegistryAddress,
      this.depositReasonCode,
      await signer.getAddress()
    );

    await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the points contract address is 0', async function () {
      await expect(
        deployContract(
          'PointsBitmapClaim',
          '0x0000000000000000000000000000000000000000',
          this.forwarderRegistryAddress,
          this.depositReasonCode,
          await signer.getAddress()
        )
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsContractAddress');
    });
    context('when successful', function () {
      it('sets the points contract', async function () {
        expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
      });
      it('sets the deposit reason code', async function () {
        expect(await this.contract.DEPOSIT_REASON_CODE()).to.equal(await this.depositReasonCode);
      });
      it('sets the signer', async function () {
        expect(await this.contract.signer()).to.equal(await signer.getAddress());
      });
    });
  });

  describe('setSigner(address newSigner)', function () {
    it('Reverts with {SignerAlreadySet} if signer address has already been set', async function () {
      const signerAddress = await signer.getAddress();

      await expect(this.contract.connect(deployer).setSigner(signerAddress))
        .to.revertedWithCustomError(this.contract, 'SignerAlreadySet')
        .withArgs(signerAddress);
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

        await this.contract.connect(deployer).setSigner(newSignerAddress);

        expect(await this.contract.signer()).to.equal(newSignerAddress);
      });
      it('emits a SignerSet event', async function () {
        const newSignerAddress = await newSigner.getAddress();

        await expect(this.contract.connect(deployer).setSigner(newSignerAddress)).to.emit(this.contract, 'SignerSet').withArgs(newSignerAddress);
      });
    });
  });

  describe('mock: __validateClaim(address recipient, uint256 claimBits, bytes calldata validationData)', function () {
    it('Reverts if the validationData is not a valid signature', async function () {
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode,
        await signer.getAddress()
      );

      const recipient = recipient1.address;
      const claimBitPositions = [0];
      const validationData = '0x1234';

      await expect(this.contract.connect(deployer).__validateClaim(recipient, claimBitPositions, validationData)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSignature'
      );
    });

    context('when successful', function () {
      it('Does not revert', async function () {
        const recipient = recipient1.address;
        const claimBitPositions = [0];

        this.contract = await deployContract(
          'PointsBitmapClaimMock',
          await this.points.getAddress(),
          this.forwarderRegistryAddress,
          this.depositReasonCode,
          await signer.getAddress()
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
            {name: 'claimBitPositionsHash', type: 'bytes32'},
          ],
        };

        const validationData = await signer.signTypedData(domain, pointsBitmapClaimType, {
          recipient,
          claimBitPositionsHash: keccak256(new ethers.AbiCoder().encode(['uint256[]'], [claimBitPositions])),
        });

        await this.contract.connect(other).__validateClaim(recipient, claimBitPositions, validationData);
        // await expect(this.contract.connect(other).__validateClaim(recipient, claimBitPositions, validationData)).to.not.be.reverted;
      });
    });
  });

  describe('mock: __deliver(address recipient, uint256 amount)', function () {
    it('Reverts if the validationData is not a valid signature', async function () {
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode,
        await signer.getAddress()
      );

      const recipient = recipient1.address;
      const claimBitPosition = [0];
      const validationData = '0x1234';

      await expect(this.contract.connect(deployer).__validateClaim(recipient, claimBitPosition, validationData)).to.be.revertedWithCustomError(
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
          this.depositReasonCode,
          await signer.getAddress()
        );

        await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());

        await this.contract.connect(deployer).__deliver(recipient, amount);

        expect(await this.points.balances(recipient)).to.equal(amount);
      });
      it('Does nothing if deliver zero amount', async function () {
        const recipient = recipient1.address;
        const amount = 0;

        this.contract = await deployContract(
          'PointsBitmapClaimMock',
          await this.points.getAddress(),
          this.forwarderRegistryAddress,
          this.depositReasonCode,
          await signer.getAddress()
        );

        await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());

        const balanceBefore = await this.points.balances(recipient);

        await this.contract.connect(deployer).__deliver(recipient, amount);

        const balanceAfter = await this.points.balances(recipient);

        expect(balanceAfter).to.equal(balanceBefore);
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
        this.depositReasonCode,
        await signer.getAddress()
      );
      expect(await this.contract.connect(deployer).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      this.contract = await deployContract(
        'PointsBitmapClaimMock',
        await this.points.getAddress(),
        this.forwarderRegistryAddress,
        this.depositReasonCode,
        await signer.getAddress()
      );

      // Act

      // Assert
      expect(await this.contract.connect(deployer).__msgSender()).to.be.exist;
    });
  });
});
