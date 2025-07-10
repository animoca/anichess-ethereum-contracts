const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('EthernalsMetadataSetter', function () {
  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.whitelist = [
      {
        tokenIds: [1],
        metadata: [
          {
            hairStyle: 1,
            facialHair: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            chessPiece: 1,
            background: 0,
            element: 0,
          },
        ],
      },
      {
        tokenIds: [2, 3],
        metadata: [
          {
            hairStyle: 1,
            facialHair: 1,
            expression: 1,
            tattoo: 1,
            outfit: 1,
            material: 1,
            chessPiece: 1,
            background: 0,
            element: 0,
          },
          {
            hairStyle: 2,
            facialHair: 2,
            expression: 2,
            tattoo: 2,
            outfit: 2,
            material: 2,
            chessPiece: 2,
            background: 0,
            element: 0,
          },
        ],
      },
    ];

    this.leaves = this.whitelist.map((item) =>
      ethers.solidityPacked(
        ['uint256[]', 'bytes'],
        [
          item.tokenIds,
          ethers.AbiCoder.defaultAbiCoder().encode(
            [
              `tuple(
                uint256 hairStyle,
                uint256 facialHair,
                uint256 expression,
                uint256 tattoo,
                uint256 outfit,
                uint256 material,
                uint256 chessPiece,
                uint256 background,
                uint256 element
              )[]`,
            ],
            [item.metadata],
          ),
        ],
      ),
    );

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      tokenIds: this.whitelist[index].tokenIds,
      metadata: this.whitelist[index].metadata,
    }));

    this.ethernalsMetadataContract = await deployContract('EthernalsMetadataMock');

    this.contract = await deployContract('EthernalsMetadataSetter', this.ethernalsMetadataContract, this.root);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with "InvalidEthernalsMetadata" if metadataSetter is zero address', async function () {
      await expect(deployContract('EthernalsMetadataSetter', ethers.ZeroAddress, this.root)).to.revertedWithCustomError(
        this.contract,
        'InvalidEthernalsMetadata',
      );
    });

    it('reverts with "InvalidMetadataMerkleRoot" if metadataSetter is zero address', async function () {
      await expect(deployContract('EthernalsMetadataSetter', this.ethernalsMetadataContract, ethers.ZeroHash)).to.revertedWithCustomError(
        this.contract,
        'InvalidMetadataMerkleRoot',
      );
    });

    context('when successful', function () {
      it('sets the ethernals metadata address', async function () {
        expect(await this.contract.ETHERNALS_METADATA()).to.equal(this.ethernalsMetadataContract);
      });
    });
  });

  // describe('setMetadata(uint256[] calldata tokenIds, Metadata[] calldata metadata)', function () {
  //   it('reverts with "MetadataSetterOnly" if msg.sender is not metadata setter', async function () {
  //     await expect(this.contract.setMetadata([], [])).to.revertedWithCustomError(this.contract, 'MetadataSetterOnly');
  //   });

  //   context('when successful', function () {
  //     it('sets the metadata', async function () {
  //       const contract = await deployContract('EthernalsMetadata', deployer);
  //       const tokenIds = [1, 2];
  //       const metadata = [
  //         {
  //           hairStyle: 1,
  //           expression: 2,
  //           tattoo: 3,
  //           outfit: 4,
  //           material: 5,
  //           chessPiece: 6,
  //           background: 7,
  //           element: 8,
  //         },
  //         {
  //           hairStyle: 9,
  //           expression: 10,
  //           tattoo: 11,
  //           outfit: 12,
  //           material: 13,
  //           chessPiece: 14,
  //           background: 15,
  //           element: 16,
  //         },
  //       ];

  //       await contract.setMetadata(tokenIds, metadata);

  //       const metadata0 = await contract.tokenIdMetadata(tokenIds[0]);
  //       expect(metadata0[0]).to.equal(metadata[0].hairStyle);
  //       expect(metadata0[1]).to.equal(metadata[0].expression);
  //       expect(metadata0[2]).to.equal(metadata[0].tattoo);
  //       expect(metadata0[3]).to.equal(metadata[0].outfit);
  //       expect(metadata0[4]).to.equal(metadata[0].material);
  //       expect(metadata0[6]).to.equal(metadata[0].chessPiece);
  //       expect(metadata0[7]).to.equal(metadata[0].background);
  //       expect(metadata0[8]).to.equal(metadata[0].element);

  //       const metadata1 = await contract.tokenIdMetadata(tokenIds[1]);
  //       expect(metadata1[0]).to.equal(metadata[1].hairStyle);
  //       expect(metadata1[1]).to.equal(metadata[1].expression);
  //       expect(metadata1[2]).to.equal(metadata[1].tattoo);
  //       expect(metadata1[3]).to.equal(metadata[1].outfit);
  //       expect(metadata1[4]).to.equal(metadata[1].material);
  //       expect(metadata1[6]).to.equal(metadata[1].chessPiece);
  //       expect(metadata1[7]).to.equal(metadata[1].background);
  //       expect(metadata1[8]).to.equal(metadata[1].element);
  //     });
  //   });
  // });
});
