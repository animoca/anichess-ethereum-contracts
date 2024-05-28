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
    [deployer, user1, user2, user3, user4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    const metadataResolverAddress = await getTokenMetadataResolverWithBaseURIAddress();
    const forwarderRegistryAddress = await getForwarderRegistryAddress();
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    this.orb = await deployContract(
      'ERC1155FullBurn',
      'ORBNFT',
      'ORB',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      forwarderRegistryAddress
    );
    this.missingOrb = await deployContract(
      'ERC1155FullBurn',
      'MissingOrb',
      'MORB',
      metadataResolverAddress,
      operatorFilterRegistryAddress,
      forwarderRegistryAddress
    );

    this.initialTime = await helpers.time.latest();
    this.cycleDuration = 60 * 60 * 24; // 1 day
    this.maxCycles = 10;
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
      this.maxCycles,
      await this.orb.getAddress(),
      this.tokenIds,
      this.tokenWeights,
      this.root,
      await this.missingOrb.getAddress(),
      this.tokenMultiplier,
      forwarderRegistryAddress
    );

    await this.orb.grantRole(await this.orb.MINTER_ROLE(), deployer.address);
    await this.missingOrb.grantRole(await this.missingOrb.MINTER_ROLE(), deployer.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('sets the initial time', async function () {
      expect(await this.contract.INITIAL_TIME()).to.equal(this.initialTime);
    });
    it('set the cycle duration', async function () {
      expect(await this.contract.CYCLE_DURATION()).to.equal(this.cycleDuration);
    });
  });

  describe('onERC1155Received(address, address from, uint256 id, uint256 value, bytes calldata data)', function () {
    context('when successful', function () {
      context('when the data is not empty', function () {
        it('unlock token multiplier', async function () {
          const {recipient, proof, multiplierNumerator} = this.merkleClaimDataArr[0];
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['bytes32[]', 'uint256'], [proof, multiplierNumerator]);

          await this.missingOrb.connect(deployer).safeMint(user1.address, 1, 1, '0x');

          const multiplierInfoBefore = await this.contract.getMultiplierInfo(user1.address);

          await this.missingOrb.connect(user1).safeTransferFrom(user1.address, await this.contract.getAddress(), 1, 1, data);

          const multiplierInfoAfter = await this.contract.getMultiplierInfo(user1.address);

          expect(multiplierInfoBefore[0]).to.equal(0);
          expect(multiplierInfoBefore[1]).to.equal(0);
          expect(multiplierInfoBefore[2]).to.equal(0);

          expect(multiplierInfoAfter[0]).to.be.ok;
          expect(Number(multiplierInfoAfter[1])).to.equal(multiplierNumerator);
          expect(Number(multiplierInfoAfter[2])).to.equal(this.tokenMultiplier);
        });
      });
    });
  });
});
