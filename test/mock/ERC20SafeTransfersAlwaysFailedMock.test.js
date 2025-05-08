const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('CheckmateMerkleClaim', function () {
  before(async function () {
    [deployer, payoutWallet, newPayoutWallet, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('ERC20SafeTransfersAlwaysFailedMock');
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('safeTransfer(address, uint256, bytes calldata)', function () {
    it('should return false', async function () {
      expect(await this.contract.safeTransfer(ethers.ZeroAddress, 0, ethers.ZeroHash)).to.eq(false);
    });
  });

  describe('safeTransferFrom(address, address, uint256, bytes calldata)', function () {
    it('should return false', async function () {
      expect(await this.contract.safeTransferFrom(ethers.ZeroAddress, ethers.ZeroAddress, 0, ethers.ZeroHash)).to.eq(false);
    });
  });
});
