const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('EthernalsMetadata', function () {
  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.ethernalsMetadataSetterContract = await deployContract('EthernalsMetadataSetterMock');

    this.contract = await deployContract('EthernalsMetadata', this.ethernalsMetadataSetterContract);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts with "InvalidMetadataSetter" if metadataSetter is zero address', async function () {
      await expect(deployContract('EthernalsMetadata', ethers.ZeroAddress)).to.revertedWithCustomError(this.contract, 'InvalidMetadataSetter');
    });

    context('when successful', function () {
      it('sets the metadata setter', async function () {
        expect(await this.contract.METADATA_SETTER()).to.equal(this.ethernalsMetadataSetterContract);
      });
    });
  });

  describe('setMetadata(uint256[] calldata tokenIds, Metadata[] calldata metadata)', function () {
    it('reverts with "MetadataSetterOnly" if msg.sender is not metadata setter', async function () {
      await expect(this.contract.setMetadata([], [])).to.revertedWithCustomError(this.contract, 'MetadataSetterOnly');
    });

    context('when successful', function () {
      it('sets the metadata', async function () {
        const contract = await deployContract('EthernalsMetadata', deployer);
        const tokenIds = [1, 2];
        const metadata = [
          {
            hairStyle: 1,
            facialHair: 2,
            expression: 3,
            tattoo: 4,
            outfit: 5,
            material: 6,
            chessPiece: 7,
            background: 8,
            element: 9,
          },
          {
            hairStyle: 10,
            facialHair: 11,
            expression: 12,
            tattoo: 13,
            outfit: 14,
            material: 15,
            chessPiece: 16,
            background: 17,
            element: 18,
          },
        ];

        await contract.setMetadata(tokenIds, metadata);

        const metadata0 = await contract.tokenIdMetadata(tokenIds[0]);
        expect(metadata0[0]).to.equal(metadata[0].hairStyle);
        expect(metadata0[1]).to.equal(metadata[0].facialHair);
        expect(metadata0[2]).to.equal(metadata[0].expression);
        expect(metadata0[3]).to.equal(metadata[0].tattoo);
        expect(metadata0[4]).to.equal(metadata[0].outfit);
        expect(metadata0[5]).to.equal(metadata[0].material);
        expect(metadata0[6]).to.equal(metadata[0].chessPiece);
        expect(metadata0[7]).to.equal(metadata[0].background);
        expect(metadata0[8]).to.equal(metadata[0].element);

        const metadata1 = await contract.tokenIdMetadata(tokenIds[1]);
        expect(metadata1[0]).to.equal(metadata[1].hairStyle);
        expect(metadata1[1]).to.equal(metadata[1].facialHair);
        expect(metadata1[2]).to.equal(metadata[1].expression);
        expect(metadata1[3]).to.equal(metadata[1].tattoo);
        expect(metadata1[4]).to.equal(metadata[1].outfit);
        expect(metadata1[5]).to.equal(metadata[1].material);
        expect(metadata1[6]).to.equal(metadata[1].chessPiece);
        expect(metadata1[7]).to.equal(metadata[1].background);
        expect(metadata1[8]).to.equal(metadata[1].element);
      });
    });
  });
});
