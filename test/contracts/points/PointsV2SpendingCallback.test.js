const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('PointsV2SpendingCallback', function () {
  let deployer, other;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('PointsV2SpendingCallbackMock', deployer.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('sets the POINTS variable', async function () {
      expect(await this.contract.POINTS()).to.equal(deployer.address);
    });
  });

  describe('onPointsSpent(address,uint256,bytes)', function () {
    const spendAmount = 123n;
    const spendData = '0x1234';

    it('reverts if not called by the POINTS contract', async function () {
      await expect(this.contract.connect(other).onPointsSpent(other.address, spendAmount, spendData))
        .to.be.revertedWithCustomError(this.contract, 'IncorrectCallbackCaller')
        .withArgs(other.address);
    });
  });
});
