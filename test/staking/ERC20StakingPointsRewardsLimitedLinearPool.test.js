const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20StakingPointsRewardsLimitedLinearPool', function () {
  let deployer, rewarder, alice;

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
      'ERC20StakingPointsRewardsLimitedLinearPool',
      alice.getAddress(),
      await this.stakingToken.getAddress(),
      await this.rewardToken.getAddress(),
      this.depositReasonCode,
      await getForwarderRegistryAddress(),
    );
    this.rewarderRole = await this.contract.REWARDER_ROLE();
    await this.contract.connect(deployer).grantRole(this.rewarderRole, rewarder.address);
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

  describe('stake(bytes)', function () {
    it('reverts if called', async function () {
      await expect(this.contract.stake('0x')).to.be.revertedWithCustomError(this.contract, 'OnlyReceiverInterface');
    });
  });

  describe('onERC20Received(address,address,uint256,bytes)', function () {
    it('reverts if called by another address than the staking token contract', async function () {
      await expect(this.contract.onERC20Received(alice.address, alice.address, 1n, '0x')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidToken',
      );
    });

    it('reverts if the operator is not the claim contract', async function () {
      const amount = 100n;
      const stakerData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [bob.address]);
      await expect(this.stakingToken.connect(bob).safeTransfer(await this.contract.getAddress(), amount, stakerData))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTransferOperator')
        .withArgs(bob.address);
    });

    context('when successful', function () {
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
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        await expect(this.receipt).to.emit(this.contract, 'Staked').withArgs(alice.address, data, amount);
      });
    });
  });
});
