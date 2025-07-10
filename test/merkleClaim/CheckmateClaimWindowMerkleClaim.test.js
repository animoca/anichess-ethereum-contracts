const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('CheckmateClaimWindowMerkleClaim', function () {
  before(async function () {
    [deployer, payoutWallet, newPayoutWallet, claimer1, claimer2, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.checkmateTokenContract = await deployContract('ERC20Mock');
    this.stakingPoolContract = await deployContract('ERC20ReceiverMock');

    this.contract = await deployContract(
      'CheckmateClaimWindowMerkleClaimMock',
      this.checkmateTokenContract,
      this.stakingPoolContract,
      payoutWallet,
      this.forwarderRegistryAddress,
    );

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

    this.leaves = this.whitelist.map((item) => ethers.solidityPacked(['bytes32', 'address', 'uint256'], [this.epochId, item.recipient, item.amount]));

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.whitelist[index].recipient,
      amount: this.whitelist[index].amount,
      epochId: this.epochId,
    }));
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with "InvalidCheckmateToken" if checkmate token is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          ethers.ZeroAddress,
          this.stakingPoolContract,
          payoutWallet,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidCheckmateToken');
    });

    it('reverts with "InvalidStakingPool" if staking pool is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          this.checkmateTokenContract,
          ethers.ZeroAddress,
          payoutWallet,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidStakingPool');
    });

    it('reverts with "InvalidPayoutWallet" if payout wallet is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          this.checkmateTokenContract,
          this.stakingPoolContract,
          ethers.ZeroAddress,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidPayoutWallet');
    });

    context('when successful', function () {
      it('sets the checkmate token', async function () {
        expect(await this.contract.CHECKMATE_TOKEN()).to.equal(this.checkmateTokenContract);
      });

      it('sets the staking pool', async function () {
        expect(await this.contract.STAKING_POOL()).to.equal(this.stakingPoolContract);
      });

      it('sets the payout wallet', async function () {
        expect(await this.contract.payoutWallet()).to.equal(payoutWallet);
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

    it('reverts with "EpochIdAlreadyExists" if the epoch has already started', async function () {
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
        .withArgs(this.epochId);
    });

    it('reverts with "InvalidClaimWindow" if the start time is equals to the end time', async function () {
      endTime = startTime; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
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
      it('sets the epoch merkle root', async function () {
        const claimWindowBefore = await this.contract.claimWindows(this.epochId);
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
        const claimWindowAfter = await this.contract.claimWindows(this.epochId);

        expect(claimWindowBefore.merkleRoot).to.equal(ethers.ZeroHash);
        expect(claimWindowAfter.merkleRoot).to.equal(this.root);
        expect(claimWindowBefore.startTime).to.equal(0);
        expect(claimWindowAfter.startTime).to.equal(startTime);
        expect(claimWindowBefore.endTime).to.equal(0);
        expect(claimWindowAfter.endTime).to.equal(endTime);
      });

      it('emits a EpochMerkleRootSet event', async function () {
        await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
          .to.emit(this.contract, 'EpochMerkleRootSet')
          .withArgs(this.epochId, this.root, startTime, endTime);
      });
    });
  });

  describe('setPayoutWallet(address newPayoutWallet)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setPayoutWallet(other))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      it('sets the payout wallet', async function () {
        await this.contract.setPayoutWallet(newPayoutWallet);
        const payoutWallet = await this.contract.payoutWallet();

        expect(payoutWallet).to.equal(newPayoutWallet);
      });

      it('emits a PayoutWalletSet event', async function () {
        await expect(this.contract.setPayoutWallet(newPayoutWallet)).to.emit(this.contract, 'PayoutWalletSet').withArgs(newPayoutWallet);
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

    it('reverts with "TransferFailed" if safeTransferFrom() returns false', async function () {
      await helpers.time.increase(110);
      await this.contract.setPayoutWallet(ethers.ZeroAddress);

      await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
        .to.revertedWithCustomError(this.contract, 'TransferFailed')
        .withArgs(ethers.ZeroAddress, recipient, amount);
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
      });

      it('should update the claimed state', async function () {
        const claimedBefore = await this.contract.claimed(leaf);
        await this.contract.claimAndStake(epochId, recipient, amount, proof);
        const claimedAfter = await this.contract.claimed(leaf);

        expect(claimedBefore).to.equal(false);
        expect(claimedAfter).to.equal(true);
      });

      it('should have invoked safeTransferFrom() of checkmate token', async function () {
        await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
          .to.emit(this.checkmateTokenContract, 'TransferMock')
          .withArgs(payoutWallet, this.stakingPoolContract, amount);
      });

      it('should have invoked onERC20Received() of staking pool', async function () {
        await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
          .to.emit(this.stakingPoolContract, 'ERC20ReceivedMock')
          // .withArgs(this.checkmateTokenContract, payoutWallet, amount, new ethers.utils.AbiCoder().encode(['address'], [recipient]));
          .withArgs(this.checkmateTokenContract, payoutWallet, amount, ethers.AbiCoder.defaultAbiCoder().encode(['address'], [recipient]));
        // AbiCoder.defaultAbiCoder()
      });

      it('emits a PayoutClaimed event', async function () {
        await expect(this.contract.claimAndStake(epochId, recipient, amount, proof))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(epochId, recipient, amount);
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
