const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getOperatorFilterRegistryAddress, getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

let tokenMetadataResolverWithBaseURI = undefined;
async function deployTokenMetadataResolverWithBaseURI() {
  if (tokenMetadataResolverWithBaseURI === undefined) {
    tokenMetadataResolverWithBaseURI = await deployContract('TokenMetadataResolverWithBaseURI');
  }
  return tokenMetadataResolverWithBaseURI;
}

async function getTokenMetadataResolverWithBaseURIAddress() {
  return (await deployTokenMetadataResolverWithBaseURI()).address;
}

describe('AnichessERC1155MerkleClaim', function () {
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
    const rewardsContractAddress = this.rewardContract.address;

    // setup merkle data
    this.epochId = ethers.utils.hexZeroPad('0x9a794a09cf7b4fb99e2e3d4aeac42eab', 32);
    this.mintSupply = 5000;
    this.elements = [
      {
        recipient: claimer1.address,
        tokenId: 1,
        amount: 1,
      },
      {
        recipient: claimer2.address,
        tokenId: 2,
        amount: 2,
      },
      {
        recipient: claimer3.address,
        tokenId: 3,
        amount: 3,
      },
      {
        recipient: claimer4.address, // claimer4 will not be able to claim since the mint supply is 5000
        tokenId: 4,
        amount: this.mintSupply + 1,
      },
    ];
    this.leaves = this.elements.map((el) =>
      ethers.utils.solidityPack(['bytes32', 'address', 'uint256', 'uint256'], [this.epochId, el.recipient, el.tokenId, el.amount])
    );

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();

    this.leaves.forEach((leaf, index) => {
      this.elements[index].proof = this.tree.getHexProof(keccak256(leaf));
      this.elements[index].leafHash = keccak256(leaf);
    });
    this.contract = await deployContract('AnichessERC1155MerkleClaim', this.mintSupply, rewardsContractAddress, forwarderRegistryAddress);
    await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), this.contract.address);

    // push one block to make sure the epoch has started
    await helpers.mine(1);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('set the mint supply', async function () {
      // Arrange

      // Act

      // Assert

      expect(await this.contract.MINT_SUPPLY()).to.equal(this.mintSupply);
    });
    it('sets the rewards contract', async function () {
      // Arrange

      // Act

      // Assert
      expect(await this.contract.REWARD_CONTRACT()).to.equal(this.rewardContract.address);
    });
  });

  describe('setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime)', function () {
    it('reverts with "Ownership: not the owner" if the caller is not the owner', async function () {
      // Arrange

      // Act

      // Assert
      await expect(this.contract.connect(other).setEpochMerkleRoot(this.epochId, this.root, 0, 0)).to.revertedWith('Ownership: not the owner');
    });

    it('reverts with "EpochIdAlreadyExists" if the epoch has already started', async function () {
      // Arrange
      const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
      const endTime = startTime + 1; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      // Act

      // Assert
      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
        .withArgs(this.epochId);
    });

    context('when successful', function () {
      it('sets the epoch merkle root', async function () {
        // Arrange
        const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
        const endTime = startTime + 1; // unit: seconds

        // Act
        const claimWindowBefore = await this.contract.claimWindows(this.epochId);
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
        const claimWindowAfter = await this.contract.claimWindows(this.epochId);

        // Assert
        expect(claimWindowBefore.merkleRoot).to.equal(ethers.constants.HashZero);
        expect(claimWindowAfter.merkleRoot).to.equal(this.root);

        expect(claimWindowBefore.startTime).to.equal(0);
        expect(claimWindowAfter.startTime).to.equal(startTime);
        expect(claimWindowBefore.endTime).to.equal(0);
        expect(claimWindowAfter.endTime).to.equal(endTime);
      });

      it('emits a SetEpochMerkleRoot event', async function () {
        // Arrange
        const startTime = Math.floor(new Date().getTime() / 1000); // unit: seconds
        const endTime = startTime + 1; // unit: seconds

        // Act

        // Assert
        await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
          .to.emit(this.contract, 'SetEpochMerkleRoot')
          .withArgs(this.epochId, this.root, BigInt(startTime), endTime);
      });
    });
  });

  describe('claim(bytes32 epochId, bytes32[] calldata proof, address recipient, uint256 id, uint256 value)', function () {
    it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
      // Arrange
      const proofInfo = this.elements[0];
      const {proof, recipient, tokenId, amount} = proofInfo;

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
        .withArgs(this.epochId);
    });
    it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
      // Arrange
      const startTime = (await helpers.time.latest()) + 100; // unit: seconds
      const endTime = startTime + 1; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const proofInfo = this.elements[0];
      const {proof, recipient, tokenId, amount} = proofInfo;

      // Act
      const latestBlockTimestamp = await helpers.time.latest();

      // Assert
      expect(latestBlockTimestamp).to.be.lessThan(startTime);
      expect(latestBlockTimestamp).to.be.lessThan(endTime);
      await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(this.epochId, latestBlockTimestamp + 1);
    });
    it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
      // Arrange
      const startTime = (await helpers.time.latest()) - 100; // unit: seconds
      const endTime = await helpers.time.latest(); // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));

      const proofInfo = this.elements[0];
      const {proof, recipient, tokenId, amount} = proofInfo;

      // Act
      const latestBlockTimestamp = await helpers.time.latest();

      // Assert
      expect(latestBlockTimestamp).to.be.greaterThan(startTime);
      expect(latestBlockTimestamp).to.be.greaterThan(endTime);
      await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
        .withArgs(this.epochId, latestBlockTimestamp + 1);
    });
    it('reverts with "InvalidProof" if the proof can not be verified', async function () {
      // Arrange
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
      const proofInfo = this.elements[0];
      const {recipient, tokenId, amount} = proofInfo;
      const invalidProof = this.elements[1].proof;

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.epochId, invalidProof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(this.epochId, recipient, tokenId, amount);
    });
    it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
      // Arrange
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
      const proofInfo = this.elements[0];
      const {proof, recipient, tokenId, amount} = proofInfo;
      await this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount);

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(this.epochId, recipient, tokenId, amount);
    });
    it('reverts with "ExceededMintSupply" if the mint supply has been exceeded', async function () {
      // Arrange
      const startTime = await helpers.time.latest(); // unit: seconds
      const endTime = (await helpers.time.latest()) + 100; // unit: seconds
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
      // initial claim
      const firstProofInfo = this.elements[0];
      const {proof: firstProof, recipient: firstRecipient, tokenId: firstTokenId, amount: firstAmount} = firstProofInfo;
      await this.contract.connect(claimer1).claim(this.epochId, firstProof, firstRecipient, firstTokenId, firstAmount);
      // current claim
      const currentProofInfo = this.elements[3];
      const {proof, recipient, tokenId, amount} = currentProofInfo;

      // Act

      // Assert
      await expect(this.contract.connect(claimer2).claim(this.epochId, proof, recipient, tokenId, amount))
        .to.revertedWithCustomError(this.contract, 'ExceededMintSupply')
        .withArgs(this.epochId, recipient, tokenId, amount, firstAmount + amount);
    });
    context('when successful', function () {
      it('should update the noOfTokensClaimed', async function () {
        // Arrange
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const proofInfo = this.elements[0];
        const {proof, recipient, tokenId, amount} = proofInfo;

        // Act
        const noOfTokensClaimedBefore = await this.contract.noOfTokensClaimed();
        await this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount);
        const noOfTokensClaimedAfter = await this.contract.noOfTokensClaimed();

        // Assert
        expect(noOfTokensClaimedBefore).to.equal(0);
        expect(noOfTokensClaimedAfter).to.equal(amount);
      });
      it('should update the claimStatus', async function () {
        // Arrange
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const proofInfo = this.elements[0];
        const {proof, recipient, tokenId, amount, leafHash} = proofInfo;

        // Act
        const claimStatusBefore = await this.contract.claimStatus(leafHash);
        await this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount);
        const claimStatusAfter = await this.contract.claimStatus(leafHash);

        // Assert
        expect(claimStatusBefore).to.equal(false);
        expect(claimStatusAfter).to.equal(true);
      });
      it('should update the recipient balance', async function () {
        // Arrange
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const proofInfo = this.elements[0];
        const {proof, recipient, tokenId, amount} = proofInfo;

        // Act
        const balanceBefore = await this.rewardContract.balanceOf(recipient, tokenId);
        await this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount);
        const balanceAfter = await this.rewardContract.balanceOf(recipient, tokenId);

        // Assert
        expect(balanceBefore).to.equal(0);
        expect(balanceAfter).to.equal(amount);
      });
      it('emits a PayoutClaimed event', async function () {
        // Arrange
        const startTime = await helpers.time.latest(); // unit: seconds
        const endTime = (await helpers.time.latest()) + 100; // unit: seconds
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, BigInt(startTime), BigInt(endTime));
        const proofInfo = this.elements[0];
        const {proof, recipient, tokenId, amount} = proofInfo;

        // Act

        // Assert
        await expect(this.contract.connect(claimer1).claim(this.epochId, proof, recipient, tokenId, amount))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(this.epochId, recipient, this.root, tokenId, amount);
      });
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      const forwarderRegistryAddress = await getForwarderRegistryAddress();
      const filterRegistryAddress = await getOperatorFilterRegistryAddress();
      this.rewardContract = await deployContract('ORBNFT', filterRegistryAddress, 'ORBNFT', 'ORB');
      const rewardsContractAddress = this.rewardContract.address;

      this.contract = await deployContract('AnichessERC1155MerkleClaimMock', this.root, rewardsContractAddress, forwarderRegistryAddress);

      // Act

      // Assert
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      const forwarderRegistryAddress = await getForwarderRegistryAddress();
      const filterRegistryAddress = await getOperatorFilterRegistryAddress();
      this.rewardContract = await deployContract('ORBNFT', filterRegistryAddress, 'ORBNFT', 'ORB');
      const rewardsContractAddress = this.rewardContract.address;

      this.contract = await deployContract('AnichessERC1155MerkleClaimMock', this.root, rewardsContractAddress, forwarderRegistryAddress);

      // Act

      // Assert
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
