const {ethers} = require('hardhat');
const {expect} = require('chai');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('Shop', function () {
  let deployer, operator, buyer, other, treasury;

  before(async function () {
    [deployer, operator, buyer, other, treasury] = await ethers.getSigners();
  });

  const fixture = async function () {
    const forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.points = await deployContract('PointsV2', forwarderRegistryAddress);
    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), await deployer.getAddress());
    await this.points.deposit(await buyer.getAddress(), 1000000, ethers.ZeroHash);
    this.erc20 = await deployContract(
      'ERC20FixedSupply',
      'ERC20Token',
      'ERC20',
      18,
      [await buyer.getAddress()],
      [ethers.parseEther('1000000')],
      forwarderRegistryAddress,
    );
    this.contract = await deployContract('Shop', await this.points.getAddress(), await treasury.getAddress());
    await this.contract.grantRole(await this.contract.OPERATOR_ROLE(), await operator.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor(address,address)', function () {
    context('when successful', function () {
      it('sets the Points address', async function () {
        expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
      });
      it('sets the payout wallet address', async function () {
        expect(await this.contract.payoutWallet()).to.equal(await treasury.getAddress());
      });
    });
  });

  describe('addItem(bytes32,uint256,uint256,address,uint256,bool)', function () {
    const sku = ethers.solidityPackedKeccak256(['string'], ['TEST_ITEM']);

    it('reverts if not called by an operator', async function () {
      await expect(this.contract.connect(other).addItem(sku, 1, 1, ethers.ZeroAddress, 1, true))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.OPERATOR_ROLE(), other.address);
    });

    it('reverts if the SKU is the zero hash', async function () {
      await expect(this.contract.connect(operator).addItem(ethers.ZeroHash, 1, 0, ethers.ZeroAddress, 1, true)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSKU',
      );
    });

    it('reverts if both prices are zero', async function () {
      await expect(this.contract.connect(operator).addItem(sku, 0, 0, ethers.ZeroAddress, 1, true)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidPrice',
      );
    });

    it('reverts if the erc20 price is not zero and the erc20 address is the zero address', async function () {
      await expect(this.contract.connect(operator).addItem(sku, 0, 1, ethers.ZeroAddress, 1, true)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidERC20Token',
      );
    });

    it('reverts if the item already exists', async function () {
      await this.contract.connect(operator).addItem(sku, 1, 0, ethers.ZeroAddress, 1, true);
      await expect(this.contract.connect(operator).addItem(sku, 1, 0, ethers.ZeroAddress, 1, true))
        .to.be.revertedWithCustomError(this.contract, 'ItemAlreadyExists')
        .withArgs(sku);
    });

    context('when successful (with both Points and ERC20 prices)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(operator).addItem(sku, 10, 20, await this.erc20.getAddress(), 5, true);
      });

      it('creates the item', async function () {
        const item = await this.contract.items(sku);
        expect(item.pointsPrice).to.equal(10);
        expect(item.erc20Price).to.equal(20);
        expect(item.erc20Token).to.equal(await this.erc20.getAddress());
        expect(item.maxPerUser).to.equal(5);
        expect(item.sold).to.equal(0);
        expect(item.active).to.be.true;
      });

      it('emits an ItemAdded event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemAdded')
          .withArgs(sku, 10, 20, await this.erc20.getAddress(), 5, true);
      });
    });

    context('when successful (with only a Points price)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(operator).addItem(sku, 10, 0, ethers.ZeroAddress, 5, true);
      });

      it('creates the item', async function () {
        const item = await this.contract.items(sku);
        expect(item.pointsPrice).to.equal(10);
        expect(item.erc20Price).to.equal(0);
        expect(item.erc20Token).to.equal(ethers.ZeroAddress);
        expect(item.maxPerUser).to.equal(5);
        expect(item.sold).to.equal(0);
        expect(item.active).to.be.true;
      });

      it('emits an ItemAdded event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ItemAdded').withArgs(sku, 10, 0, ethers.ZeroAddress, 5, true);
      });
    });

    context('when successful (with only an ERC20 price)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(operator).addItem(sku, 0, 20, await this.erc20.getAddress(), 5, true);
      });

      it('creates the item', async function () {
        const item = await this.contract.items(sku);
        expect(item.pointsPrice).to.equal(0);
        expect(item.erc20Price).to.equal(20);
        expect(item.erc20Token).to.equal(await this.erc20.getAddress());
        expect(item.maxPerUser).to.equal(5);
        expect(item.sold).to.equal(0);
        expect(item.active).to.be.true;
      });

      it('emits an ItemAdded event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemAdded')
          .withArgs(sku, 0, 20, await this.erc20.getAddress(), 5, true);
      });
    });
  });

  describe('setItemActiveStatus(bytes32,bool)', function () {
    const sku = ethers.solidityPackedKeccak256(['string'], ['TEST_ITEM']);

    beforeEach(async function () {
      await this.contract.connect(operator).addItem(sku, 10, 0, ethers.ZeroAddress, 5, true);
    });

    it('reverts if not called by an operator', async function () {
      await expect(this.contract.connect(other).setItemActiveStatus(sku, false))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.OPERATOR_ROLE(), other.address);
    });

    it('reverts if the item does not exist', async function () {
      const invalidSku = ethers.solidityPackedKeccak256(['string'], ['INVALID_ITEM']);
      await expect(this.contract.connect(operator).setItemActiveStatus(invalidSku, false))
        .to.be.revertedWithCustomError(this.contract, 'ItemDoesNotExist')
        .withArgs(invalidSku);
    });

    context('when successful (setting active status to true)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(operator).setItemActiveStatus(sku, false);
      });
      it('updates the item active status', async function () {
        const item = await this.contract.items(sku);
        expect(item.active).to.be.false;
      });
      it('emits an ItemActiveStatusSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ItemActiveStatusSet').withArgs(sku, false);
      });
    });

    context('when successful (setting active status to false)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(operator).setItemActiveStatus(sku, true);
      });
      it('updates the item active status', async function () {
        const item = await this.contract.items(sku);
        expect(item.active).to.be.true;
      });
      it('emits an ItemActiveStatusSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ItemActiveStatusSet').withArgs(sku, true);
      });
    });
  });

  describe('purchase(bytes32,uint256,address)', function () {
    const sku = ethers.solidityPackedKeccak256(['string'], ['TEST_ITEM']);

    it('reverts if the contract is paused', async function () {
      await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
      await expect(this.contract.connect(buyer).purchase(sku, 1, await buyer.getAddress())).to.be.revertedWithCustomError(this.contract, 'Paused');
    });

    it('reverts if the purchase quantity is zero', async function () {
      await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
      await this.contract.connect(deployer).unpause();
      await expect(this.contract.connect(buyer).purchase(sku, 0, await buyer.getAddress())).to.be.revertedWithCustomError(
        this.contract,
        'InvalidQuantity',
      );
    });

    it('reverts if the item does not exist', async function () {
      await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
      const invalidSku = ethers.solidityPackedKeccak256(['string'], ['INVALID_ITEM']);
      await this.contract.connect(deployer).unpause();
      await expect(this.contract.connect(buyer).purchase(invalidSku, 1, await buyer.getAddress()))
        .to.be.revertedWithCustomError(this.contract, 'ItemDoesNotExist')
        .withArgs(invalidSku);
    });

    it('reverts if the item is not active', async function () {
      await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
      await this.contract.connect(operator).setItemActiveStatus(sku, false);
      await this.contract.connect(deployer).unpause();
      await expect(this.contract.connect(buyer).purchase(sku, 1, await buyer.getAddress()))
        .to.be.revertedWithCustomError(this.contract, 'ItemNotActive')
        .withArgs(sku);
    });

    it('reverts if the purchase exceeds the max per user limit', async function () {
      await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
      await this.contract.connect(deployer).unpause();
      await expect(this.contract.connect(buyer).purchase(sku, 6, await buyer.getAddress()))
        .to.be.revertedWithCustomError(this.contract, 'PurchaseLimitExceeded')
        .withArgs(sku, 5, 0, 6);
    });

    context('when successful, for an item with limited max per user', function () {
      beforeEach(async function () {
        await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 5, true);
        await this.contract.connect(deployer).unpause();
        await this.erc20.connect(buyer).approve(await this.contract.getAddress(), ethers.parseEther('1000000'));
        await this.points.connect(buyer).approve(await this.contract.getAddress(), 1000000);
        this.receipt = await this.contract.connect(buyer).purchase(sku, 2, await other.getAddress());
      });

      it('increments the sold count', async function () {
        const item = await this.contract.items(sku);
        expect(item.sold).to.equal(2);
      });

      it('updates the user purchase count', async function () {
        const purchaseCount = await this.contract.userPurchases(await buyer.getAddress(), sku);
        expect(purchaseCount).to.equal(2);
      });

      it('spends the Points from the buyer', async function () {
        await expect(this.receipt)
          .to.emit(this.points, 'Spent')
          .withArgs(await this.contract.getAddress(), await buyer.getAddress(), 20); // 10 * 2
      });

      it('transfers the ERC20 tokens from the buyer to the treasury', async function () {
        await expect(this.receipt)
          .to.emit(this.erc20, 'Transfer')
          .withArgs(await buyer.getAddress(), await treasury.getAddress(), ethers.parseEther('40')); // 20 * 2
      });

      it('emits an ItemPurchased event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemPurchased')
          .withArgs(sku, await buyer.getAddress(), 2, await other.getAddress());
      });
    });

    context('when successful, for an item with unlimited max per user', function () {
      beforeEach(async function () {
        await this.contract.connect(operator).addItem(sku, 10, ethers.parseEther('20'), await this.erc20.getAddress(), 0, true);
        await this.contract.connect(deployer).unpause();
        await this.erc20.connect(buyer).approve(await this.contract.getAddress(), ethers.parseEther('1000000'));
        await this.points.connect(buyer).approve(await this.contract.getAddress(), 1000000);
        this.receipt = await this.contract.connect(buyer).purchase(sku, 10, await other.getAddress());
      });

      it('increments the sold count', async function () {
        const item = await this.contract.items(sku);
        expect(item.sold).to.equal(10);
      });

      it('updates the user purchase count', async function () {
        const purchaseCount = await this.contract.userPurchases(await buyer.getAddress(), sku);
        expect(purchaseCount).to.equal(10);
      });

      it('spends the Points from the buyer', async function () {
        await expect(this.receipt)
          .to.emit(this.points, 'Spent')
          .withArgs(await this.contract.getAddress(), await buyer.getAddress(), 100); // 10 * 10
      });

      it('transfers the ERC20 tokens from the buyer to the treasury', async function () {
        await expect(this.receipt)
          .to.emit(this.erc20, 'Transfer')
          .withArgs(await buyer.getAddress(), await treasury.getAddress(), ethers.parseEther('200')); // 20 * 10
      });

      it('emits an ItemPurchased event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemPurchased')
          .withArgs(sku, await buyer.getAddress(), 10, await other.getAddress());
      });
    });

    context('when successful, for an item with only Points price', function () {
      beforeEach(async function () {
        await this.contract.connect(operator).addItem(sku, 15, 0, ethers.ZeroAddress, 0, true);
        await this.contract.connect(deployer).unpause();
        await this.points.connect(buyer).approve(await this.contract.getAddress(), 1000000);
        this.receipt = await this.contract.connect(buyer).purchase(sku, 3, await buyer.getAddress());
      });

      it('increments the sold count', async function () {
        const item = await this.contract.items(sku);
        expect(item.sold).to.equal(3);
      });

      it('updates the user purchase count', async function () {
        const purchaseCount = await this.contract.userPurchases(await buyer.getAddress(), sku);
        expect(purchaseCount).to.equal(3);
      });

      it('spends the Points from the buyer', async function () {
        await expect(this.receipt)
          .to.emit(this.points, 'Spent')
          .withArgs(await this.contract.getAddress(), await buyer.getAddress(), 45); // 15 * 3
      });

      it('emits an ItemPurchased event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemPurchased')
          .withArgs(sku, await buyer.getAddress(), 3, await buyer.getAddress());
      });
    });

    context('when successful, for an item with only ERC20 price', function () {
      beforeEach(async function () {
        await this.contract.connect(operator).addItem(sku, 0, ethers.parseEther('30'), await this.erc20.getAddress(), 0, true);
        await this.contract.connect(deployer).unpause();
        await this.erc20.connect(buyer).approve(await this.contract.getAddress(), ethers.parseEther('1000000'));
        this.receipt = await this.contract.connect(buyer).purchase(sku, 4, await other.getAddress());
      });

      it('increments the sold count', async function () {
        const item = await this.contract.items(sku);
        expect(item.sold).to.equal(4);
      });

      it('updates the user purchase count', async function () {
        const purchaseCount = await this.contract.userPurchases(await buyer.getAddress(), sku);
        expect(purchaseCount).to.equal(4);
      });

      it('transfers the ERC20 tokens from the buyer to the treasury', async function () {
        await expect(this.receipt)
          .to.emit(this.erc20, 'Transfer')
          .withArgs(await buyer.getAddress(), await treasury.getAddress(), ethers.parseEther('120')); // 30 * 4
      });

      it('emits an ItemPurchased event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'ItemPurchased')
          .withArgs(sku, await buyer.getAddress(), 4, await other.getAddress());
      });
    });
  });

  describe('getUserRemainingAllowance(bytes32,address)', function () {
    const sku = ethers.solidityPackedKeccak256(['string'], ['TEST_ITEM']);

    it('reverts if the item does not exist', async function () {
      const invalidSku = ethers.solidityPackedKeccak256(['string'], ['INVALID_ITEM']);
      await expect(this.contract.getUserRemainingAllowance(await buyer.getAddress(), invalidSku))
        .to.be.revertedWithCustomError(this.contract, 'ItemDoesNotExist')
        .withArgs(invalidSku);
    });

    it('returns type(uint256).max for an item with unlimited max per user', async function () {
      await this.contract.connect(operator).addItem(sku, 10, 0, ethers.ZeroAddress, 0, true);
      const allowance = await this.contract.getUserRemainingAllowance(await buyer.getAddress(), sku);
      expect(allowance).to.equal(ethers.MaxUint256);
    });

    it('returns the correct max per user for an item with limited max per user before any purchases', async function () {
      await this.contract.connect(operator).addItem(sku, 10, 0, ethers.ZeroAddress, 5, true);
      const allowance = await this.contract.getUserRemainingAllowance(await buyer.getAddress(), sku);
      expect(allowance).to.equal(5);
    });

    it('returns the correct remaining allowance after purchases', async function () {
      await this.contract.connect(operator).addItem(sku, 10, 0, ethers.ZeroAddress, 5, true);
      await this.contract.connect(deployer).unpause();
      await this.erc20.connect(buyer).approve(await this.contract.getAddress(), ethers.parseEther('1000000'));
      await this.points.connect(buyer).approve(await this.contract.getAddress(), 1000000);
      await this.contract.connect(buyer).purchase(sku, 2, await buyer.getAddress());
      const allowance = await this.contract.getUserRemainingAllowance(await buyer.getAddress(), sku);
      expect(allowance).to.equal(3);
    });
  });
});
