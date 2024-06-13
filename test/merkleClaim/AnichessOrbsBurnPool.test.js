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

const formatMultiplierInfos = (multiplierInfo) => {
  const anichessGameMultiplierNumerator = multiplierInfo >> BigInt(128);
  const tokenMultiplier = multiplierInfo & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  return [anichessGameMultiplierNumerator, tokenMultiplier];
};

const parseMultiplierInfos = (anichessGameMultiplierNumerator, tokenMultiplier) => {
  const firstHalf = BigInt(anichessGameMultiplierNumerator) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  const secondHalf = BigInt(tokenMultiplier) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  return (firstHalf << BigInt(128)) | secondHalf;
};

describe('AnichessOrbsBurnPool', function () {
  before(async function () {
    [deployer, user1, user2, user3, user4, user5, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    const metadataResolverAddress = await getTokenMetadataResolverWithBaseURIAddress();
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    this.orb = await deployContract(
      'ERC1155FullBurn',
      'ORBNFT',
      'ORB',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      this.forwarderRegistryAddress
    );
    this.missingOrb = await deployContract(
      'ERC1155FullBurn',
      'MissingOrb',
      'MORB',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      this.forwarderRegistryAddress
    );

    this.initialTime = await helpers.time.latest();
    this.cycleDuration = 60 * 60 * 24; // 1 day
    this.maxCycle = 10;
    this.tokenConfigs = [
      {
        tokenId: 1, // Pawn
        weight: 1,
      },
      {
        tokenId: 2, // Knight
        weight: 3,
      },
      {
        tokenId: 3, // Bishop
        weight: 3,
      },
      {
        tokenId: 4, // Rook
        weight: 5,
      },
      {
        tokenId: 5, // Queen
        weight: 9,
      },
      {
        tokenId: 6, // King
        weight: 25,
      },
      {
        tokenId: 7, // Whisper of Chaos
        weight: 16,
      },
    ];

    this.leaderboardData = [
      {
        walletAddress: user1.address,
        multiplierNumerator: 20000,
      },
      {
        walletAddress: user2.address,
        multiplierNumerator: 50000,
      },
      {
        walletAddress: user3.address,
        multiplierNumerator: 25000,
      },
      {
        walletAddress: user4.address,
        multiplierNumerator: 35000,
      },
      {
        walletAddress: user4.address,
        multiplierNumerator: 40000, // duplicate wallet address
      },
      {
        walletAddress: user5.address,
        multiplierNumerator: 0, // duplicate wallet address
      },
    ];

    this.leaves = this.leaderboardData.map(({walletAddress, multiplierNumerator}) =>
      ethers.solidityPacked(['address', 'uint256'], [walletAddress, multiplierNumerator])
    );
    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.leaderboardData[index].walletAddress,
      multiplierNumerator: this.leaderboardData[index].multiplierNumerator,
    }));

    this.contract = await deployContract(
      'AnichessOrbsBurnPool',
      this.initialTime,
      this.cycleDuration,
      this.maxCycle,
      await this.orb.getAddress(),
      this.root,
      await this.missingOrb.getAddress(),
      this.forwarderRegistryAddress
    );

    await this.orb.grantRole(await this.orb.MINTER_ROLE(), deployer.address);
    await this.missingOrb.grantRole(await this.missingOrb.MINTER_ROLE(), deployer.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the cycle duration is 0', async function () {
      await expect(
        deployContract(
          'AnichessOrbsBurnPool',
          this.initialTime,
          0,
          this.maxCycle,
          await this.orb.getAddress(),
          this.root,
          await this.missingOrb.getAddress(),
          this.forwarderRegistryAddress
        )
      ).to.be.revertedWithCustomError(this.contract, 'ZeroCycleDuration');
    });
    it('reverts if the max cycle is 0', async function () {
      await expect(
        deployContract(
          'AnichessOrbsBurnPool',
          this.initialTime,
          this.cycleDuration,
          0,
          await this.orb.getAddress(),
          this.root,
          await this.missingOrb.getAddress(),
          this.forwarderRegistryAddress
        )
      ).to.be.revertedWithCustomError(this.contract, 'ZeroMaxCycle');
    });
    context('when successful', function () {
      it('sets the initial time', async function () {
        expect(await this.contract.INITIAL_TIME()).to.equal(this.initialTime);
      });
      it('set the cycle duration', async function () {
        expect(await this.contract.CYCLE_DURATION()).to.equal(this.cycleDuration);
      });
      it('set the max cycle', async function () {
        expect(await this.contract.MAX_CYCLE()).to.equal(this.maxCycle);
      });
      it('set the merkle root', async function () {
        expect(await this.contract.MERKLE_ROOT()).to.equal(this.root);
      });
      it('set the missing orb contract', async function () {
        expect(await this.contract.MISSING_ORB()).to.equal(await this.missingOrb.getAddress());
      });
      it('set the orb of power token contract', async function () {
        expect(await this.contract.ORB_OF_POWER()).to.equal(await this.orb.getAddress());
      });
    });
  });

  describe('currentCycle()', function () {
    it('should return the correct cycle', async function () {
      const snapshot = await helpers.takeSnapshot();
      await helpers.time.increaseTo(this.initialTime + this.cycleDuration * 3);
      expect(await this.contract.currentCycle()).to.equal(3);
      await snapshot.restore();
    });
  });

  describe('onERC1155Received(address, address from, uint256 id, uint256 value, bytes calldata data)', function () {
    it('reverts if the msg.sender is not the source token contract', async function () {
      await expect(this.contract.connect(other).onERC1155Received(other.address, user1.address, 1, 1, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidToken')
        .withArgs(other.address);
    });

    it('reverts if the id is not tokenId 1', async function () {
      await this.missingOrb.connect(deployer).safeMint(user1.address, 2, 1, '0x');

      await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 2, 1, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenId')
        .withArgs(await this.missingOrb.getAddress(), 2);
    });

    it('reverts if the value is not 1', async function () {
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 2, '0x');

      await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 2, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenValue')
        .withArgs(2, 1);
    });

    it('reverts if the current cycle is greater than the max cycle', async function () {
      const snapshot = await helpers.takeSnapshot();
      await helpers.time.increaseTo(this.initialTime + this.cycleDuration * (this.maxCycle + 1));
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

      await expect(
        this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x')
      ).to.be.revertedWithCustomError(this.contract, 'InvalidCycle');
      await snapshot.restore();
    });

    it('reverts if the token multiplier has already been set', async function () {
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 2, '0x');

      await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

      await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'AlreadySetTokenMultiplier')
        .withArgs(user1.address);
    });

    context('when successful', function () {
      it('should update the token multiplier fragment info when the anichess game multiplier numerator fragment has not been set', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multiplierInfoBefore = await this.contract.multiplierInfos(user1.address);
        const [gameMultiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplierInfos(multiplierInfoBefore);

        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multiplierInfoAfter = await this.contract.multiplierInfos(user1.address);
        const [gameMultiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplierInfos(multiplierInfoAfter);

        const expectedMultiplierInfo = (BigInt(0) << BigInt(128)) | BigInt(2);

        expect(multiplierInfoBefore).to.equal(0);
        expect(gameMultiplierNumeratorBefore).to.equal(0);
        expect(tokenMultiplierBefore).to.equal(0);

        expect(multiplierInfoAfter).to.be.equal(expectedMultiplierInfo);
        expect(gameMultiplierNumeratorAfter).to.equal(0);
        expect(tokenMultiplierAfter).to.equal(2);
      });
      it('should update the token multiplier fragment info when the anichess game multiplier numerator fragment has been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data);

        const multiplierInfoBefore = await this.contract.multiplierInfos(user1.address);
        const [gameMultiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplierInfos(multiplierInfoBefore);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multiplierInfoAfter = await this.contract.multiplierInfos(user1.address);
        const [gameMultiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplierInfos(multiplierInfoAfter);

        const expectedMultiplierInfoBefore = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(0);
        const expectedMultiplierInfoAfter = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(2);

        expect(multiplierInfoBefore).to.be.equal(expectedMultiplierInfoBefore);
        expect(gameMultiplierNumeratorBefore).to.equal(multiplierNumerator);
        expect(tokenMultiplierBefore).to.equal(0);

        expect(multiplierInfoAfter).to.be.equal(expectedMultiplierInfoAfter);
        expect(gameMultiplierNumeratorAfter).to.equal(multiplierNumerator);
        expect(tokenMultiplierAfter).to.equal(2);
      });
      it('emits an UpdateMultiplierInfo event', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
          .to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(user1.address, 0, BigInt(2));
      });
    });

    context('when the data input field is not empty', function () {
      it('reverts if the anichess game multiplier numerator is already set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[3];
        const duplicatedMerkleClaimData = this.merkleClaimDataArr[4];

        await this.orb.connect(deployer).safeBatchMint(user4.address, [1], [1], '0x');
        await this.orb
          .connect(user4)
          .safeBatchTransferFrom(
            user4.address,
            await this.contract.getAddress(),
            [1],
            [1],
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['bytes32[]', 'uint256'],
              [duplicatedMerkleClaimData.proof, duplicatedMerkleClaimData.multiplierNumerator]
            )
          );

        await this.missingOrb.connect(deployer).safeMint(user4.address, 1, 1, '0x');

        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await expect(
          this.missingOrb.connect(user4).safeTransferFrom(user4.address, await this.contract.getAddress(), 1, 1, data)
        ).to.be.to.be.revertedWithCustomError(this.contract, 'AlreadySetAnichessGameMultiplierNumerator');
      });
      it('reverts if the leaf has already been consumed', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[5];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.orb.connect(deployer).safeBatchMint(user5.address, [1], [1], '0x');
        await this.orb.connect(user5).safeBatchTransferFrom(user5.address, await this.contract.getAddress(), [1], [1], data);

        await this.missingOrb.connect(deployer).safeMint(user5.address, 1, 1, '0x');
        await expect(
          this.missingOrb.connect(user5).safeTransferFrom(user5.address, await this.contract.getAddress(), 1, 1, data)
        ).to.be.revertedWithCustomError(this.contract, 'AlreadyConsumedLeaf');
      });
      it('reverts if the proof is invalid', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const {proof: incorrectProof} = this.merkleClaimDataArr[1];

        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [incorrectProof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await expect(
          this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data)
        ).to.be.revertedWithCustomError(this.contract, 'InvalidProof');
      });

      it('unlock anichess game multiplier numerator & token multiplier at the same time', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multiplierInfoBefore = await this.contract.multiplierInfos(user1.address);
        const [multiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplierInfos(multiplierInfoBefore);

        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

        const multiplierInfoAfter = await this.contract.multiplierInfos(user1.address);
        const [multiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplierInfos(multiplierInfoAfter);

        const expectedMultiplierInfo = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(2);

        expect(multiplierInfoBefore).to.equal(0);
        expect(multiplierNumeratorBefore).to.equal(0);
        expect(tokenMultiplierBefore).to.equal(0);

        expect(multiplierInfoAfter).to.be.equal(expectedMultiplierInfo);
        expect(multiplierNumeratorAfter).to.equal(multiplierNumerator);
        expect(tokenMultiplierAfter).to.equal(2);
      });
      it('emits two UpdateMultiplierInfo events', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multiplierInfoAfterSetTokenMultiplier = BigInt(2);
        const multiplierInfoAfterSetAnichessGameMultiplierNumerator =
          (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(multiplierInfoAfterSetTokenMultiplier);

        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data))
          .to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(user1.address, 0, multiplierInfoAfterSetTokenMultiplier)
          .and.to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(user1.address, multiplierInfoAfterSetTokenMultiplier, multiplierInfoAfterSetAnichessGameMultiplierNumerator);
      });
    });
  });

  describe('onERC1155BatchReceived(address, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data)', function () {
    it('reverts if the msg.sender is not the source token contract', async function () {
      await expect(this.contract.connect(other).onERC1155BatchReceived(other.address, user1.address, [1], [1], '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidToken')
        .withArgs(other.address);
    });
    it('reverts if the current cycle is greater than the max cycle', async function () {
      const snapshot = await helpers.takeSnapshot();
      await helpers.time.increaseTo(this.initialTime + this.cycleDuration * (this.maxCycle + 1));
      await this.orb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
      await expect(
        this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), [1], [1], '0x')
      ).to.be.revertedWithCustomError(this.contract, 'InvalidCycle');
      await snapshot.restore();
    });

    it('reverts if the token id is invalid', async function () {
      await this.orb.connect(deployer).safeBatchMint(user1.address, [8], [1], '0x');
      await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), [8], [1], '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenId')
        .withArgs(await this.orb.getAddress(), 8);
    });

    it('reverts if the token value is invalid', async function () {
      await this.orb.connect(deployer).safeBatchMint(user1.address, [1], [1], '0x');
      await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), [1], [0], '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenValue')
        .withArgs(0, 0);
    });

    context('when successful', function () {
      it('should calculate the ash based on the token weights', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = tokenIds.reduce(
          (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
          0
        );
        expect(ashBefore).to.equal(0);
        expect(ashAfter).to.equal(expectedAsh);
      });
      it('should apply the token multiplier to the ash if only token multiplier has been unlocked', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh =
          tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
          2;

        expect(ashBefore).to.equal(0);
        expect(ashAfter).to.equal(expectedAsh);
      });
      it('should apply the anichess game multiplier numerator to the ash if only anichess game multiplier numerator has been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.orb.connect(deployer).safeBatchMint(user1.address, [1], [1], '0x');
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), [1], [1], data);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multiplierInfo = await this.contract.multiplierInfos(user1.address);
        const [anichessGameMultiplierNumerator, tokenMultiplier] = formatMultiplierInfos(multiplierInfo);
        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = Math.floor(
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            Number(anichessGameMultiplierNumerator)) /
            10000
        );

        expect(ashBefore).to.equal(2);
        expect(ashAfter).to.equal(expectedAsh + 2);
      });
      it('should apply both the token multiplier and anichess game multiplier numerator to the ash if both have been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multiplierInfo = await this.contract.multiplierInfos(user1.address);
        const [anichessGameMultiplierNumerator, tokenMultiplier] = formatMultiplierInfos(multiplierInfo);
        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = Math.floor(
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            Number(anichessGameMultiplierNumerator) *
            Number(tokenMultiplier)) /
            10000
        );

        expect(ashBefore).to.equal(0);
        expect(ashAfter).to.equal(expectedAsh);
      });
      it('should update the user ash by cycle', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = tokenIds.reduce(
          (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
          0
        );
        expect(ashBefore).to.equal(0);
        expect(ashAfter).to.equal(expectedAsh);
      });
      it('should update the total ash by cycle', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const ashBefore = await this.contract.totalAshPerCycle(await this.contract.currentCycle());
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.totalAshPerCycle(await this.contract.currentCycle());

        const expectedAsh = tokenIds.reduce(
          (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
          0
        );
        expect(ashBefore).to.equal(0);
        expect(ashAfter).to.equal(expectedAsh);
      });
      it('should burn the tokens', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        expect(await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x'))
          .emit(this.orb, 'TransferBatch')
          .withArgs(await this.contract.getAddress(), ethers.ZeroAddress, tokenIds, values, '0x');
      });
      it('should emit an GenerateAsh event', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        const currentTime = await helpers.time.latest();
        await helpers.time.setNextBlockTimestamp(currentTime + 10);
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');
        const expectedAsh = tokenIds.reduce(
          (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
          0
        );
        const multiplier = await this.contract.multiplierInfos(user1.address);
        await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x'))
          .to.emit(this.contract, 'GenerateAsh')
          .withArgs(user1.address, await this.contract.currentCycle(), tokenIds, values, expectedAsh, multiplier);
      });
    });

    context('when the data input field is not empty', function () {
      it('reverts if the anichess game multiplier numerator fragment has already been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[3];

        await this.missingOrb.connect(deployer).safeMint(user4.address, 1, 1, '0x');
        await this.missingOrb
          .connect(user4)
          .safeTransferFrom(
            user4.address,
            await this.contract.getAddress(),
            1,
            1,
            ethers.AbiCoder.defaultAbiCoder().encode(
              ['bytes32[]', 'uint256'],
              [this.merkleClaimDataArr[4].proof, this.merkleClaimDataArr[4].multiplierNumerator]
            )
          );

        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user4.address, tokenIds, values, '0x');

        await expect(this.orb.connect(user4).safeBatchTransferFrom(user4.address, await this.contract.getAddress(), tokenIds, values, data))
          .to.be.revertedWithCustomError(this.contract, 'AlreadySetAnichessGameMultiplierNumerator')
          .withArgs(user4.address);
      });

      it('reverts if the data input does not contain the correct proof', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const {proof: incorrectProof} = this.merkleClaimDataArr[1];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [incorrectProof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        await expect(
          this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data)
        ).to.be.revertedWithCustomError(this.contract, 'InvalidProof');
      });

      it('unlock anichess game multiplier numerator & calculate the ash with updated multiplier', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multiplierInfoBefore = await this.contract.multiplierInfos(user1.address);
        const [anichessGameMultiplierNumeratorBefore] = formatMultiplierInfos(multiplierInfoBefore);
        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data);

        const multiplierInfoAfter = await this.contract.multiplierInfos(user1.address);
        const [anichessGameMultiplierNumeratorAfter] = formatMultiplierInfos(multiplierInfoAfter);
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh =
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            multiplierNumerator) /
          10000;
        expect(ashBefore).to.equal(0);
        expect(anichessGameMultiplierNumeratorBefore).to.equal(0);

        expect(ashAfter).to.equal(expectedAsh);
        expect(anichessGameMultiplierNumeratorAfter).to.equal(multiplierNumerator);
      });
      it('emits a UpdateMultiplierInfo event', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multiplierInfoAfterSetAnichessGameMultiplierNumerator = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(0);

        await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data))
          .to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(user1.address, 0, multiplierInfoAfterSetAnichessGameMultiplierNumerator);
      });
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      this.contract = await deployContract(
        'AnichessOrbsBurnPoolMock',
        this.initialTime,
        this.cycleDuration,
        this.maxCycle,
        await this.orb.getAddress(),
        this.root,
        await this.missingOrb.getAddress(),
        this.forwarderRegistryAddress
      );
      expect(await this.contract.connect(user1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      this.contract = await deployContract(
        'AnichessOrbsBurnPoolMock',
        this.initialTime,
        this.cycleDuration,
        this.maxCycle,
        await this.orb.getAddress(),
        this.root,
        await this.missingOrb.getAddress(),
        this.forwarderRegistryAddress
      );

      expect(await this.contract.connect(user1).__msgSender()).to.be.exist;
    });
  });
});
