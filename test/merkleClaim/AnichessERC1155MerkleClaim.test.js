const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getOperatorFilterRegistryAddress, getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

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

    this.elements = [
      {
        recipient: claimer1.address,
        tokenIds: [1],
        amounts: [1],
      },
      {
        recipient: claimer2.address,
        tokenIds: [2],
        amounts: [2],
      },
      {
        recipient: claimer3.address,
        tokenIds: [3],
        amounts: [3],
      },
      {
        recipient: claimer4.address,
        tokenIds: [4],
        amounts: [4],
      },
    ];
    this.leaves = this.elements.map((el) =>
      ethers.utils.solidityPack(['address', 'uint256[]', 'uint256[]', 'bytes32'], [el.recipient, el.tokenIds, el.amounts, this.epochId])
    );

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();

    this.leaves.forEach((leaf, index) => (this.elements[index].proof = this.tree.getHexProof(keccak256(leaf))));
    this.elements.forEach(
      (el) =>
        (el.data = ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'bytes32[]', 'address', 'uint256[]', 'uint256[]'],
          [this.epochId, el.proof, el.recipient, el.tokenIds, el.amounts]
        ))
    );

    this.contract = await deployContract('AnichessERC1155MerkleClaim', this.root, rewardsContractAddress, forwarderRegistryAddress);
    await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), this.contract.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  context('constructor', function () {
    it('sets the merkle root', async function () {
      // Arrange

      // Act

      // Assert
      expect(await this.contract.MERKLE_ROOT()).to.equal(this.root);
    });
    it('sets the rewards contract', async function () {
      // Arrange

      // Act

      // Assert
      expect(await this.contract.REWARD_CONTRACT()).to.equal(this.rewardContract.address);
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

  context('claim(bytes calldata data)', function () {
    it('reverts with AlreadyClaimed if the leaf is claimed twice', async function () {
      // Arrange
      await this.contract.connect(claimer1).claim(this.elements[0].data);

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.elements[0].data))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(this.elements[0].recipient, this.elements[0].tokenIds, this.elements[0].amounts, this.epochId);
    });
    it('reverts with InvalidProof if the proof can not be verified', async function () {
      // Arrange
      const data = ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'bytes32[]', 'address', 'uint256[]', 'uint256[]'],
        [this.epochId, this.elements[1].proof, this.elements[0].recipient, this.elements[0].tokenIds, this.elements[0].amounts]
      );

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(data))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(this.elements[0].recipient, this.elements[0].tokenIds, this.elements[0].amounts, this.epochId);
    });
    it('emits a PayoutClaimed event', async function () {
      // Arrange

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.elements[0].data))
        .to.emit(this.contract, 'PayoutClaimed')
        .withArgs(this.epochId, this.elements[0].recipient, this.elements[0].tokenIds, this.elements[0].amounts);
    });
    it('emit TransferBatch event', async function () {
      // Arrange

      // Act

      // Assert
      await expect(this.contract.connect(claimer1).claim(this.elements[0].data))
        .to.emit(this.rewardContract, 'TransferBatch')
        .withArgs(
          await this.contract.address,
          ethers.constants.AddressZero,
          this.elements[0].recipient,
          this.elements[0].tokenIds,
          this.elements[0].amounts
        );
    });
    it('mints the reward', async function () {
      // Arrange
      await this.contract.connect(claimer1).claim(this.elements[0].data);

      // Act

      // Assert
      await expect(this.rewardContract.balanceOf(this.elements[0].recipient, this.elements[0].tokenIds[0])).to.eventually.equal(
        this.elements[0].amounts[0]
      );
    });

    it('Should update the claim status', async function () {
      // Arrange
      // Act
      const before = await this.contract.claimStatus(keccak256(this.leaves[0]));
      await this.contract.connect(claimer1).claim(this.elements[0].data);
      const after = await this.contract.claimStatus(keccak256(this.leaves[0]));

      // Assert
      expect(before).to.equal(false);
      expect(after).to.equal(true);
    });

    it('can claim for another wallet', async function () {
      // Arrange
      await this.contract.connect(claimer1).claim(this.elements[1].data);

      // Act

      // Assert
      await expect(this.rewardContract.balanceOf(this.elements[1].recipient, this.elements[1].tokenIds[0])).to.eventually.equal(
        this.elements[1].amounts[0]
      );
    });
  });
});
