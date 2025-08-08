const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {time} = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20StakingPointsRewardsLinearPool', function () {
  let deployer, rewarder, alice, bob;

  before(async function () {
    [deployer, rewarder, alice, bob] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.stakingToken = await deployContract(
      'ERC20FixedSupply',
      '',
      '',
      18,
      [alice.address, bob.address],
      [1000n, 1000n],
      await getForwarderRegistryAddress(),
    );
    this.rewardToken = await deployContract('PointsMock');

    this.depositReasonCode = ethers.encodeBytes32String('DEPOSIT');
    this.contract = await deployContract(
      'ERC20StakingPointsRewardsLinearPool',
      alice.getAddress(),
      await this.stakingToken.getAddress(),
      await this.rewardToken.getAddress(),
      this.depositReasonCode,
      await getForwarderRegistryAddress(),
    );
    this.rewarderRole = await this.contract.REWARDER_ROLE();
    await this.contract.connect(deployer).grantRole(this.rewarderRole, rewarder.address);
    await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
    await this.stakingToken.connect(bob).approve(await this.contract.getAddress(), ethers.MaxUint256);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with a zero address Points contract', async function () {
      await expect(
        deployContract(
          'ERC20StakingPointsRewardsLinearPool',
          alice.getAddress(),
          await this.stakingToken.getAddress(),
          ethers.ZeroAddress,
          this.depositReasonCode,
          await getForwarderRegistryAddress(),
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidPointsContract');
    });
  });

  describe('onERC20Received(address,address,uint256,bytes)', function () {
    it('reverts if called by another address than the staking token contract', async function () {
      await expect(this.contract.onERC20Received(alice.address, alice.address, 1n, '0x')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidToken',
      );
    });

    context('when successful (from Claim Contract)', function () {
      const amount = 100n;

      beforeEach(async function () {
        const stakerData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [alice.address]);
        this.receipt = await this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount, stakerData);
      });

      it('transfers the stake amount to the pool', async function () {
        await expect(this.receipt)
          .to.emit(this.stakingToken, 'Transfer')
          .withArgs(alice.address, await this.contract.getAddress(), amount);
      });

      it('emits a Staked event', async function () {
        const requiresTransfer = false;
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const modifiedStakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bool', 'bytes'], [requiresTransfer, stakeData]);
        await expect(this.receipt).to.emit(this.contract, 'Staked').withArgs(alice.address, modifiedStakeData, amount);
      });
    });

    context('when successful (from others)', function () {
      const amount = 100n;

      beforeEach(async function () {
        const stakerData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [bob.address]);
        this.receipt = await this.stakingToken.connect(bob).safeTransfer(await this.contract.getAddress(), amount, stakerData);
      });

      it('transfers the stake amount to the pool', async function () {
        await expect(this.receipt)
          .to.emit(this.stakingToken, 'Transfer')
          .withArgs(bob.address, await this.contract.getAddress(), amount);
      });

      it('emits a Staked event', async function () {
        const requiresTransfer = false;
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const modifiedStakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bool', 'bytes'], [requiresTransfer, stakeData]);
        await expect(this.receipt).to.emit(this.contract, 'Staked').withArgs(bob.address, modifiedStakeData, amount);
      });
    });
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
