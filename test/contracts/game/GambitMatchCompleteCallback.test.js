const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('GambitMatchCompleteCallback', function () {
  let deployer, other;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('GambitMatchCompleteCallbackMock', deployer.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('sets the GAMBIT variable', async function () {
      expect(await this.contract.GAMBIT()).to.equal(deployer.address);
    });
  });

  describe('onMatchCompleted(uint256,address,address,uint256,uint256)', function () {
    beforeEach(async function () {
      this.receipt = this.contract.connect(deployer).onMatchCompleted(1n, deployer.address, other.address, 100n, 10n);
    });

    it('reverts if not called by the GAMBIT contract', async function () {
      await expect(this.contract.connect(other).onMatchCompleted(1n, deployer.address, other.address, 100n, 10n))
        .to.be.revertedWithCustomError(this.contract, 'IncorrectCallbackCaller')
        .withArgs(other.address);
    });
  });
});
