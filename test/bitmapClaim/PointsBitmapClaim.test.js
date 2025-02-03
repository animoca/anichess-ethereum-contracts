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
    this.pointsContractAddress = await this.points.getAddress();
    this.contract = await deployContract(
      'PointsBitmapClaim',
      this.points,
      this.forwarderRegistryAddress,
      this.depositReasonCode,
      await signer.getAddress()
    );
    this.claimContractAddress = await this.contract.getAddress();

    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), this.claimContractAddress);

    this.mockContract = await deployContract(
      'PointsBitmapClaimMock',
      this.pointsContractAddress,
      this.forwarderRegistryAddress,
      this.depositReasonCode,
      await signer.getAddress()
    );
    this.mockContractAddress = await this.mockContract.getAddress();
    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), this.mockContractAddress);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the points contract address is 0', async function () {
      await expect(
        deployContract('PointsBitmapClaim', ethers.ZeroAddress, this.forwarderRegistryAddress, this.depositReasonCode, await signer.getAddress())
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsContractAddress');
    });
    context('when successful', function () {
      it('sets the points contract', async function () {
        expect(await this.contract.POINTS()).to.equal(this.pointsContractAddress);
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

  describe('claim(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData)', function () {
    beforeEach(async function () {
      await this.contract.addBitValue(100);
      await this.contract.addBitValue(0);
      this.oldBalance = await this.points.balances(recipient1.address);
    });

    it('Reverts if the validationData is not a valid signature', async function () {
      const recipient = recipient1.address;
      const claimBitPositions = [0];
      const validationData = '0x1234';

      await expect(this.contract.claim(recipient, claimBitPositions, validationData)).to.be.revertedWithCustomError(
        this.mockContract,
        'InvalidSignature'
      );
    });

    context('when successful', function () {
      it('should not revert if the value claimed is larger than zero', async function () {
        const recipient = recipient1.address;
        const claimBitPositions = [0];

        const domain = {
          name: 'PointsBitmapClaim',
          version: '1.0',
          chainId: await getChainId(),
          verifyingContract: this.claimContractAddress,
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

        await this.contract.connect(other).claim(recipient, claimBitPositions, validationData);

        expect(await this.points.balances(recipient)).to.equal(100);
      });

      it('should not revert if the value claimed is equal to zero', async function () {
        const recipient = recipient1.address;
        const claimBitPositions = [1];

        const domain = {
          name: 'PointsBitmapClaim',
          version: '1.0',
          chainId: await getChainId(),
          verifyingContract: this.claimContractAddress,
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

        await this.contract.connect(other).claim(recipient, claimBitPositions, validationData);
        expect(await this.points.balances(recipient)).to.equal(0);
      });
    });
  });

  describe('meta-transactions', function () {
    it('mock: _msgData()', async function () {
      expect(await this.mockContract.__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      expect(await this.mockContract.__msgSender()).to.be.exist;
    });
  });
});
