const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {time} = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20StakingPointsRewardsLinearPool', function () {
  let deployer, rewarder, alice;

  before(async function () {
    [deployer, rewarder, alice] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.stakingToken = await deployContract('ERC20FixedSupply', '', '', 18, [alice.address], [1000n], await getForwarderRegistryAddress());
    this.rewardToken = await deployContract('PointsMock');

    this.depositReasonCode = ethers.encodeBytes32String('DEPOSIT');
    this.contract = await deployContract(
      'ERC20StakingPointsRewardsLinearPool',
      await this.stakingToken.getAddress(),
      await this.rewardToken.getAddress(),
      this.depositReasonCode,
      await getForwarderRegistryAddress(),
    );
    this.rewarderRole = await this.contract.REWARDER_ROLE();
    await this.contract.connect(deployer).grantRole(this.rewarderRole, rewarder.address);
    await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('claim()', function () {
    context('when successful', function () {
      const amount = 1n;
      const reward = 100000n;
      const duration = 100n;
      const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
      const claimData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [reward]);

      beforeEach(async function () {
        await this.contract.connect(alice).stake(stakeData);
        await this.contract.connect(rewarder).addReward(reward, duration);
        await time.increase(duration);
        this.receipt = await this.contract.connect(alice).claim();
      });

      it('transfers the reward to the staker', async function () {
        await expect(this.receipt)
          .to.emit(this.rewardToken, 'Deposited')
          .withArgs(this.contract.getAddress(), this.depositReasonCode, alice.address, reward);
      });

      it('emits a Claimed event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Claimed').withArgs(alice.address, claimData, reward);
      });
    });
  });
});
