const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('RNGConsumer', function () {
  let deployer, other;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('RNGConsumerMock', await deployer.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor(address)', function () {
    context('when successful', function () {
      it('sets the RNG Provider', async function () {
        expect(await this.contract.RNG_PROVIDER()).to.equal(deployer.address);
      });
    });
  });

  describe('fulfillRandomness(uint256,uint256[],bytes)', function () {
    it('reverts if not called by the RNG Provider', async function () {
      await expect(this.contract.connect(other).fulfillRandomness(0, []))
        .to.be.revertedWithCustomError(this.contract, 'OnlyRNGProviderCanFulfill')
        .withArgs(other.address);
    });
  });
});
