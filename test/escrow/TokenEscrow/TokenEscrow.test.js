const {ethers} = require('hardhat');
const {deployOrbMockFixture} = require('../../helper');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {supportsInterfaces} = require('@animoca/ethereum-contracts/test/contracts/introspection/behaviors/SupportsInterface.behavior');
const {beforeEach, before} = require('mocha');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('TokenEscrow', function () {
  let accounts, deployer, relayer, user, user2, user3, user4;

  const fixture = async function () {
    [deployer] = await ethers.getSigners();
    this.orbMock = await deployOrbMockFixture();

    // loop through minters and grant them the minter role
    const minters = [deployer.address];
    const MINTER_ROLE = await this.orbMock.MINTER_ROLE();
    for (const minter of minters) {
      await this.orbMock.grantRole(MINTER_ROLE, minter);
    }

    const TokenEscrow = await ethers.getContractFactory('TokenEscrowMock');
    const tokenEscrow = await TokenEscrow.deploy(await getForwarderRegistryAddress(), this.orbMock.address);
    await tokenEscrow.deployed();
    this.contract = tokenEscrow;
  };

  before(async function () {
    accounts = await ethers.getSigners();
    [deployer, relayer, user, user2, user3, user4] = accounts;
  });

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('should revert if the inventory address is zero address', async function () {
      // Arrange
      const TokenEscrow = await ethers.getContractFactory('TokenEscrow');

      // Act
      const deploy = TokenEscrow.deploy(await getForwarderRegistryAddress(), ethers.constants.AddressZero);

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

  describe('balanceOf', function () {
    it('should return the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [amount], '0x');

      // Act
      const balance = await this.contract.balanceOf(user.address, tokenId);

      // Assert
      expect(balance).to.equal(amount);
    });
    it('should return 0 if the tokenId is not escrowed', async function () {
      // Arrange
      const tokenId = 1;

      // Act
      const balance = await this.contract.balanceOf(user.address, tokenId);

      // Assert
      expect(balance).to.equal(0);
    });
  });

  describe('deposit', function () {
    it('should revert if the length of the tokenIds and amounts arrays are not equal', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;

      // Act
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      // set approval
      const deposit = this.contract.connect(user).deposit([tokenId], [amount, amount]);

      // Assert
      await expect(deposit).to.be.revertedWith('ERC1155: inconsistent arrays');
    });
    it('should transfer ERC1155 tokens from the caller to the escrow contract', async function () {
      // Arrange
      const tokenId = 1;
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
      const [tokenId, tokenId_2] = [1, 2];
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
    it('should emit DepositTokens events', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
      const amount = 1;
      const amount_2 = 1;

      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, amount_2, '0x');

      // Act
      await this.orbMock.connect(user).setApprovalForAll(this.contract.address, true);
      const tx = await this.contract.connect(user).deposit([tokenId, tokenId_2], [amount, amount_2]);

      // Assert
      await expect(tx).to.emit(this.contract, 'DepositTokens').withArgs(user.address, [tokenId, tokenId_2], [1, 1]);
    });
  });

  describe('withdraw', function () {
    it('should revert if the length of the tokenIds and amounts arrays are not equal', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId], [amount, amount]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InconsistentArrays');
    });
    it('should revert if the escrowed balance of the caller is less than the amount to withdraw', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId], [amount]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InsufficientBalance').withArgs(tokenId, 0);
    });
    it('should decrement the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, 1, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [1], '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      await this.contract.connect(user).withdraw([tokenId], [1]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);

      // Assert
      expect(balanceBefore).to.equal(1);
      expect(balanceAfter).to.equal(0);
    });
    it('should support withdrawing ERC1155 tokens with different tokenIds', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, 1, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, 1, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [1], '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId_2], [1], '0x');

      // Act
      const balanceBefore = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceBefore_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);
      await this.contract.connect(user).withdraw([tokenId, tokenId_2], [1, 1]);
      const balanceAfter = await this.contract.escrowedNFTs(user.address, tokenId);
      const balanceAfter_2 = await this.contract.escrowedNFTs(user.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(1);
      expect(balanceAfter).to.equal(0);
      expect(balanceBefore_2).to.equal(1);
      expect(balanceAfter_2).to.equal(0);
    });
    it('should revert if the cumulated withdrawal amount exceed the balance of the escrowedToken for the tokenId', async function () {
      // Arrange
      const tokenId = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, 1, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [1], '0x');

      // Act
      const withdraw = this.contract.connect(user).withdraw([tokenId, tokenId], [1, 1]);

      // Assert
      await expect(withdraw).to.be.revertedWithCustomError(this.contract, 'InsufficientBalance').withArgs(tokenId, 0);
    });
    it('should emit a WithdrawTokens events', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, 1, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, 1, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [1], '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId_2], [1], '0x');

      // Act
      const tx = await this.contract.connect(user).withdraw([tokenId, tokenId_2], [1, 1]);

      // Assert
      await expect(tx).to.emit(this.contract, 'WithdrawTokens').withArgs(user.address, [tokenId, tokenId_2], [1, 1]);
      await expect(tx)
        .to.emit(this.orbMock, 'TransferBatch')
        .withArgs(this.contract.address, this.contract.address, user.address, [tokenId, tokenId_2], [1, 1]);
    });
    it('should transfer ERC1155 tokens to the caller from the escrow contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];

      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, 1, '0x');
      await this.orbMock.safeMint(user.address, tokenId_2, 1, '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [1], '0x');
      await this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId_2], [1], '0x');

      // Act
      const balanceBefore = await this.orbMock.balanceOf(user.address, tokenId);
      const balanceBefore_2 = await this.orbMock.balanceOf(user.address, tokenId_2);
      await this.contract.connect(user).withdraw([tokenId, tokenId_2], [1, 1]);
      const balanceAfter = await this.orbMock.balanceOf(user.address, tokenId);
      const balanceAfter_2 = await this.orbMock.balanceOf(user.address, tokenId_2);

      // Assert
      expect(balanceBefore).to.equal(0);
      expect(balanceAfter).to.equal(1);
      expect(balanceBefore_2).to.equal(0);
      expect(balanceAfter_2).to.equal(1);
    });
  });

  describe('onERC1155Received', function () {
    it('should revert if the method is being triggered', async function () {
      // Arrange
      const tokenId = 1;
      const amount = 1;
      // mint tokens
      await this.orbMock.safeMint(user.address, tokenId, amount, '0x');

      // Act
      const onERC1155Received = this.contract.onERC1155Received(user.address, user.address, tokenId, amount, '0x');

      // Assert
      await expect(onERC1155Received).to.be.revertedWithCustomError(this.contract, 'UnsupportedMethod');
    });
  });

  describe('onERC1155BatchReceived', function () {
    it('should revert if the caller is not the inventory contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
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
    it('should revert if any of the updated amount greater than 1', async function () {
      // Arrange
      const tokenId = 1;
      // mint tokens for user
      await this.orbMock.safeMint(user.address, tokenId, 2, '0x');

      // Act
      const tx = this.orbMock.connect(user).safeBatchTransferFrom(user.address, this.contract.address, [tokenId], [2], '0x');

      // Assert
      await expect(tx).to.be.revertedWithCustomError(this.contract, 'BalanceExceeded').withArgs(tokenId, 2);
    });
    it('should receive ERC1155 tokens', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
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
      const [tokenId, tokenId_2] = [1, 2];
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
      const tokenId = 1;
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
      const [tokenId, tokenId_2] = [1, 2];
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
    it('should emit a DepositTokens event through safeBatchTransferFrom of ORB contract', async function () {
      // Arrange
      const [tokenId, tokenId_2] = [1, 2];
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
      await expect(tx).to.emit(this.contract, 'DepositTokens').withArgs(user.address, [tokenId, tokenId_2], [1, 1]);
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
      await expect(tx).to.be.revertedWithCustomError(this.contract, 'BalanceExceeded').withArgs(tokenId, 2);
    });
  });

  describe('msgData', function () {
    it('should return the msgData', async function () {
      await this.contract.msgData();
    });
  });

  describe('behaveLikeForwarderRegistryContext', function () {
    describe('forwarderRegistry()', function () {
      it('returns the address of the ForwarderRegistry', async function () {
        expect(await this.contract.forwarderRegistry()).to.equal(await getForwarderRegistryAddress());
      });
    });
  });

  describe('behaviors', function () {
    supportsInterfaces(['IERC165', 'IERC1155TokenReceiver', 'IERC173']);
  });
});
