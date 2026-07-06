const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('ERC20ToPoints', function () {
  let deployer, other;

  const TOKEN_TO_POINTS_RATE = 200n;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.token = await deployContract('ERC20FixedSupply', '', '', 18, [deployer.address], [ethers.MaxUint256], this.forwarderRegistryAddress);
    this.points = await deployContract('PointsV2', this.forwarderRegistryAddress);
    this.contract = await deployContract(
      'ERC20ToPointsMock',
      await this.token.getAddress(),
      await this.points.getAddress(),
      TOKEN_TO_POINTS_RATE,
      'CheckToPoints deposit',
      other.address,
      this.forwarderRegistryAddress,
    );
    await this.token.approve(await this.contract.getAddress(), ethers.MaxUint256);
    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor(address,address,address)', function () {
    it('sets the TOKEN token address', async function () {
      expect(await this.contract.TOKEN()).to.equal(await this.token.getAddress());
    });

    it('sets the PointsV2 address', async function () {
      expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
    });

    it('sets the payout address', async function () {
      expect(await this.contract.payoutWallet()).to.equal(other.address);
    });
  });

  describe('exchange(uint256)', function () {
    it('reverts if pointsAmount is zero', async function () {
      await expect(this.contract.exchange(0)).to.be.revertedWithCustomError(this.contract, 'InvalidPointsAmount');
    });

    context('when successful', function () {
      const pointsAmount = 10n;
      const tokenAmount = ethers.parseUnits(pointsAmount.toString(), 18) / TOKEN_TO_POINTS_RATE;

      beforeEach(async function () {
        this.receipt = await this.contract.exchange(pointsAmount);
      });

      it('transfers the TOKEN token from the caller', async function () {
        await expect(this.receipt).to.emit(this.token, 'Transfer').withArgs(deployer.address, other.address, tokenAmount);
      });
      it('deposits points to the caller', async function () {
        await expect(this.receipt)
          .to.emit(this.points, 'Deposited')
          .withArgs(await this.contract.getAddress(), await this.contract.DEPOSIT_REASON(), deployer.address, pointsAmount);
      });
      it('emits an Exchanged event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Exchanged').withArgs(deployer.address, tokenAmount, pointsAmount);
      });
    });
  });

  describe('__msgData()', function () {
    it('returns the msg.data', async function () {
      await this.contract.__msgData();
    });
  });
});
