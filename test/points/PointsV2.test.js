const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const keccak256 = require('keccak256');

describe('PointsV2', function () {
  before(async function () {
    [deployer, owner, admin, spender, depositor, user1, user2, user3, user4, user5, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.contract = await deployContract('PointsV2Mock', this.forwarderRegistryAddress);
    this.depositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';

    await this.contract.grantRole(await this.contract.ADMIN_ROLE(), admin.address);
    await this.contract.grantRole(await this.contract.DEPOSITOR_ROLE(), depositor.address);

    this.domain = {
      name: 'Points',
      version: '2.0',
      chainId: await getChainId(),
      verifyingContract: await this.contract.getAddress(),
    };

    this.consumeType = {
      Consume: [
        {name: 'holder', type: 'address'},
        {name: 'spender', type: 'address'},
        {name: 'amount', type: 'uint256'},
        {name: 'deadline', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
      ],
    };

    this.permitType = {
      Permit: [
        {name: 'holder', type: 'address'},
        {name: 'spender', type: 'address'},
        {name: 'amount', type: 'uint256'},
        {name: 'deadline', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
      ],
    };
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the forwarder registry address is 0', async function () {
      await expect(deployContract('PointsV2Mock', ethers.ZeroAddress)).to.be.revertedWithCustomError(this.contract, 'InvalidForwarderRegistry');
    });
  });

  describe('deposit(address holder, uint256 amount, bytes32 depositReasonCode)', function () {
    it('Reverts if the sender does not have Depositor role', async function () {
      await expect(this.contract.connect(other).deposit(user1.address, 100, this.depositReasonCode))
        .to.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.DEPOSITOR_ROLE(), other.address);
    });

    it('Reverts if deposit amount is zero', async function () {
      await expect(this.contract.connect(depositor).deposit(user1.address, 0, this.depositReasonCode)).to.revertedWithCustomError(
        this.contract,
        'DepositZeroAmount',
      );
    });

    context('when successful', function () {
      it('it should update to correct balance', async function () {
        const amount = 100;
        await this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode);
        const balance = await this.contract.balances(user1.address);
        expect(balance).equal(amount);
      });

      it('it should emit an Deposited event', async function () {
        const amount = 100;
        await expect(this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode))
          .to.emit(this.contract, 'Deposited')
          .withArgs(depositor.address, this.depositReasonCode, user1.address, amount);
      });
    });
  });

  describe('consume(address holder, uint256 amount, uint256 deadline, bytes calldata signature)', function () {
    it('Reverts if the deadline of the signature has passed', async function () {
      const holder = user1.address;
      const amount = 100;
      const deadline = 0;
      const nonce = 0;

      const signature = await user1.signTypedData(this.domain, this.consumeType, {
        holder: holder,
        spender: spender.address,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(spender).consume(holder, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'ExpiredSignature',
      );
    });

    it('Reverts if signer could not be recovered from the signature', async function () {
      const holder = user1.address;
      const amount = 100;
      const deadline = 999999999999999;
      const signature =
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
      await expect(this.contract.connect(spender).consume(holder, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    it('Reverts if the signature does not match with holder', async function () {
      const holder = user1.address;
      const wrongHolder = user2.address;
      const amount = 100;
      const deadline = 999999999999999;
      const nonce = 0;

      const signature = await user1.signTypedData(this.domain, this.consumeType, {
        holder: wrongHolder,
        spender: spender.address,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(spender).consume(holder, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    it('Reverts if the signer does not have enough balance', async function () {
      const amount = 100;
      const holder = user1.address;
      const deadline = 999999999999999;
      const nonce = 0;

      const signature = await user1.signTypedData(this.domain, this.consumeType, {
        holder: holder,
        spender: spender.address,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(spender).consume(holder, amount, deadline, signature))
        .to.revertedWithCustomError(this.contract, 'InsufficientBalance')
        .withArgs(holder, amount);
      const balance = await this.contract.balances(user1.address);
      expect(balance).equal(0);
    });

    context('when successful', function () {
      it('it should update to correct balance', async function () {
        const amount = 100;
        await this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode);

        await this.contract.connect(user1).approve(spender.address, amount);

        const holder = user1.address;
        const deadline = 999999999999999;
        const nonce = 0;

        const signature = await user1.signTypedData(this.domain, this.consumeType, {
          holder: holder,
          spender: spender.address,
          amount: amount,
          deadline: deadline,
          nonce: nonce,
        });

        await this.contract.connect(spender).consume(holder, amount, deadline, signature);
        const balance = await this.contract.balances(holder);
        expect(balance).equal(0);
      });

      it('it should emit an Comsumed event', async function () {
        const amount = 100;
        await this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode);

        await this.contract.connect(user1).approve(spender.address, amount);

        const holder = user1.address;
        const spenderAddress = spender.address;
        const deadline = 999999999999999;
        const nonce = 0;

        const signature = await user1.signTypedData(this.domain, this.consumeType, {
          holder: holder,
          spender: spender.address,
          amount: amount,
          deadline: deadline,
          nonce: nonce,
        });

        await expect(this.contract.connect(spender).consume(holder, amount, deadline, signature))
          .to.emit(this.contract, 'Consumed')
          .withArgs(spenderAddress, holder, amount);
      });
    });
  });

  describe('consume(uint256 amount)', function () {
    it('Reverts if sender does not have enough balance', async function () {
      const amount = 100;

      await expect(this.contract.connect(user1).consume(amount))
        .to.revertedWithCustomError(this.contract, 'InsufficientBalance')
        .withArgs(user1.address, amount);
    });

    context('when successful', function () {
      it('it should update to correct balance', async function () {
        const amount = 100;
        await this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode);

        await this.contract.connect(user1).consume(amount);
        const balance = await this.contract.balances(user1.address);
        expect(balance).equal(0);
      });

      it('it should emit an Comsumed event', async function () {
        const amount = 100;
        await this.contract.connect(depositor).deposit(user1.address, amount, this.depositReasonCode);

        await expect(this.contract.connect(user1).consume(amount)).to.emit(this.contract, 'Consumed').withArgs(user1.address, user1.address, amount);
      });
    });
  });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      expect(await this.contract.connect(user1).__msgData()).to.exist;
    });

    it('mock: _msgSender()', async function () {
      expect(await this.contract.connect(user1).__msgSender()).to.exist;
    });
  });
});
