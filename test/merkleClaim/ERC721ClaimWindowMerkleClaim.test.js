const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getOperatorFilterRegistryAddress, getTokenMetadataResolverWithBaseURIAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC721ClaimWindowMerkleClaim', function () {
  before(async function () {
    [deployer, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    const metadataResolverAddress = await getTokenMetadataResolverWithBaseURIAddress();
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();
    const forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.rewardContract = await deployContract(
      'ERC721Full',
      'Anichess Profile Pic',
      'PFP',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      forwarderRegistryAddress,
    );
    const rewardsContractAddress = await this.rewardContract.getAddress();

    this.tokenId = 1;
    this.mintSupply = 3;

    this.contract = await deployContract('ERC721ClaimWindowMerkleClaimMock', this.mintSupply, rewardsContractAddress, forwarderRegistryAddress);

    this.epochId = ethers.encodeBytes32String('test-epoch-id');
    this.whitelist = [claimer1.address, claimer2.address, claimer3.address, claimer4.address];

    this.leaves = this.whitelist.map((walletAddress) => ethers.solidityPacked(['bytes32', 'address'], [this.epochId, walletAddress]));
    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.whitelist[index],
      epochId: this.epochId,
    }));

    await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('set the mint supply', async function () {
      expect(await this.contract.MINT_SUPPLY()).to.equal(this.mintSupply);
    });

    it('sets the rewards contract', async function () {
      expect(await this.contract.REWARD_CONTRACT()).to.equal(await this.rewardContract.getAddress());
    });
  });

  describe('setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setEpochMerkleRoot(this.epochId, this.root, 0, 0))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    it('reverts with "EpochIdAlreadyExists" if the epoch has already started', async function () {
      const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
      const endTime = startTime + 100; // unit: seconds

      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
        .withArgs(this.epochId);
    });

    it('reverts with "InvalidClaimWindow" if the start time is equals to the end time', async function () {
      const currentBlockTime = await helpers.time.latest();
      const startTime = currentBlockTime; // unit: seconds
      const endTime = startTime; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1);
    });

    it('reverts with "InvalidClaimWindow" if the start time is greater than the end time', async function () {
      const currentBlockTime = await helpers.time.latest();
      const startTime = currentBlockTime + 100; // unit: seconds
      const endTime = currentBlockTime; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1);
    });

    it(`reverts with "InvalidClaimWindow" if the end time is equals to the current time`, async function () {
      const currentBlockTime = await helpers.time.latest();
      const startTime = currentBlockTime - 1; // unit: seconds
      const endTime = currentBlockTime; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1);
    });

    it('reverts with "InvalidClaimWindow" if the end time is less than the current time', async function () {
      const currentBlockTime = await helpers.time.latest();
      const startTime = currentBlockTime - 2; // unit: seconds
      const endTime = currentBlockTime - 1; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1);
    });

    context('when successful', function () {
      const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
      const endTime = startTime + 100; // unit: seconds

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

  describe('claim(bytes32 epochId, bytes32[] calldata proof, address recipient)', function () {
    it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
      const merkleClaimData = this.merkleClaimDataArr[0];
      const {proof, recipient, epochId} = merkleClaimData;

      await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
        .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
        .withArgs(this.epochId);
    });

    it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
      const startTime = (await helpers.time.latest()) + 100; // unit: seconds
      const endTime = startTime + 1; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const merkleClaimData = this.merkleClaimDataArr[0];
      const {proof, recipient, epochId} = merkleClaimData;
      const latestBlockTimestamp = await helpers.time.latest();

      await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(epochId, latestBlockTimestamp + 1);
    });

    it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
      const startTime = (await helpers.time.latest()) - 100; // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const merkleClaimData = this.merkleClaimDataArr[0];
      const {proof, recipient, epochId} = merkleClaimData;
      await helpers.time.increase(1000);
      const latestBlockTimestamp = await helpers.time.latest();

      await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(epochId, latestBlockTimestamp + 1);
    });

    it('reverts with "InvalidProof" if the proof can not be verified', async function () {
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const merkleClaimData = this.merkleClaimDataArr[0];
      const {recipient, epochId} = merkleClaimData;
      const invalidProof = this.merkleClaimDataArr[1].proof;

      await expect(this.contract.connect(claimer1).claim(epochId, invalidProof, recipient))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(epochId, recipient);
    });

    it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const merkleClaimData = this.merkleClaimDataArr[0];
      const {recipient, epochId, proof} = merkleClaimData;
      await this.contract.connect(claimer1).claim(epochId, proof, recipient);

      await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(this.epochId, recipient);
    });

    it('reverts with "ExceededMintSupply" if the mint supply has been exceeded', async function () {
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      await this.contract
        .connect(claimer1)
        .claim(this.merkleClaimDataArr[0].epochId, this.merkleClaimDataArr[0].proof, this.merkleClaimDataArr[0].recipient);

      await this.contract
        .connect(claimer1)
        .claim(this.merkleClaimDataArr[1].epochId, this.merkleClaimDataArr[1].proof, this.merkleClaimDataArr[1].recipient);

      await this.contract
        .connect(claimer1)
        .claim(this.merkleClaimDataArr[2].epochId, this.merkleClaimDataArr[2].proof, this.merkleClaimDataArr[2].recipient);

      await expect(
        this.contract
          .connect(claimer1)
          .claim(this.merkleClaimDataArr[3].epochId, this.merkleClaimDataArr[3].proof, this.merkleClaimDataArr[3].recipient),
      ).to.revertedWithCustomError(this.contract, 'ExceededMintSupply');
    });
    context('when successful', function () {
      let startTime, endTime, recipient, epochId, proof;

      beforeEach(async function () {
        startTime = BigInt(await helpers.time.latest()); // unit: seconds
        endTime = startTime + 100n; // unit: seconds
        ({recipient, epochId, proof} = this.merkleClaimDataArr[0]);

        await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
      });

      it('should update the noOfTokensClaimed', async function () {
        const noOfTokensClaimedBefore = await this.contract.noOfTokensClaimed();
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const noOfTokensClaimedAfter = await this.contract.noOfTokensClaimed();

        expect(noOfTokensClaimedBefore).to.equal(0);
        expect(noOfTokensClaimedAfter).to.equal(1);
      });

      it('should update the claimStatus', async function () {
        const claimStatusBefore = await this.contract.claimed(recipient);
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const claimStatusAfter = await this.contract.claimed(recipient);

        expect(claimStatusBefore).to.equal(false);
        expect(claimStatusAfter).to.equal(true);
      });

      it('should update the recipient balance', async function () {
        const balanceBefore = await this.rewardContract.balanceOf(recipient);
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const balanceAfter = await this.rewardContract.balanceOf(recipient);

        expect(balanceBefore).to.equal(0);
        expect(balanceAfter).to.equal(1);
      });

      it('should update the owner of token', async function () {
        await expect(this.rewardContract.ownerOf(this.tokenId))
          .revertedWithCustomError(this.rewardContract, 'ERC721NonExistingToken')
          .withArgs(this.tokenId);

        await this.contract.connect(claimer1).claim(epochId, proof, recipient);

        const ownerAfter = await this.rewardContract.ownerOf(this.tokenId);
        expect(ownerAfter).to.equal(recipient);
      });

      it('emits a RewardClaimed event', async function () {
        await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
          .to.emit(this.contract, 'RewardClaimed')
          .withArgs(this.epochId, recipient, this.tokenId);
      });
    });
  });

  describe('canClaim(bytes32 epochId, address recipient)', function () {
    describe('without setting merkle root', function () {
      it('returns ClaimError.EpochIdNotExists(1) if merkle root of the claim window has not been set', async function () {
        const canClaim = await this.contract.canClaim(this.epochId, claimer1);
        expect(canClaim).to.equal(1);
      });
    });

    describe('with setting merkle root', function () {
      let startTime, endTime;

      beforeEach(async function () {
        startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
        endTime = startTime + 100n; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
      });

      it('returns ClaimError.OutOfClaimWindow(2) if block time is earlier than start time of claim window', async function () {
        const {epochId} = this.merkleClaimDataArr[0];

        const canClaim = await this.contract.canClaim(epochId, claimer1);
        expect(canClaim).to.equal(2);
      });

      it('returns ClaimError.OutOfClaimWindow(2) if block time is after end time of claim window', async function () {
        await helpers.time.increase(1000);

        const {epochId} = this.merkleClaimDataArr[0];
        const canClaim = await this.contract.canClaim(epochId, claimer1);
        expect(canClaim).to.equal(2);
      });

      it('returns ClaimError.AlreadyClaimed(3) if already claimed', async function () {
        await helpers.time.increase(110);

        const {recipient, epochId, proof} = this.merkleClaimDataArr[0];
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);

        const canClaim = await this.contract.canClaim(epochId, claimer1);
        expect(canClaim).to.equal(3);
      });

      it('returns ClaimError.ExceededMintSupply(4) if number of claimed tokens is equal to total supply', async function () {
        await helpers.time.increase(110);

        let recipient, epochId, proof;
        ({recipient, epochId, proof} = this.merkleClaimDataArr[0]);
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);

        ({recipient, epochId, proof} = this.merkleClaimDataArr[1]);
        await this.contract.connect(claimer2).claim(epochId, proof, recipient);

        ({recipient, epochId, proof} = this.merkleClaimDataArr[2]);
        await this.contract.connect(claimer3).claim(epochId, proof, recipient);

        const canClaim = await this.contract.canClaim(epochId, claimer4);
        expect(canClaim).to.equal(4);
      });

      it(`returns ClaimError.NoError(0)
          if not yet claimed,
          and number of claimed tokens is less than total supply, 
          and merkle root of the claim window has been set, 
          and block time is within claim window`, async function () {
        await helpers.time.increase(110);

        const {epochId} = this.merkleClaimDataArr[0];
        const canClaim = await this.contract.canClaim(epochId, claimer1);
        expect(canClaim).to.equal(0);
      });
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
