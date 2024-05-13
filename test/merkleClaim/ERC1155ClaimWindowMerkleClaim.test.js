const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {
  getOperatorFilterRegistryAddress,
  getForwarderRegistryAddress,
  getTokenMetadataResolverWithBaseURIAddress,
} = require('@animoca/ethereum-contracts/test/helpers/registries');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

describe('ERC1155ClaimWindowMerkleClaim', function () {
  before(async function () {
    [deployer, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    const metadataResolverAddress = await getTokenMetadataResolverWithBaseURIAddress();
    const forwarderRegistryAddress = await getForwarderRegistryAddress();
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    this.rewardContract = await deployContract(
      'ERC1155FullBurn',
      'Anichess The Missing Orbs',
      'ATMO',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      forwarderRegistryAddress
    );
    const rewardsContractAddress = await this.rewardContract.getAddress();

    this.tokenId = 1;
    this.mintSupply = 3;

    this.contract = await deployContract(
      'ERC1155ClaimWindowMerkleClaim',
      this.tokenId,
      this.mintSupply,
      rewardsContractAddress,
      forwarderRegistryAddress
    );

    this.epochId = ethers.encodeBytes32String('test-epoch-id');
    this.whitelist = [claimer1.address, claimer2.address, claimer3.address, claimer4.address];

    this.leaves = this.whitelist.map((walletAddress) => ethers.solidityPacked(['bytes32', 'address'], [this.epochId, walletAddress]));
    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
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
    it('sets the token id', async function () {
      expect(await this.contract.TOKEN_ID()).to.equal(this.tokenId);
    });
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
      it('sets the epoch merkle root', async function () {
        const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
        const endTime = startTime + 100; // unit: seconds

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

      it('emits a SetEpochMerkleRoot event', async function () {
        const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
        const endTime = startTime + 100; // unit: seconds

        await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
          .to.emit(this.contract, 'SetEpochMerkleRoot')
          .withArgs(this.epochId, this.root, BigInt(startTime), endTime);
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

      expect(latestBlockTimestamp).to.be.lessThan(startTime);
      expect(latestBlockTimestamp).to.be.lessThan(endTime);
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
      expect(latestBlockTimestamp).to.be.greaterThan(startTime);
      expect(latestBlockTimestamp).to.be.greaterThan(endTime);
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
          .claim(this.merkleClaimDataArr[3].epochId, this.merkleClaimDataArr[3].proof, this.merkleClaimDataArr[3].recipient)
      ).to.revertedWithCustomError(this.contract, 'ExceededMintSupply');
    });
    context('when successful', function () {
      it('should update the noOfTokensClaimed', async function () {
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const merkleClaimData = this.merkleClaimDataArr[0];
        const {recipient, epochId, proof} = merkleClaimData;

        const noOfTokensClaimedBefore = await this.contract.noOfTokensClaimed();
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const noOfTokensClaimedAfter = await this.contract.noOfTokensClaimed();

        expect(noOfTokensClaimedBefore).to.equal(0);
        expect(noOfTokensClaimedAfter).to.equal(1);
      });
      it('should update the claimStatus', async function () {
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const merkleClaimData = this.merkleClaimDataArr[0];
        const {recipient, epochId, proof} = merkleClaimData;

        const leafHash = keccak256(ethers.solidityPacked(['bytes32', 'address'], [epochId, recipient]));
        const claimStatusBefore = await this.contract.claimStatus(leafHash);
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const claimStatusAfter = await this.contract.claimStatus(leafHash);

        expect(claimStatusBefore).to.equal(false);
        expect(claimStatusAfter).to.equal(true);
      });
      it('should update the recipient balance', async function () {
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const merkleClaimData = this.merkleClaimDataArr[0];
        const {recipient, epochId, proof} = merkleClaimData;

        const balanceBefore = await this.rewardContract.balanceOf(recipient, this.tokenId);
        await this.contract.connect(claimer1).claim(epochId, proof, recipient);
        const balanceAfter = await this.rewardContract.balanceOf(recipient, this.tokenId);

        expect(balanceBefore).to.equal(0);
        expect(balanceAfter).to.equal(1);
      });
      it('emits a PayoutClaimed event', async function () {
        // Arrange
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const merkleClaimData = this.merkleClaimDataArr[0];
        const {recipient, epochId, proof} = merkleClaimData;

        // Act

        // Assert
        await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(this.epochId, recipient, this.tokenId, 1);
      });
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      const forwarderRegistryAddress = await getForwarderRegistryAddress();
      const rewardsContractAddress = await this.contract.getAddress();

      this.contract = await deployContract(
        'ERC1155ClaimWindowMerkleClaimMock',
        this.tokenId,
        this.mintSupply,
        rewardsContractAddress,
        forwarderRegistryAddress
      );
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      const forwarderRegistryAddress = await getForwarderRegistryAddress();
      const rewardsContractAddress = await this.contract.getAddress();

      this.contract = await deployContract(
        'ERC1155ClaimWindowMerkleClaimMock',
        this.tokenId,
        this.mintSupply,
        rewardsContractAddress,
        forwarderRegistryAddress
      );

      // Act

      // Assert
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
