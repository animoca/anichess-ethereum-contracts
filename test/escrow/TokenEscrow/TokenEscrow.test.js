const {ethers} = require('hardhat');
const {deployOrbMockFixture} = require('../../helper');
const {faker} = require('@faker-js/faker');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {supportsInterfaces} = require('@animoca/ethereum-contracts/test/contracts/introspection/behaviors/SupportsInterface.behavior');
const {beforeEach, before} = require('mocha');

describe('TokenEscrow', function () {
  let accounts, deployer, user, user2, user3, user4;

  const fixture = async function () {
    [deployer] = await ethers.getSigners();
    this.orbMock = await deployOrbMockFixture();

    // loop through minters and grant them the minter role
    const minters = [deployer.address];
    const MINTER_ROLE = await this.orbMock.MINTER_ROLE();
    for (const minter of minters) {
      await this.orbMock.grantRole(MINTER_ROLE, minter);
    }

    // deploy meta transaction related contracts
    const ForwarderRegistry = await ethers.getContractFactory('MockForwarderRegistry');
    this.forwarderRegistry = await ForwarderRegistry.deploy();
    await this.forwarderRegistry.deployed();

    const Forwarder = await ethers.getContractFactory('MockForwarder');
    this.forwarder = await Forwarder.deploy();
    await this.forwarder.deployed();

    const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
    const tokenEscrow = await TokenEscrow.deploy(this.forwarderRegistry.address, this.orbMock.address);
    await tokenEscrow.deployed();
    this.contract = tokenEscrow;
  };

  before(async function () {
    accounts = await ethers.getSigners();
    [deployer, user, user2, user3, user4] = accounts;
  });

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('should revert if the inventory address is zero address', async function () {
      // Arrange
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');

      // Act
      const deploy = TokenEscrow.deploy(this.forwarderRegistry.address, ethers.constants.AddressZero);

      // Assert
      await expect(deploy).to.be.revertedWithCustomError(TokenEscrow, 'InvalidInventory');
    });
    it('should set the inventory address', async function () {
      expect(await this.contract.TOKEN_INVENTORY()).to.equal(this.orbMock.address);
    });
    it('should deploy with the correct owner', async function () {
      expect(await this.contract.owner()).to.equal(deployer.address);
    });
  });

  describe('onERC1155Received', function () {
    it('should revert if the caller is not the inventory contract', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const onERC1155Received = this.contract.onERC1155Received(user.address, user.address, tokenId, amount, '0x');

      // Assert
      await expect(onERC1155Received).to.be.revertedWithCustomError(this.contract, 'InvalidInventory');
    });
    it('should receive ERC1155 token', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);

      // Assert
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter).to.equal(balanceBefore + amount);
    });
    it('should increment the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);

      // Assert
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter).to.equal(balanceBefore + amount);
    });
    it('should support receiving ERC1155 tokens from multiple users with the same tokenId', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      const amount_2 = 1;
      // mint tokens for user and user2
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user2.address, tokenId, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      await this.orbMock.connect(user2).safeTransferFrom(user2.address, this.contract.address, tokenId, amount_2, '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount + amount_2);
    });
    it('should support receiving ERC1155 tokens from multiple users with different tokenIds', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens for user and user2
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user2.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceBefore_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      await this.orbMock.connect(user2).safeTransferFrom(user2.address, this.contract.address, tokenId_2, amount_2, '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceAfter_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount);
      expect(balanceBefore_2).to.equal(0);
      expect(balanceAfter_2).to.equal(amount_2);
    });
    it('should revert if the updated amount is greater than 1', async function () {
      // Arrange
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
      this.contract = await TokenEscrow.deploy(this.forwarderRegistry.address, user.address);
      await this.contract.deployed();
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = faker.number.int({min: 2, max: 1000});
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const onERC1155Received = this.contract.connect(user).onERC1155Received(user.address, user.address, tokenId, amount, '0x');

      // Assert
      await expect(onERC1155Received).to.be.revertedWithCustomError(this.contract, 'InvalidAmount').withArgs(tokenId, amount);
    });
    it('should emit a DepositToken event through safeTransferFrom of ORB contract', async function () {
      // Arrange
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
      this.contract = await TokenEscrow.deploy(this.forwarderRegistry.address, user.address);
      await this.contract.deployed();
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const tx = this.contract.connect(user).onERC1155Received(user.address, user.address, tokenId, amount, '0x');

      // Assert
      await expect(tx).to.emit(this.contract, 'DepositToken').withArgs(user.address, tokenId);
    });
    it('should return the onERC1155Received function selector', async function () {
      // Arrange
      const Erc1155TokenReceiverMockCaller = await ethers.getContractFactory('ERC1155TokenReceiverMockCaller');
      const erc1155TokenReceiverMockCaller = await Erc1155TokenReceiverMockCaller.deploy();
      // deploy token escrow contract with the erc1155TokenReceiverMockCaller as the inventory
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
      this.contract = await TokenEscrow.deploy(this.forwarderRegistry.address, erc1155TokenReceiverMockCaller.address);
      await this.contract.deployed();

      // Act
      await erc1155TokenReceiverMockCaller.testOnERC1155Received(this.contract.address, deployer.address, 1, 1, '0x');

      // Assert
      expect(await erc1155TokenReceiverMockCaller.onERC1155ReceivedResult()).to.equal('0xf23a6e61');
    });
  });

  describe('onERC1155BatchReceived', function () {
    it('should revert if the caller is not the inventory contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const onERC1155BatchReceived = this.contract
        .connect(user)
        .onERC1155BatchReceived(user.address, user.address, [tokenId, tokenId_2], [amount, amount_2], '0x');

      // Assert
      await expect(onERC1155BatchReceived).to.be.revertedWithCustomError(this.contract, 'InvalidInventory');
    });
    it('should receive ERC1155 tokens', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceBefore_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId, tokenId_2], [amount, amount_2], '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceAfter_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);

      // Assert
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter).to.equal(balanceBefore + amount);
      expect(balanceAfter_2).to.be.gt(balanceBefore_2);
      expect(balanceAfter_2).to.equal(balanceBefore_2 + amount_2);
    });
    it('should increment the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceBefore_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId, tokenId_2], [amount, amount_2], '0x');
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceAfter_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);

      // Assert
      expect(balanceAfter).to.be.gt(balanceBefore);
      expect(balanceAfter).to.equal(balanceBefore + amount);
      expect(balanceAfter_2).to.be.gt(balanceBefore_2);
      expect(balanceAfter_2).to.equal(balanceBefore_2 + amount_2);
    });
    it('should support receiving ERC1155 tokens from multiple users with the same tokenId', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      const amount_2 = 1;
      // mint tokens for user and user2
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user2.address, tokenId, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [amount], '0x');
      await this.orbMock.connect(user2).safeBatchTransferFrom(user2.address, this.contract.address, [tokenId], [amount_2], '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount + amount_2);
    });
    it('should support receiving ERC1155 tokens from multiple users with different tokenIds', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens for user and user2
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user2.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceBefore_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [amount], '0x');
      await this.orbMock.connect(user2).safeBatchTransferFrom(user2.address, this.contract.address, [tokenId_2], [amount_2], '0x');
      const balanceAfter = await this.orbMock.balanceOf(this.contract.address, tokenId);
      const balanceAfter_2 = await this.orbMock.balanceOf(this.contract.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount);
      expect(balanceBefore_2).to.equal(0);
      expect(balanceAfter_2).to.equal(amount_2);
    });
    it('should emit a DepositToken event through safeBatchTransferFrom of ORB contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;

      // mint tokens for user
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const tx = await this.orbMock
        .connect(user)
        .safeBatchTransferFrom(user.address, this.contract.address, [tokenId, tokenId_2], [amount, amount_2], '0x');

      // Assert
      await expect(tx)
        .to.emit(this.contract, 'DepositToken')
        .withArgs(user.address, tokenId)
        .to.emit(this.contract, 'DepositToken')
        .withArgs(user.address, tokenId_2);
      await expect(tx)
        .to.emit(this.orbMock, 'TransferBatch')
        .withArgs(user.address, user.address, this.contract.address, [tokenId, tokenId_2], [amount, amount_2]);
    });
    it('should revert if any of the cumulated updated amount exceed 1', async function () {
      // Arrange
      const tokenId = 1;
      // mint tokens for user
      await this.orbMock.safeMint(user.address, tokenId, 2, '0x');

      // Act
      const tx = this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId, tokenId], [1, 1], '0x');

      // Assert
      await expect(tx).to.be.revertedWithCustomError(this.contract, 'InvalidAmount').withArgs(tokenId, 2);
    });
    it('should revert if any of the updated amounts is greater than 1', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = faker.number.int({min: 2, max: 1000});
      const amount_2 = 1;
      // deploy token escrow contract with the user as the inventory
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
      this.contract = await TokenEscrow.deploy(this.forwarderRegistry.address, user.address);
      await this.contract.deployed();
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const onERC1155BatchReceived = this.contract
        .connect(user)
        .onERC1155BatchReceived(user.address, user.address, [tokenId, tokenId_2], [amount, amount_2], '0x');

      // Assert
      await expect(onERC1155BatchReceived).to.be.revertedWithCustomError(this.contract, 'InvalidAmount').withArgs(tokenId, amount);
    });
    it('should return the onERC1155BatchReceived function selector', async function () {
      // Arrange
      const Erc1155TokenReceiverMockCaller = await ethers.getContractFactory('ERC1155TokenReceiverMockCaller');
      const erc1155TokenReceiverMockCaller = await Erc1155TokenReceiverMockCaller.deploy();
      // deploy token escrow contract with the erc1155TokenReceiverMockCaller as the inventory
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');
      this.contract = await TokenEscrow.deploy(this.forwarderRegistry.address, erc1155TokenReceiverMockCaller.address);
      await this.contract.deployed();

      // Act
      await erc1155TokenReceiverMockCaller.testOnERC1155BatchReceived(this.contract.address, deployer.address, [1, 2], [1, 1], '0x');

      // Assert
      expect(await erc1155TokenReceiverMockCaller.onERC1155BatchReceivedResult()).to.equal('0xbc197c81');
    });
  });

  describe('deposit', function () {
    it('should revert if the length of the tokenIds and amounts arrays are not equal', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = faker.number.int({min: 1, max: 1000});

      // Act
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      // set approval
      const deposit = this.contract.connect(user).deposit([tokenId], [amount, amount]);

      // Assert
      await expect(deposit).to.be.revertedWith('ERC1155: inconsistent arrays');
    });
    it('should transfer ERC1155 tokens from the caller to the escrow contract', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(user.address, tokenId);
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      await this.contract.connect(user).deposit([tokenId], [amount]);
      const balanceAfter = await this.orbMock.balanceOf(user.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(amount);
      expect(balanceAfter).to.equal(0);
    });
    it('should increment the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      await this.contract.connect(user).deposit([tokenId], [amount]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount);
    });
    it('should support depositing ERC1155 tokens in multiple tokenIds', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceBefore_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      await this.contract.connect(user).deposit([tokenId, tokenId_2], [amount, amount_2]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceAfter_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(amount);
      expect(balanceBefore_2).to.equal(0);
      expect(balanceAfter_2).to.equal(amount_2);
    });
    it('should emit DepositToken events', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;

      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      const tx = await this.contract.connect(user).deposit([tokenId, tokenId_2], [amount, amount_2]);

      // Assert
      await expect(tx)
        .to.emit(this.contract, 'DepositToken')
        .withArgs(user.address, tokenId)
        .to.emit(this.contract, 'DepositToken')
        .withArgs(user.address, tokenId_2);
    });
  });

  describe('withdraw', function () {
    it('should revert if the length of the tokenIds and amounts arrays are not equal', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = faker.number.int({min: 1, max: 1000});

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId], [amount, amount]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InvalidInputParams');
    });
    it('should revert if the escrowed balance of the caller is less than the amount to withdraw', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = faker.number.int({min: 1001, max: 2000});

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId], [amount]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InsufficientBalance');
    });
    it('should decrement the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const amount = 1;
      const withdrawAmount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      await this.contract.connect(user).withdraw([tokenId], [withdrawAmount]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(amount);
      expect(balanceAfter).to.equal(amount - withdrawAmount);
    });
    it('should support withdrawing ERC1155 tokens with different tokenIds and quantities', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      const withdrawAmount = 1;
      const withdrawAmount_2 = 0;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceBefore_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);
      await this.contract.connect(user).withdraw([tokenId, tokenId_2], [withdrawAmount, withdrawAmount_2]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceAfter_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(amount);
      expect(balanceAfter).to.equal(amount - withdrawAmount);
      expect(balanceBefore_2).to.equal(amount_2);
      expect(balanceAfter_2).to.equal(amount_2 - withdrawAmount_2);
    });
    it('should revert if the cumulated withdrawal amount exceed the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = faker.number.int({min: 1, max: 1000});
      const totalAmount = 1;
      const withdrawAmount = 1;
      const withdrawAmount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, totalAmount, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, totalAmount, '0x');

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId, tokenId], [withdrawAmount, withdrawAmount_2]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InsufficientBalance');
    });
    it('should emit WithdrawToken events', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      const withdrawAmount = 1;
      const withdrawAmount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId_2, amount_2, '0x');

      // Act
      const tx = await this.contract.connect(user).withdraw([tokenId, tokenId_2], [withdrawAmount, withdrawAmount_2]);

      // Assert
      await expect(tx)
        .to.emit(this.contract, 'WithdrawToken')
        .withArgs(user.address, tokenId)
        .to.emit(this.contract, 'WithdrawToken')
        .withArgs(user.address, tokenId_2);
      await expect(tx)
        .to.emit(this.orbMock, 'TransferBatch')
        .withArgs(this.contract.address, this.contract.address, user.address, [tokenId, tokenId_2], [withdrawAmount, withdrawAmount_2]);
    });
    it('should transfer ERC1155 tokens to the caller from the escrow contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = faker.helpers.uniqueArray(() => faker.number.int({min: 1, max: 1000}), 2);
      const amount = 1;
      const amount_2 = 1;
      const withdrawAmount = 1;
      const withdrawAmount_2 = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId, amount, '0x');
      await this.orbMock.connect(user).safeTransferFrom(user.address, this.contract.address, tokenId_2, amount_2, '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(user.address, tokenId);
      const balanceBefore_2 = await this.orbMock.balanceOf(user.address, tokenId_2);
      await this.contract.connect(user).withdraw([tokenId, tokenId_2], [withdrawAmount, withdrawAmount_2]);
      const balanceAfter = await this.orbMock.balanceOf(user.address, tokenId);
      const balanceAfter_2 = await this.orbMock.balanceOf(user.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(withdrawAmount);
      expect(balanceBefore_2).to.equal(0);
      expect(balanceAfter_2).to.equal(withdrawAmount_2);
    });
  });

  describe('behaveLikeForwarderRegistryContext', () => {
    describe('forwarderRegistry()', function () {
      it('returns the address of the ForwarderRegistry', async function () {
        expect(await this.contract.forwarderRegistry()).to.equal(this.forwarderRegistry.address);
      });
    });
  });

  describe('behaviors', function () {
    supportsInterfaces(['IERC165', 'IERC1155TokenReceiver', 'IERC173']);
  });
});
