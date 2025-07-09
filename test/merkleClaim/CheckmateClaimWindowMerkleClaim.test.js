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
    [
      deployer,
      payoutWallet,
      newPayoutWallet,
      claimer1,
      claimer2,
      claimerWithEthernals1,
      claimerWithEthernals2,
      claimerWithEthernals3,
      claimerWithEthernals4,
      claimerWithEthernals5,
      claimerWithEthernals6,
      claimerWithEthernals7,
      other,
    ] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.ethernalsContract = await deployContract('ERC721Mock');
    this.ethernalsMetadataSetterContract = await deployContract('EthernalsMetadataSetterMock');
    this.checkmateTokenContract = await deployContract('ERC20Mock');
    this.stakingPoolContract = await deployContract('ERC20ReceiverMock');

    this.contract = await deployContract(
      'CheckmateClaimWindowMerkleClaimMock',
      this.checkmateTokenContract,
      this.ethernalsContract,
      this.ethernalsMetadataSetterContract,
      this.stakingPoolContract,
      payoutWallet,
      this.forwarderRegistryAddress,
    );

    this.epochId = ethers.encodeBytes32String('test-epoch-id');
    this.whitelistWithoutEthernals = [
      {
        recipient: claimer1.address,
        amount: 1,
      },
      {
        recipient: claimer2.address,
        amount: 2,
      },
    ];
    this.whitelistWithEthernals = [
      {
        recipient: claimerWithEthernals1.address,
        amount: 1,
        tokenIds: [1],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals2.address,
        amount: 1,
        tokenIds: [2, 3],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            materialElement: 2,
            chessPiece: 2,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals3.address,
        amount: 1,
        tokenIds: [4, 5, 6, 7],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            materialElement: 2,
            chessPiece: 2,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 3,
            expression: 3,
            tattoo: 3,
            outfit: 3,
            material: 3,
            materialElement: 3,
            chessPiece: 3,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 4,
            expression: 4,
            tattoo: 4,
            outfit: 4,
            material: 4,
            materialElement: 4,
            chessPiece: 4,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals4.address,
        amount: 1,
        tokenIds: [8, 9, 10, 11, 12, 13, 14, 15],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            materialElement: 2,
            chessPiece: 2,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 3,
            expression: 3,
            tattoo: 3,
            outfit: 3,
            material: 3,
            materialElement: 3,
            chessPiece: 3,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 4,
            expression: 4,
            tattoo: 4,
            outfit: 4,
            material: 4,
            materialElement: 4,
            chessPiece: 4,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 5,
            expression: 5,
            tattoo: 5,
            outfit: 5,
            material: 5,
            materialElement: 5,
            chessPiece: 5,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 6,
            expression: 6,
            tattoo: 6,
            outfit: 6,
            material: 6,
            materialElement: 6,
            chessPiece: 6,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 7,
            expression: 7,
            tattoo: 7,
            outfit: 7,
            material: 7,
            materialElement: 7,
            chessPiece: 7,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 8,
            expression: 8,
            tattoo: 8,
            outfit: 8,
            material: 8,
            materialElement: 8,
            chessPiece: 8,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals4.address,
        amount: 1,
        tokenIds: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            materialElement: 2,
            chessPiece: 2,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 3,
            expression: 3,
            tattoo: 3,
            outfit: 3,
            material: 3,
            materialElement: 3,
            chessPiece: 3,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 4,
            expression: 4,
            tattoo: 4,
            outfit: 4,
            material: 4,
            materialElement: 4,
            chessPiece: 4,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 5,
            expression: 5,
            tattoo: 5,
            outfit: 5,
            material: 5,
            materialElement: 5,
            chessPiece: 5,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 6,
            expression: 6,
            tattoo: 6,
            outfit: 6,
            material: 6,
            materialElement: 6,
            chessPiece: 6,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 7,
            expression: 7,
            tattoo: 7,
            outfit: 7,
            material: 7,
            materialElement: 7,
            chessPiece: 7,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 8,
            expression: 8,
            tattoo: 8,
            outfit: 8,
            material: 8,
            materialElement: 8,
            chessPiece: 8,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 9,
            expression: 9,
            tattoo: 9,
            outfit: 9,
            material: 9,
            materialElement: 9,
            chessPiece: 9,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 10,
            expression: 10,
            tattoo: 10,
            outfit: 10,
            material: 10,
            materialElement: 10,
            chessPiece: 10,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 11,
            expression: 11,
            tattoo: 11,
            outfit: 11,
            material: 11,
            materialElement: 11,
            chessPiece: 10,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 12,
            expression: 12,
            tattoo: 12,
            outfit: 12,
            material: 12,
            materialElement: 12,
            chessPiece: 12,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 13,
            expression: 13,
            tattoo: 13,
            outfit: 13,
            material: 13,
            materialElement: 13,
            chessPiece: 13,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 14,
            expression: 14,
            tattoo: 14,
            outfit: 14,
            material: 14,
            materialElement: 14,
            chessPiece: 14,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 15,
            expression: 15,
            tattoo: 15,
            outfit: 15,
            material: 15,
            materialElement: 15,
            chessPiece: 15,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 16,
            expression: 16,
            tattoo: 16,
            outfit: 16,
            material: 16,
            materialElement: 16,
            chessPiece: 16,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals6.address,
        amount: 1,
        tokenIds: [30],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 1,
            backgroundElement: 0,
          },
        ],
      },
      {
        recipient: claimerWithEthernals6.address,
        amount: 1,
        tokenIds: [30],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 1,
          },
        ],
      },
      {
        recipient: claimerWithEthernals7.address,
        amount: 1,
        tokenIds: [1, 100],
        metadata: [
          {
            hairStyle: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            materialElement: 1,
            chessPiece: 1,
            background: 0,
            backgroundElement: 0,
          },
          {
            hairStyle: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            materialElement: 2,
            chessPiece: 2,
            background: 0,
            backgroundElement: 0,
          },
        ],
      },
    ];
    this.whitelist = this.whitelistWithoutEthernals.concat(this.whitelistWithEthernals);

    this.leavesWithoutEthernals = this.whitelistWithoutEthernals.map((item) =>
      ethers.solidityPacked(['bytes32', 'address', 'uint256'], [this.epochId, item.recipient, item.amount]),
    );
    this.leavesWithEthernals = this.whitelistWithEthernals.map((item) =>
      ethers.solidityPacked(
        ['bytes32', 'address', 'uint256', 'uint256[]', 'bytes'],
        [
          this.epochId,
          item.recipient,
          item.amount,
          item.tokenIds,
          ethers.AbiCoder.defaultAbiCoder().encode(
            [
              `tuple(
                uint256 hairStyle,
                uint256 expression,
                uint256 tattoo,
                uint256 outfit,
                uint256 material,
                uint256 materialElement,
                uint256 chessPiece,
                uint256 background,
                uint256 backgroundElement
              )[]`,
            ],
            [item.metadata],
          ),
        ],
      ),
    );
    this.leaves = this.leavesWithoutEthernals.concat(this.leavesWithEthernals);

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.whitelist[index].recipient,
      amount: this.whitelist[index].amount,
      tokenIds: this.whitelist[index].tokenIds,
      metadata: this.whitelist[index].metadata,
      epochId: this.epochId,
    }));

    // await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), await this.contract.getAddress());
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
          this.ethernalsContract,
          this.ethernalsMetadataSetterContract,
          this.stakingPoolContract,
          payoutWallet,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidCheckmateToken');
    });

    it('reverts with "InvalidEthernals" if Ethernals is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          this.checkmateTokenContract,
          ethers.ZeroAddress,
          this.ethernalsMetadataSetterContract,
          this.stakingPoolContract,
          payoutWallet,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidEthernals');
    });

    it('reverts with "InvalidEthernalsMetadataSetter" if Ethernals Metadata Setter is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          this.checkmateTokenContract,
          this.ethernalsContract,
          ethers.ZeroAddress,
          this.stakingPoolContract,
          payoutWallet,
          this.forwarderRegistryAddress,
        ),
      ).to.revertedWithCustomError(this.contract, 'InvalidEthernalsMetadataSetter');
    });

    it('reverts with "InvalidStakingPool" if staking pool is zero address', async function () {
      await expect(
        deployContract(
          'CheckmateClaimWindowMerkleClaimMock',
          this.checkmateTokenContract,
          this.ethernalsContract,
          this.ethernalsMetadataSetterContract,
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
          this.ethernalsContract,
          this.ethernalsMetadataSetterContract,
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

      it('sets the ethernals', async function () {
        expect(await this.contract.ETHERNALS()).to.equal(this.ethernalsContract);
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
        .withArgs(epochId, recipient);
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

  // eslint-disable-next-line max-len
  describe('claimAndStakeWithEthernals(bytes32 epochId, address recipient, uint256 amount, uint256[] calldata tokenIds, Metadata[] calldata metadata, bytes32[] calldata claimProof, bytes32[] calldata metadataProof, bool enableSetMetadata)', function () {
    let startTime, endTime, recipient, epochId, tokenIds, metadata, proof, leaf, enableSetMetadata;

    beforeEach(async function () {
      startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
      endTime = startTime + 100n; // unit: seconds
      ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[2]);

      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
      await this.ethernalsContract.setTokenOwner(recipient);
    });

    context('when enableSetMetadata is false', function () {
      beforeEach(async function () {
        enableSetMetadata = false;
      });

      it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
        const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');

        await expect(this.contract.claimAndStakeWithEthernals(invalidEpochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
          .withArgs(invalidEpochId);
      });

      it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
        const currentBlockTimestamp = await helpers.time.latest();

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
          .withArgs(epochId, currentBlockTimestamp + 1);
      });

      it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
        await helpers.time.increase(1000);

        const currentBlockTimestamp = await helpers.time.latest();

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
          .withArgs(epochId, currentBlockTimestamp + 1);
      });

      it('reverts with "InvalidProof" if the proof can not be verified', async function () {
        await helpers.time.increase(110);

        const invalidProof = ['0x1234567890123456789012345678901234567890123456789012345678901234'];

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, invalidProof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'InvalidProof')
          .withArgs(epochId, recipient);
      });

      it('reverts with "TransferFailed" if safeTransferFrom() returns false', async function () {
        await helpers.time.increase(110);
        await this.contract.setPayoutWallet(ethers.ZeroAddress);

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'TransferFailed')
          .withArgs(ethers.ZeroAddress, recipient, amount);
      });

      it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
        await helpers.time.increase(110);

        await this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata);

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
          .withArgs(this.epochId, leaf);
      });

      context('when successful', function () {
        beforeEach(async function () {
          await helpers.time.increase(110);
        });

        it('should update the claimed state', async function () {
          const claimedBefore = await this.contract.claimed(leaf);
          await this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata);
          const claimedAfter = await this.contract.claimed(leaf);

          expect(claimedBefore).to.equal(false);
          expect(claimedAfter).to.equal(true);
        });

        it('should have invoked safeTransferFrom() of checkmate token', async function () {
          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount);
        });

        it('emits a PayoutClaimed event', async function () {
          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.contract, 'PayoutClaimed')
            .withArgs(epochId, recipient, amount);
        });

        it('should claim correct amount of checkmate token (own 1 ethernal)', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[2]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.contract, 'PayoutClaimed')
            .withArgs(epochId, recipient, amount);
        });

        it('should claim correct amount of checkmate token (own 2 ethernals[+100])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[3]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 100);
        });

        it('should claim correct amount of checkmate token (own 4 ethernals[+200])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[4]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 200);
        });

        it('should claim correct amount of checkmate token (own 8 ethernals[+500])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[5]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 500);
        });

        it('should claim correct amount of checkmate token (own 16 ethernals[+1000])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[6]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 1000);
        });

        it('should claim correct amount of checkmate token (own 1 ethernal, background > 0[+1000])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[7]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 1000);
        });

        it('should claim correct amount of checkmate token (own 1 ethernal, backgroundElement > 0[+300])', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[8]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount + 300);
        });

        it('should claim correct amount of checkmate token (own 1 out of 2 ethernals)', async function () {
          ({epochId, recipient, amount, tokenIds, metadata, leaf, proof} = this.merkleClaimDataArr[9]);
          this.ethernalsContract.setTokenOwner(recipient);

          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount);
        });
      });
    });

    context('when enableSetMetadata is true', function () {
      beforeEach(async function () {
        enableSetMetadata = true;
      });

      it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
        const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');

        await expect(this.contract.claimAndStakeWithEthernals(invalidEpochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
          .withArgs(invalidEpochId);
      });

      it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
        const currentBlockTimestamp = await helpers.time.latest();

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
          .withArgs(epochId, currentBlockTimestamp + 1);
      });

      it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
        await helpers.time.increase(1000);

        const currentBlockTimestamp = await helpers.time.latest();

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
          .withArgs(epochId, currentBlockTimestamp + 1);
      });

      it('reverts with "InvalidProof" if the proof can not be verified', async function () {
        await helpers.time.increase(110);

        const invalidProof = ['0x1234567890123456789012345678901234567890123456789012345678901234'];

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, invalidProof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'InvalidProof')
          .withArgs(epochId, recipient);
      });

      it('reverts with "TransferFailed" if safeTransferFrom() returns false', async function () {
        await helpers.time.increase(110);
        await this.contract.setPayoutWallet(ethers.ZeroAddress);

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'TransferFailed')
          .withArgs(ethers.ZeroAddress, recipient, amount);
      });

      it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
        await helpers.time.increase(110);

        await this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata);

        await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
          .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
          .withArgs(this.epochId, leaf);
      });

      context('when successful', function () {
        beforeEach(async function () {
          await helpers.time.increase(110);
        });

        it('should update the claimed state', async function () {
          const claimedBefore = await this.contract.claimed(leaf);
          await this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata);
          const claimedAfter = await this.contract.claimed(leaf);

          expect(claimedBefore).to.equal(false);
          expect(claimedAfter).to.equal(true);
        });

        it('should have invoked safeTransferFrom() of checkmate token', async function () {
          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.checkmateTokenContract, 'TransferMock')
            .withArgs(payoutWallet, this.stakingPoolContract, amount);
        });

        it('emits a PayoutClaimed event', async function () {
          await expect(this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata))
            .to.emit(this.contract, 'PayoutClaimed')
            .withArgs(epochId, recipient, amount);
        });

        it('should have invoked verifyAndSetMetadata() of ethernals metadata setter', async function () {
          await expect(
            this.contract.claimAndStakeWithEthernals(epochId, recipient, amount, tokenIds, metadata, proof, [], enableSetMetadata),
          ).to.emit(this.ethernalsMetadataSetterContract, 'MetadataSet');
        });
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
