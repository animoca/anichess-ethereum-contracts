const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('PointsV2', () => {
  before(async function () {
    [deployer, holder, spender, depositor, other] = await ethers.getSigners();
  });

  const fixture = async () => {
    this.contract = await deployContract('PointsV2');
    this.depositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';

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

  beforeEach(async () => {
    await loadFixture(fixture, this);
  });

  describe('deposit(address holder, uint256 amount, bytes32 depositReasonCode)', () => {
    it('Reverts if the sender does not have Depositor role', async () => {
      await expect(this.contract.connect(other).deposit(holder.address, 100, this.depositReasonCode))
        .to.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.DEPOSITOR_ROLE(), other.address);
    });

    it('Reverts if deposit amount is zero', async () => {
      await expect(this.contract.connect(depositor).deposit(holder.address, 0, this.depositReasonCode)).to.revertedWithCustomError(
        this.contract,
        'DepositZeroAmount',
      );
    });

    context('when successful', () => {
      it('it should update to correct balance', async () => {
        const amount = 100;
        await this.contract.connect(depositor).deposit(holder.address, amount, this.depositReasonCode);
        const balance = await this.contract.balances(holder.address);
        expect(balance).equal(amount);
      });

      it('it should emit an Deposited event', async () => {
        const amount = 100;
        await expect(this.contract.connect(depositor).deposit(holder.address, amount, this.depositReasonCode))
          .to.emit(this.contract, 'Deposited')
          .withArgs(depositor.address, this.depositReasonCode, holder.address, amount);
      });
    });
  });

  describe('consume(address holder, uint256 amount)', () => {
    it('Reverts if sender does not have enough balance', async () => {
      const amount = 100;

      await expect(this.contract.connect(spender).consume(holder.address, amount))
        .to.revertedWithCustomError(this.contract, 'InsufficientBalance')
        .withArgs(holder.address, amount);
    });

    it('Reverts if spender does not have enough allowance to spend balance of holder', async () => {
      const amount = 100;
      await this.contract.connect(depositor).deposit(holder.address, amount, this.depositReasonCode);

      await this.contract.connect(holder).approve(spender.address, amount - 1);

      await expect(this.contract.connect(spender).consume(holder.address, amount)).to.revertedWithCustomError(this.contract, 'NotEnoughAllowance');
    });

    context('when successful', () => {
      it('it should update to correct balance', async () => {
        const amount = 100n;
        await this.contract.connect(depositor).deposit(holder.address, amount, this.depositReasonCode);

        await this.contract.connect(holder).approve(spender.address, amount);

        const allowanceBefore = await this.contract.allowances(holder.address, spender.address);

        await this.contract.connect(spender).consume(holder.address, amount);

        const balance = await this.contract.balances(holder.address);
        expect(balance).equal(0);

        const allowanceAfter = await this.contract.allowances(holder.address, spender.address);
        expect(allowanceAfter).equal(allowanceBefore - amount);
      });

      it('it should emit an Comsumed event', async () => {
        const amount = 100;
        await this.contract.connect(depositor).deposit(holder.address, amount, this.depositReasonCode);

        await this.contract.connect(holder).approve(spender.address, amount);

        await expect(this.contract.connect(spender).consume(holder.address, amount))
          .to.emit(this.contract, 'Consumed')
          .withArgs(spender.address, holder.address, amount);
      });
    });
  });

  describe('approve(address spender, uint256 amount)', () => {
    it('reverts if spender is zero address', async () => {
      await expect(this.contract.connect(holder).approve(ethers.ZeroAddress, 100)).to.be.revertedWithCustomError(this.contract, 'InvalidSpender');
    });

    context('when successful', () => {
      it('should update to correct allowance', async () => {
        const amount = 100;
        await this.contract.connect(holder).approve(spender.address, amount);
        const allowance = await this.contract.allowances(holder.address, spender.address);
        expect(allowance).equal(amount);
      });

      it('should emit an Approved event', async () => {
        const amount = 100;
        await expect(this.contract.connect(holder).approve(spender.address, amount))
          .to.emit(this.contract, 'Approved')
          .withArgs(holder.address, spender.address, amount);
      });
    });
  });

  describe('permit(address holder, address spender, uint256 amount, uint256 deadline, bytes calldata signature)', () => {
    it('Reverts if spender is zero address', async () => {
      const amount = 100;
      const deadline = 0;
      const nonce = 0;

      const signature = await holder.signTypedData(this.domain, this.permitType, {
        holder: holder.address,
        spender: ethers.ZeroAddress,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(other).permit(holder.address, ethers.ZeroAddress, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSpender',
      );
    });

    it('Reverts if the deadline of the signature has passed', async () => {
      const amount = 100;
      const deadline = 0;
      const nonce = 0;

      const signature = await holder.signTypedData(this.domain, this.permitType, {
        holder: holder.address,
        spender: spender.address,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(other).permit(holder.address, spender.address, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'ExpiredSignature',
      );
    });

    it('Reverts if signer could not be recovered from the signature', async () => {
      const amount = 100;
      const deadline = 999999999999999;
      const signature =
        '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
      await expect(this.contract.connect(other).permit(holder.address, spender.address, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    it('Reverts if the signature does not match with holder', async () => {
      const wrongHolder = other.address;
      const amount = 100;
      const deadline = 999999999999999;
      const nonce = 0;

      const signature = await holder.signTypedData(this.domain, this.permitType, {
        holder: wrongHolder,
        spender: spender.address,
        amount: amount,
        deadline: deadline,
        nonce: nonce,
      });

      await expect(this.contract.connect(other).permit(holder.address, spender.address, amount, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    context('when successful', () => {
      it('should update to correct allowance', async () => {
        const amount = 100;
        const deadline = 999999999999999;
        const nonce = 0;

        const signature = await holder.signTypedData(this.domain, this.permitType, {
          holder: holder.address,
          spender: spender.address,
          amount: amount,
          deadline: deadline,
          nonce: nonce,
        });

        await this.contract.connect(other).permit(holder.address, spender.address, amount, deadline, signature);
        const allowance = await this.contract.allowances(holder.address, spender.address);
        expect(allowance).equal(amount);
      });

      it('should emit an Permitted event', async () => {
        const amount = 100;
        const deadline = 999999999999999;
        const nonce = 0;

        const signature = await holder.signTypedData(this.domain, this.permitType, {
          holder: holder.address,
          spender: spender.address,
          amount: amount,
          deadline: deadline,
          nonce: nonce,
        });

        await expect(this.contract.connect(holder).permit(holder.address, spender.address, amount, deadline, signature))
          .to.emit(this.contract, 'Permitted')
          .withArgs(holder.address, spender.address, amount);
      });
    });
  });
});
