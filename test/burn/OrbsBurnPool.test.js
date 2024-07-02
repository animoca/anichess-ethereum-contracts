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

const formatMultiplier = (multipliers) => {
  const puzzleGameMultiplierNumerator = multipliers >> BigInt(128);
  const rocMultiplier = multipliers & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  return [puzzleGameMultiplierNumerator, rocMultiplier];
};

describe('OrbsBurnPool', function () {
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
      'OrbsBurnPool',
      this.initialTime,
      this.cycleDuration,
      this.maxCycle,
      this.root,
      await this.orb.getAddress(),
      await this.missingOrb.getAddress()
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
        deployContract('OrbsBurnPool', this.initialTime, 0, this.maxCycle, this.root, await this.orb.getAddress(), await this.missingOrb.getAddress())
      ).to.be.revertedWithCustomError(this.contract, 'ZeroCycleDuration');
    });
    it('reverts if the max cycle is 0', async function () {
      await expect(
        deployContract(
          'OrbsBurnPool',
          this.initialTime,
          this.cycleDuration,
          0,
          this.root,
          await this.orb.getAddress(),
          await this.missingOrb.getAddress()
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
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenAddress')
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
        .withArgs(await this.missingOrb.getAddress(), 1, 2);
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

    it('reverts if the roc Multiplier has already been set', async function () {
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 2, '0x');

      await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

      await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'AlreadySetROCMultiplier')
        .withArgs(user1.address);
    });

    context('when successful', function () {
      it('should update the roc Multiplier fragment info when the puzzle game multiplier numerator fragment has not been set', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multipliersBefore = await this.contract.orbMultipliers(user1.address);
        const [gameMultiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplier(multipliersBefore);

        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multipliersAfter = await this.contract.orbMultipliers(user1.address);
        const [gameMultiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplier(multipliersAfter);

        const expectedMultiplierInfo = (BigInt(0) << BigInt(128)) | BigInt(2);

        expect(multipliersBefore).to.equal(0);
        expect(gameMultiplierNumeratorBefore).to.equal(0);
        expect(tokenMultiplierBefore).to.equal(0);

        expect(multipliersAfter).to.be.equal(expectedMultiplierInfo);
        expect(gameMultiplierNumeratorAfter).to.equal(0);
        expect(tokenMultiplierAfter).to.equal(2);
      });
      it('should update the roc Multiplier fragment info when the puzzle game multiplier numerator fragment has been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data);

        const multipliersBefore = await this.contract.orbMultipliers(user1.address);
        const [gameMultiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplier(multipliersBefore);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multipliersAfter = await this.contract.orbMultipliers(user1.address);
        const [gameMultiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplier(multipliersAfter);

        const expectedMultiplierInfoBefore = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(0);
        const expectedMultiplierInfoAfter = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(2);

        expect(multipliersBefore).to.be.equal(expectedMultiplierInfoBefore);
        expect(gameMultiplierNumeratorBefore).to.equal(multiplierNumerator);
        expect(tokenMultiplierBefore).to.equal(0);

        expect(multipliersAfter).to.be.equal(expectedMultiplierInfoAfter);
        expect(gameMultiplierNumeratorAfter).to.equal(multiplierNumerator);
        expect(tokenMultiplierAfter).to.equal(2);
      });
      it('emits an UpdateOrbMultiplier event', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
          .to.emit(this.contract, 'UpdateOrbMultiplier')
          .withArgs(user1.address, 0, BigInt(2));
      });
    });

    context('when the data input field is not empty', function () {
      // it('reverts if the leaf has already been consumed', async function () {
      //   const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[5];
      //   const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

      //   await this.orb.connect(deployer).safeBatchMint(user5.address, [1], [1], '0x');
      //   await this.orb.connect(user5).safeBatchTransferFrom(user5.address, await this.contract.getAddress(), [1], [1], data);

      //   await this.missingOrb.connect(deployer).safeMint(user5.address, 1, 1, '0x');
      //   await expect(
      //     this.missingOrb.connect(user5).safeTransferFrom(user5.address, await this.contract.getAddress(), 1, 1, data)
      //   ).to.be.revertedWithCustomError(this.contract, 'AlreadyConsumedLeaf');
      // });
      it('reverts if the proof is invalid', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const {proof: incorrectProof} = this.merkleClaimDataArr[1];

        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [incorrectProof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data))
          .to.be.revertedWithCustomError(this.contract, 'InvalidProof')
          .withArgs(user1.address, multiplierNumerator);
      });

      context('when successful', function () {
        it('will not revert if the puzzle game multiplier numerator is already set', async function () {
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
          ).not.to.be.reverted;
        });

        it('unlock puzzle game multiplier numerator & roc Multiplier at the same time', async function () {
          const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

          await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

          const multipliersBefore = await this.contract.orbMultipliers(user1.address);
          const [multiplierNumeratorBefore, tokenMultiplierBefore] = formatMultiplier(multipliersBefore);

          await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

          const multipliersAfter = await this.contract.orbMultipliers(user1.address);
          const [multiplierNumeratorAfter, tokenMultiplierAfter] = formatMultiplier(multipliersAfter);

          const expectedMultiplierInfo = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(2);

          expect(multipliersBefore).to.equal(0);
          expect(multiplierNumeratorBefore).to.equal(0);
          expect(tokenMultiplierBefore).to.equal(0);

          expect(multipliersAfter).to.be.equal(expectedMultiplierInfo);
          expect(multiplierNumeratorAfter).to.equal(multiplierNumerator);
          expect(tokenMultiplierAfter).to.equal(2);
        });

        it('emits an UpdateOrbMultiplier event', async function () {
          const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

          await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

          const multipliersAfterSetTokenMultiplier = BigInt(2);
          const multipliersAfterSetPuzzleGameMultiplierNumerator =
            (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(multipliersAfterSetTokenMultiplier);

          await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data))
            .and.to.emit(this.contract, 'UpdateOrbMultiplier')
            .withArgs(user1.address, 0, multipliersAfterSetPuzzleGameMultiplierNumerator);
        });
      });
    });
  });

  describe('onERC1155BatchReceived(address, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data)', function () {
    it('reverts if the msg.sender is not the source token contract', async function () {
      await expect(this.contract.connect(other).onERC1155BatchReceived(other.address, user1.address, [1], [1], '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidTokenAddress')
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
        .withArgs(await this.orb.getAddress(), 1, 0);
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
      it('should apply the roc Multiplier to the ash if only roc Multiplier has been unlocked', async function () {
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
      it('should apply the puzzle game multiplier numerator to the ash if only puzzle game multiplier numerator has been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.orb.connect(deployer).safeBatchMint(user1.address, [1], [1], '0x');
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), [1], [1], data);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multipliers = await this.contract.orbMultipliers(user1.address);
        const [puzzleGameMultiplierNumerator, tokenMultiplier] = formatMultiplier(multipliers);
        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = Math.floor(
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            Number(puzzleGameMultiplierNumerator)) /
            10000
        );

        expect(ashBefore).to.equal(2);
        expect(ashAfter).to.equal(expectedAsh + 2);
      });
      it('should apply both the roc multiplier and puzzle game multiplier numerator to the ash if both have been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        const multipliers = await this.contract.orbMultipliers(user1.address);
        const [puzzleGameMultiplierNumerator, rocMultiplier] = formatMultiplier(multipliers);
        const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
        await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x');
        const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

        const expectedAsh = Math.floor(
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            Number(puzzleGameMultiplierNumerator) *
            Number(rocMultiplier)) /
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
      it('should emit an GenerateAsh event (without data field)', async function () {
        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        const currentTime = await helpers.time.latest();
        const curCycle = await this.contract.currentCycle();
        await helpers.time.setNextBlockTimestamp(currentTime + 10);
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');
        const expectedAsh = tokenIds.reduce(
          (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
          0
        );
        const totalAshPerCycle = Number(await this.contract.totalAshPerCycle(curCycle)) + expectedAsh;
        const multiplier = await this.contract.orbMultipliers(user1.address);
        await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, '0x'))
          .to.emit(this.contract, 'GenerateAsh')
          .withArgs(user1.address, await this.contract.currentCycle(), tokenIds, values, expectedAsh, totalAshPerCycle, multiplier);
      });

      it('should emit an GenerateAsh event (with data field)', async function () {
        const {proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];

        const currentTime = await helpers.time.latest();
        const curCycle = await this.contract.currentCycle();
        await helpers.time.setNextBlockTimestamp(currentTime + 10);
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');
        const expectedAsh =
          (tokenIds.reduce((acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight, 0) *
            multiplierNumerator) /
          10000;
        const totalAshPerCycle = Number(await this.contract.totalAshPerCycle(curCycle)) + expectedAsh;
        const curOrbMultiplier = await this.contract.orbMultipliers(user1.address);
        const newOrbMultiplier = (BigInt(multiplierNumerator) << BigInt(128)) | curOrbMultiplier;
        await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data))
          .to.emit(this.contract, 'GenerateAsh')
          .withArgs(user1.address, await this.contract.currentCycle(), tokenIds, values, expectedAsh, totalAshPerCycle, newOrbMultiplier);
      });
    });

    context('when the data input field is not empty', function () {
      it('reverts if the data input does not contain the correct proof', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const {proof: incorrectProof} = this.merkleClaimDataArr[1];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [incorrectProof, multiplierNumerator]);

        const tokenIds = [1, 2, 3, 4, 5, 6, 7];
        const values = [1, 2, 3, 4, 3, 2, 1];
        await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

        await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data))
          .to.be.revertedWithCustomError(this.contract, 'InvalidProof')
          .withArgs(user1.address, multiplierNumerator);
      });

      context('when successful', function () {
        it('will not revert if the puzzle game multiplier numerator fragment has already been set', async function () {
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

          await expect(
            this.orb.connect(user4).safeBatchTransferFrom(user4.address, await this.contract.getAddress(), tokenIds, values, data)
          ).not.to.be.reverted;
        });

        it('unlock puzzle game multiplier numerator & calculate the ash with updated multiplier', async function () {
          const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

          const tokenIds = [1, 2, 3, 4, 5, 6, 7];
          const values = [1, 2, 3, 4, 3, 2, 1];
          await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

          const multipliersBefore = await this.contract.orbMultipliers(user1.address);
          const [puzzleGameMultiplierNumeratorBefore] = formatMultiplier(multipliersBefore);
          const ashBefore = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);
          await this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data);

          const multipliersAfter = await this.contract.orbMultipliers(user1.address);
          const [puzzleGameMultiplierNumeratorAfter] = formatMultiplier(multipliersAfter);
          const ashAfter = await this.contract.userAshPerCycle(await this.contract.currentCycle(), user1.address);

          const expectedAsh =
            (tokenIds.reduce(
              (acc, tokenId, index) => acc + values[index] * this.tokenConfigs.find((config) => config.tokenId === tokenId).weight,
              0
            ) *
              multiplierNumerator) /
            10000;
          expect(ashBefore).to.equal(0);
          expect(puzzleGameMultiplierNumeratorBefore).to.equal(0);

          expect(ashAfter).to.equal(expectedAsh);
          expect(puzzleGameMultiplierNumeratorAfter).to.equal(multiplierNumerator);
        });
        it('emits a UpdateOrbMultiplier event', async function () {
          const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

          const tokenIds = [1, 2, 3, 4, 5, 6, 7];
          const values = [1, 2, 3, 4, 3, 2, 1];
          await this.orb.connect(deployer).safeBatchMint(user1.address, tokenIds, values, '0x');

          const multipliersAfterSetPuzzleGameMultiplierNumerator = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(0);

          await expect(this.orb.connect(user1).safeBatchTransferFrom(user1.address, await this.contract.getAddress(), tokenIds, values, data))
            .to.emit(this.contract, 'UpdateOrbMultiplier')
            .withArgs(user1.address, 0, multipliersAfterSetPuzzleGameMultiplierNumerator);
        });
      });
    });
  });
});
