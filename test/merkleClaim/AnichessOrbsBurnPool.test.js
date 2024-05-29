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
    this.tokenIds = [
      1, // Pawn
      2, // Knight
      3, // Bishop
      4, // Rook
      5, // Queen
      6, // King
      7, // Whisper of Chaos
    ];
    this.tokenWeights = [
      1, // Pawn
      3, // Knight
      3, // Bishop
      5, // Rook
      9, // Queen
      25, // King
      16, // Whisper of Chaos
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

    this.tokenMultiplier = 2;

    this.contract = await deployContract(
      'AnichessOrbsBurnPool',
      this.initialTime,
      this.cycleDuration,
      this.maxCycle,
      await this.orb.getAddress(),
      this.tokenIds,
      this.tokenWeights,
      this.root,
      await this.missingOrb.getAddress(),
      this.tokenMultiplier,
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
          this.tokenIds,
          this.tokenWeights,
          this.root,
          await this.missingOrb.getAddress(),
          this.tokenMultiplier,
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
          this.tokenIds,
          this.tokenWeights,
          this.root,
          await this.missingOrb.getAddress(),
          this.tokenMultiplier,
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
      it('set the source token contract', async function () {
        expect(await this.contract.SOURCE_TOKEN()).to.equal(await this.orb.getAddress());
      });
      it('set the token multiplier', async function () {
        expect(await this.contract.TOKEN_MULTIPLIER()).to.equal(this.tokenMultiplier);
      });
      it('set the token weights', async function () {
        for (let i = 0; i < this.tokenIds.length; i++) {
          expect(await this.contract.tokenWeights(this.tokenIds[i])).to.equal(this.tokenWeights[i]);
        }
      });
    });
  });

  describe('getMultiplierInfo(address wallet)', function () {
    it('should return the correct multiplier info', async function () {
      const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
      await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

      const multiplierInfo = await this.contract.getMultiplierInfo(recipient);
      const expectedMultiplierInfo = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(this.tokenMultiplier);

      expect(multiplierInfo[0]).to.be.equal(expectedMultiplierInfo);
      expect(multiplierInfo[1]).to.equal(multiplierNumerator);
      expect(multiplierInfo[2]).to.equal(this.tokenMultiplier);
    });
  });

  describe('currentCycle()', function () {
    it('should return the correct cycle', async function () {
      await helpers.time.increaseTo(this.initialTime + this.cycleDuration * 3);
      expect(await this.contract.currentCycle()).to.equal(3);
    });
  });

  // eslint-disable-next-line max-len
  describe('setAnichessGameMultiplierNumerator(bytes32[] calldata proof, address recipient, uint256 newAnichessGameMultiplierNumerator)', function () {
    it('reverts if the anichess game multiplier numerator is already set', async function () {
      const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[3];
      const duplicatedMerkleClaimData = this.merkleClaimDataArr[4];

      await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);

      await expect(
        this.contract.setAnichessGameMultiplierNumerator(
          duplicatedMerkleClaimData.proof,
          duplicatedMerkleClaimData.recipient,
          duplicatedMerkleClaimData.multiplierNumerator
        )
      ).to.be.revertedWithCustomError(this.contract, 'AlreadySetAnichessGameMultiplierNumerator');
    });
    it('reverts if the leaf has already been consumed', async function () {
      const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[5];

      await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);

      await expect(this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator)).to.be.revertedWithCustomError(
        this.contract,
        'AlreadyConsumedLeaf'
      );
    });
    it('reverts if the proof is invalid', async function () {
      const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
      const {proof: incorrectProof} = this.merkleClaimDataArr[1];

      await expect(this.contract.setAnichessGameMultiplierNumerator(incorrectProof, recipient, multiplierNumerator)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidProof'
      );
    });
    context('when successful', function () {
      it('sets the anichess game multiplier numerator', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];

        const multiplierInfoBefore = await this.contract.getMultiplierInfo(recipient);
        await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);
        const multiplierInfoAfter = await this.contract.getMultiplierInfo(recipient);

        expect(multiplierInfoBefore[1]).to.equal(0);
        expect(multiplierInfoBefore[2]).to.equal(0);
        expect(multiplierInfoAfter[1]).to.equal(multiplierNumerator);
        expect(multiplierInfoAfter[2]).to.equal(0);
      });
      it('consumes the leaf', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];

        const leaf = ethers.solidityPacked(['address', 'uint256'], [recipient, multiplierNumerator]);
        const consumptionStatusBefore = await this.contract.leafConsumptionStatus(keccak256(leaf));
        await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);
        const consumptionStatusAfter = await this.contract.leafConsumptionStatus(keccak256(leaf));

        expect(consumptionStatusBefore).to.be.false;
        expect(consumptionStatusAfter).to.be.true;
      });
      it('emits an UpdateMultiplierInfo event', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];

        // construct multipliers info in uint256 format, putting the multiplierNumerator in the first 128 bits
        const anichessGameMultiplierNumeratorBn = BigInt(multiplierNumerator) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
        const expectedMultiplierInfo = anichessGameMultiplierNumeratorBn << BigInt(128);

        await expect(this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator))
          .to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(recipient, 0, expectedMultiplierInfo);
      });
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

    it('reverts if the token multiplier has already been set', async function () {
      await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 2, '0x');

      await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

      await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'AlreadyUnlockedTokenMultiplier')
        .withArgs(user1.address);
    });

    context('when successful', function () {
      it('should update the token multiplier fragment info when the anichess game multiplier numerator fragment has not been set', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multiplierInfoBefore = await this.contract.getMultiplierInfo(user1.address);

        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multiplierInfoAfter = await this.contract.getMultiplierInfo(user1.address);

        const expectedMultiplierInfo = (BigInt(0) << BigInt(128)) | BigInt(this.tokenMultiplier);

        expect(multiplierInfoBefore[0]).to.equal(0);
        expect(multiplierInfoBefore[1]).to.equal(0);
        expect(multiplierInfoBefore[2]).to.equal(0);

        expect(multiplierInfoAfter[0]).to.be.equal(expectedMultiplierInfo);
        expect(multiplierInfoAfter[1]).to.equal(0);
        expect(multiplierInfoAfter[2]).to.equal(this.tokenMultiplier);
      });
      it('should update the token multiplier fragment info when the anichess game multiplier numerator fragment has been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);

        const multiplierInfoBefore = await this.contract.getMultiplierInfo(user1.address);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');
        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x');

        const multiplierInfoAfter = await this.contract.getMultiplierInfo(user1.address);

        const expectedMultiplierInfoBefore = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(0);
        const expectedMultiplierInfoAfter = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(this.tokenMultiplier);

        expect(multiplierInfoBefore[0]).to.be.equal(expectedMultiplierInfoBefore);
        expect(multiplierInfoBefore[1]).to.equal(multiplierNumerator);
        expect(multiplierInfoBefore[2]).to.equal(0);

        expect(multiplierInfoAfter[0]).to.be.equal(expectedMultiplierInfoAfter);
        expect(multiplierInfoAfter[1]).to.equal(multiplierNumerator);
        expect(multiplierInfoAfter[2]).to.equal(this.tokenMultiplier);
      });
      it('emits an UpdateMultiplierInfo event', async function () {
        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, '0x'))
          .to.emit(this.contract, 'UpdateMultiplierInfo')
          .withArgs(user1.address, 0, BigInt(this.tokenMultiplier));
      });
    });

    context('when the data input field is not empty', function () {
      it('reverts if the anichess game multiplier numerator fragment has already been set', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        await this.contract.setAnichessGameMultiplierNumerator(proof, recipient, multiplierNumerator);

        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        await expect(this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data))
          .to.be.revertedWithCustomError(this.contract, 'AlreadySetAnichessGameMultiplierNumerator')
          .withArgs(user1.address);
      });

      it('reverts if the data input does not contain the correct proof', async function () {
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

        const multiplierInfoBefore = await this.contract.getMultiplierInfo(user1.address);

        await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

        const multiplierInfoAfter = await this.contract.getMultiplierInfo(user1.address);

        const expectedMultiplierInfo = (BigInt(multiplierNumerator) << BigInt(128)) | BigInt(this.tokenMultiplier);

        expect(multiplierInfoBefore[0]).to.equal(0);
        expect(multiplierInfoBefore[1]).to.equal(0);
        expect(multiplierInfoBefore[2]).to.equal(0);

        expect(multiplierInfoAfter[0]).to.be.equal(expectedMultiplierInfo);
        expect(multiplierInfoAfter[1]).to.equal(multiplierNumerator);
        expect(multiplierInfoAfter[2]).to.equal(this.tokenMultiplier);
      });
      it('emits two UpdateMultiplierInfo events', async function () {
        const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

        await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

        const multiplierInfoAfterSetTokenMultiplier = BigInt(this.tokenMultiplier);
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
});
