const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20ClaimWindowMerkleClaim', function () {
  before(async function () {
    [deployer, tokenHolderWallet, claimer1, claimer2, stakingPool, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.rewardToken = await deployContract('ERC20FixedSupply', '', '', 18, [tokenHolderWallet], [3n], this.forwarderRegistryAddress);

    this.contract = await deployContract(
      'ERC20ClaimWindowMerkleClaimMock',
      this.rewardToken,
      stakingPool,
      tokenHolderWallet,
      this.forwarderRegistryAddress,
    );
    await this.rewardToken.connect(tokenHolderWallet).approve(this.contract, 3n);

    this.epochId = ethers.encodeBytes32String('test-epoch-id');
    this.whitelist = [
      {
        recipient: claimer1.address,
        amount: 1,
      },
      {
        recipient: claimer2.address,
        amount: 2,
      },
    ];

    const leaves = this.whitelist.map((item) =>
      ethers.solidityPacked(['bytes32', 'address', 'uint256'], [this.epochId, item.recipient, item.amount]),
    );
    const merkleTree = new MerkleTree(leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = merkleTree.getHexRoot();
    this.merkleClaimDataArr = leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: merkleTree.getHexProof(keccak256(leaf, index)),
      recipient: this.whitelist[index].recipient,
      amount: this.whitelist[index].amount,
      epochId: this.epochId,
    }));
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with "InvalidRewardToken" if reward token is zero address', async function () {
      await expect(
        deployContract('ERC20ClaimWindowMerkleClaimMock', ethers.ZeroAddress, stakingPool, tokenHolderWallet, this.forwarderRegistryAddress),
      ).to.revertedWithCustomError(this.contract, 'InvalidRewardToken');
    });

    it('reverts with "InvalidStakingPool" if staking pool is zero address', async function () {
      await expect(
        deployContract('ERC20ClaimWindowMerkleClaimMock', this.rewardToken, ethers.ZeroAddress, tokenHolderWallet, this.forwarderRegistryAddress),
      ).to.revertedWithCustomError(this.contract, 'InvalidStakingPool');
    });

    context('when successful', function () {
      it('sets the reward token', async function () {
        expect(await this.contract.REWARD_TOKEN()).to.equal(this.rewardToken);
      });

      it('sets the staking pool', async function () {
        expect(await this.contract.STAKING_POOL()).to.equal(stakingPool);
      });

      it('sets the token holder wallet', async function () {
        expect(await this.contract.tokenHolderWallet()).to.equal(tokenHolderWallet);
      });
    });
  });

  describe('setTokenHolderWallet(address)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setTokenHolderWallet(other.address))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });
    context('when successful', function () {
      beforeEach(async function () {
        this.newTokenHolderWallet = '0x0000000000000000000000000000000000000000';
        this.receipt = await this.contract.setTokenHolderWallet(this.newTokenHolderWallet);
      });
      it('sets the token holder wallet', async function () {
        expect(await this.contract.tokenHolderWallet()).to.equal(this.newTokenHolderWallet);
      });
      it('emits a TokenHolderWalletSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'TokenHolderWalletSet').withArgs(this.newTokenHolderWallet);
      });
    });
  });

  describe('setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime)', function () {
    let startTime, endTime, currentBlockTime;

    beforeEach(async function () {
      currentBlockTime = BigInt(await helpers.time.latest()); // unit: seconds
      startTime = currentBlockTime + 100n; // unit: seconds
      endTime = startTime + 100n; // unit: seconds
    });

    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    it('reverts with "InvalidMerkleRoot" if the merkle root is zero', async function () {
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      await expect(this.contract.setEpochMerkleRoot(this.epochId, ethers.ZeroHash, startTime, endTime)).to.revertedWithCustomError(
        this.contract,
        'InvalidMerkleRoot',
      );
    });

    it('reverts with "EpochIdAlreadyExists" if the epoch already exists', async function () {
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
        .withArgs(this.epochId);
    });

    it('reverts with "InvalidClaimWindow" if the start time is equals to the end time', async function () {
      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, startTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, startTime, currentBlockTime + 1n);
    });

    it('reverts with "InvalidClaimWindow" if the start time is greater than the end time', async function () {
      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, endTime, startTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(endTime, startTime, currentBlockTime + 1n);
    });

    it(`reverts with "InvalidClaimWindow" if the end time is equals to the current time`, async function () {
      endTime = await helpers.time.latest(); // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
    });

    it('reverts with "InvalidClaimWindow" if the end time is less than the current time', async function () {
      startTime = currentBlockTime - 2n; // unit: seconds
      endTime = currentBlockTime - 1n; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
      });
      it('sets the epoch merkle root', async function () {
        const claimWindowAfter = await this.contract.claimWindows(this.epochId);
        expect(claimWindowAfter.merkleRoot).to.equal(this.root);
        expect(claimWindowAfter.startTime).to.equal(startTime);
        expect(claimWindowAfter.endTime).to.equal(endTime);
      });

      it('emits a EpochMerkleRootSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'EpochMerkleRootSet').withArgs(this.epochId, this.root, startTime, endTime);
      });
    });
  });

  describe('claimAndStake(bytes32 epochId, address recipient, uint256 amount, bytes32[] calldata proof)', function () {
    let startTime, endTime, recipient, epochId, proof, leaf;

    beforeEach(async function () {
      startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
      endTime = startTime + 100n; // unit: seconds
      ({epochId, recipient, amount, leaf, proof} = this.merkleClaimDataArr[0]);

      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
    });

    it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
      const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');

      await expect(this.contract.claimAndStake(invalidEpochId, recipient, amount, proof))
        .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
        .withArgs(invalidEpochId);
    });

    it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
      const currentBlockTimestamp = await helpers.time.latest();

      await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(epochId, currentBlockTimestamp + 1);
    });

    it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
      await helpers.time.increase(1000);

      const currentBlockTimestamp = await helpers.time.latest();

      await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(epochId, currentBlockTimestamp + 1);
    });

    it('reverts with "InvalidProof" if the proof can not be verified', async function () {
      await helpers.time.increase(110);

      const invalidProof = ['0x1234567890123456789012345678901234567890123456789012345678901234'];

      await expect(this.contract.claimAndStake(epochId, recipient, amount, invalidProof))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(epochId, recipient, amount);
    });

    it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
      await helpers.time.increase(110);

      await this.contract.claimAndStake(epochId, recipient, amount, proof);

      await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(this.epochId, leaf);
    });

    context('when successful', function () {
      beforeEach(async function () {
        await helpers.time.increase(110);
        this.claimedBefore = await this.contract.claimed(leaf);
        expect(this.claimedBefore).to.equal(false);

        this.receipt = await this.contract.claimAndStake(epochId, recipient, amount, proof);
      });

      it('should update the claimed state', async function () {
        const claimedAfter = await this.contract.claimed(leaf);
        expect(claimedAfter).to.equal(true);
      });

      it('emits a PayoutClaimed event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'PayoutClaimed').withArgs(epochId, this.root, recipient, amount);
      });
    });
  });

  describe('canClaim(bytes32 epochId, address recipient, uint256 amount)', function () {
    let startTime, endTime, recipient, epochId, proof;

    beforeEach(async function () {
      startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
      endTime = startTime + 100n; // unit: seconds
      ({epochId, recipient, amount, proof} = this.merkleClaimDataArr[0]);

      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
    });

    it('returns ClaimError.EpochIdNotExists(1) if merkle root of the claim window has not been set', async function () {
      const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');
      const canClaim = await this.contract.canClaim(invalidEpochId, recipient, amount);
      expect(canClaim).to.equal(1);
    });

    it('returns ClaimError.OutOfClaimWindow(2) if block time is earlier than start time of claim window', async function () {
      const canClaim = await this.contract.canClaim(epochId, recipient, amount);
      expect(canClaim).to.equal(2);
    });

    it('returns ClaimError.OutOfClaimWindow(2) if block time is after end time of claim window', async function () {
      await helpers.time.increase(1000);

      const canClaim = await this.contract.canClaim(epochId, recipient, amount);
      expect(canClaim).to.equal(2);
    });

    it('returns ClaimError.AlreadyClaimed(3) if already claimed', async function () {
      await helpers.time.increase(110);

      await this.contract.claimAndStake(epochId, recipient, amount, proof);

      const canClaim = await this.contract.canClaim(epochId, recipient, amount);
      expect(canClaim).to.equal(3);
    });

    it(`returns ClaimError.NoError(0)
          if not yet claimed,
          and merkle root of the claim window has been set,
          and block time is within claim window`, async function () {
      await helpers.time.increase(110);

      const canClaim = await this.contract.canClaim(epochId, recipient, amount);
      expect(canClaim).to.equal(0);
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      expect(await this.contract.__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      expect(await this.contract.__msgSender()).to.be.exist;
    });
  });
});
