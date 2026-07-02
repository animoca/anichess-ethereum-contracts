const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('ERC20StakingPointsRewardsLimitedLinearPool', function () {
  let deployer, rewarder, alice, bob, fakeClaimContract;

  before(async function () {
    [deployer, rewarder, alice, bob, fakeClaimContract] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.stakingToken = await deployContract(
      'ERC20FixedSupply',
      '',
      '',
      18,
      [alice.address, bob.address, fakeClaimContract.address],
      [1000n, 1000n, 1000n],
      this.forwarderRegistryAddress,
    );
    this.rewardToken = await deployContract('PointsV2', this.forwarderRegistryAddress);

    this.depositReasonCode = ethers.encodeBytes32String('DEPOSIT');
    this.contract = await deployContract(
      'ERC20StakingPointsRewardsLimitedLinearPool',
      fakeClaimContract.getAddress(),
      await this.stakingToken.getAddress(),
      await this.rewardToken.getAddress(),
      this.depositReasonCode,
      this.forwarderRegistryAddress,
    );
    this.rewarderRole = await this.contract.REWARDER_ROLE();
    await this.contract.connect(deployer).grantRole(this.rewarderRole, rewarder.address);
    await this.rewardToken.grantRole(await this.rewardToken.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with a zero address Points contract', async function () {
      await expect(
        deployContract(
          'ERC20StakingPointsRewardsLinearPool',
          fakeClaimContract.getAddress(),
          await this.stakingToken.getAddress(),
          ethers.ZeroAddress,
          this.depositReasonCode,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidPointsContract');
    });
  });

  describe('stake(bytes)', function () {
    it('reverts if the merkle root is not set', async function () {
      const amount = 100n;
      const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
      const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
      const proof = tree.getHexProof(rawLeaf, 0);
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
      const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
      await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
      await expect(this.contract.connect(alice).stake(stakeData)).to.be.revertedWithCustomError(this.contract, 'MerkleRootNotSet');
    });

    it('reverts if the merkle proof is invalid', async function () {
      const amount = 100n;
      const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
      const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
      const root = tree.getHexRoot();
      await this.contract.setMerkleRoot(root);
      const proof = [];
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount + 1n]);
      const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
      await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
      await expect(this.contract.connect(alice).stake(stakeData))
        .to.be.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(alice.address, amount + 1n);
    });

    it('reverts if the leaf has already been claimed', async function () {
      const amount = 100n;
      const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
      const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
      const root = tree.getHexRoot();
      await this.contract.setMerkleRoot(root);
      const proof = tree.getHexProof(rawLeaf, 0);
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
      const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
      await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
      await this.contract.connect(alice).stake(stakeData);
      await expect(this.contract.connect(alice).stake(stakeData))
        .to.be.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(alice.address);
    });

    context('when successful', function () {
      const amount = 100n;

      beforeEach(async function () {
        const amount = 100n;
        const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
        const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
        const root = tree.getHexRoot();
        await this.contract.setMerkleRoot(root);
        const proof = tree.getHexProof(rawLeaf, 0);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
        await this.stakingToken.connect(alice).approve(await this.contract.getAddress(), ethers.MaxUint256);
        this.receipt = await this.contract.connect(alice).stake(stakeData);
      });

      it('transfers the stake amount to the pool', async function () {
        await expect(this.receipt)
          .to.emit(this.stakingToken, 'Transfer')
          .withArgs(alice.address, await this.contract.getAddress(), amount);
      });

      it('emits a Staked event', async function () {
        const requiresTransfer = true;
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const modifiedStakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bool', 'bytes'], [requiresTransfer, stakeData]);
        await expect(this.receipt).to.emit(this.contract, 'Staked').withArgs(alice.address, modifiedStakeData, amount);
      });

      it('sets the staker as having claimed the leaf', async function () {
        expect(await this.contract.claimed(alice.address)).to.be.true;
      });
    });
  });

  describe('onERC20Received(address,address,uint256,bytes)', function () {
    it('reverts if called by another address than the staking token contract', async function () {
      await expect(this.contract.onERC20Received(alice.address, alice.address, 1n, '0x')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidToken',
      );
    });

    context('called by the claim contract', function () {
      context('when successful', function () {
        const amount = 100n;

        beforeEach(async function () {
          const stakerData = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [alice.address]);
          this.receipt = await this.stakingToken.connect(fakeClaimContract).safeTransfer(await this.contract.getAddress(), amount, stakerData);
        });

        it('transfers the stake amount to the pool', async function () {
          await expect(this.receipt)
            .to.emit(this.stakingToken, 'Transfer')
            .withArgs(fakeClaimContract.address, await this.contract.getAddress(), amount);
        });

        it('emits a Staked event', async function () {
          const requiresTransfer = false;
          const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
          const modifiedStakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bool', 'bytes'], [requiresTransfer, stakeData]);
          await expect(this.receipt).to.emit(this.contract, 'Staked').withArgs(alice.address, modifiedStakeData, amount);
        });
      });
    });

    context('called by a whitelisted staker', function () {
      it('reverts if the merkle root is not set', async function () {
        const amount = 100n;
        const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
        const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
        const proof = tree.getHexProof(rawLeaf, 0);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
        await expect(
          this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount, stakeData),
        ).to.be.revertedWithCustomError(this.contract, 'MerkleRootNotSet');
      });

      it('reverts if the merkle proof is invalid', async function () {
        const amount = 100n;
        const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
        const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
        const root = tree.getHexRoot();
        await this.contract.setMerkleRoot(root);
        const proof = [];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
        await expect(this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount + 1n, stakeData))
          .to.be.revertedWithCustomError(this.contract, 'InvalidProof')
          .withArgs(alice.address, amount + 1n);
      });

      it('reverts if the leaf has already been claimed', async function () {
        const amount = 100n;
        const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
        const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
        const root = tree.getHexRoot();
        await this.contract.setMerkleRoot(root);
        const proof = tree.getHexProof(rawLeaf, 0);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
        const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
        await this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount, stakeData);
        await expect(this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount, stakeData))
          .to.be.revertedWithCustomError(this.contract, 'AlreadyClaimed')
          .withArgs(alice.address);
      });

      context('when successful', function () {
        const amount = 100n;

        beforeEach(async function () {
          const amount = 100n;
          const rawLeaf = ethers.solidityPacked(['address', 'uint256'], [alice.address, amount]);
          const tree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
          const root = tree.getHexRoot();
          await this.contract.setMerkleRoot(root);
          const proof = tree.getHexProof(rawLeaf, 0);
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amount]);
          const stakeData = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'bytes'], [proof, data]);
          this.receipt = await this.stakingToken.connect(alice).safeTransfer(await this.contract.getAddress(), amount, stakeData);
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

        it('sets the staker as having claimed the leaf', async function () {
          expect(await this.contract.claimed(alice.address)).to.be.true;
        });
      });
    });
  });

  describe('setMerkleRoot(bytes32)', function () {
    it('reverts if the caller is not the contract owner', async function () {
      await expect(this.contract.connect(alice).setMerkleRoot(ethers.ZeroHash)).to.be.revertedWithCustomError(this.contract, 'NotContractOwner');
    });

    it('reverts if the merkle root has already been set', async function () {
      await this.contract.setMerkleRoot(ethers.keccak256(ethers.toUtf8Bytes('test')));
      await expect(this.contract.setMerkleRoot(ethers.keccak256(ethers.toUtf8Bytes('test2')))).to.be.revertedWithCustomError(
        this.contract,
        'MerkleRootAlreadySet',
      );
    });

    it('reverts if the new merkle root is zero', async function () {
      await expect(this.contract.setMerkleRoot(ethers.ZeroHash)).to.be.revertedWithCustomError(this.contract, 'InvalidMerkleRoot');
    });

    context('when successful', function () {
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes('test'));

      beforeEach(async function () {
        this.receipt = await this.contract.setMerkleRoot(newRoot);
      });

      it('sets the new merkle root', async function () {
        expect(await this.contract.root()).to.equal(newRoot);
      });

      it('emits a MerkleRootSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'MerkleRootSet').withArgs(newRoot);
      });
    });
  });
});
