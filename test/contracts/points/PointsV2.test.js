const {ethers} = require('hardhat');
const {expect} = require('chai');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

const ApproveType = {
  Approve: [
    {name: 'holder', type: 'address'},
    {name: 'spender', type: 'address'},
    {name: 'amount', type: 'uint256'},
    {name: 'deadline', type: 'uint256'},
    {name: 'nonce', type: 'uint256'},
  ],
};

describe('PointsV2', function () {
  let deployer, other;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('PointsV2Mock', await getForwarderRegistryAddress());
    this.domain = {
      name: 'Points',
      version: '2',
      chainId: await getChainId(),
      verifyingContract: await this.contract.getAddress(),
    };
    await this.contract.grantRole(await this.contract.DEPOSITOR_ROLE(), deployer.address);
    await this.contract.deposit(deployer.address, ethers.MaxUint256, ethers.ZeroHash);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('deposit(address,uint256,bytes32)', function () {
    it('reverts if not called by a depositor', async function () {
      await expect(this.contract.connect(other).deposit(other.address, ethers.MaxUint256, ethers.ZeroHash))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.DEPOSITOR_ROLE(), other.address);
    });

    it('reverts if the deposit is made to the zero address', async function () {
      await expect(this.contract.deposit(ethers.ZeroAddress, ethers.MaxUint256, ethers.ZeroHash)).to.be.revertedWithCustomError(
        this.contract,
        'DepositToAddressZero',
      );
    });

    it('reverts if the deposit amount is zero', async function () {
      await expect(this.contract.deposit(deployer.address, 0, ethers.ZeroHash)).to.be.revertedWithCustomError(this.contract, 'DepositZeroAmount');
    });

    context('when successful', function () {
      const depositReason = ethers.ZeroHash;
      const depositAmount = 123n;

      beforeEach(async function () {
        this.receipt = await this.contract.deposit(other.address, depositAmount, depositReason);
      });

      it('emits a Deposited event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Deposited').withArgs(deployer.address, depositReason, other.address, depositAmount);
      });

      it('increases the holder balance', async function () {
        expect(await this.contract.balances(other.address)).to.equal(depositAmount);
      });
    });
  });

  describe('approve(address,uint256)', function () {
    const approveAmount = 123n;

    it('reverts if the spender is the zero address', async function () {
      await expect(this.contract.approve(ethers.ZeroAddress, approveAmount))
        .to.be.revertedWithCustomError(this.contract, 'ApprovalToAddressZero')
        .withArgs(deployer.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.approve(other.address, approveAmount);
      });

      it('emits an Approval event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Approval').withArgs(deployer.address, other.address, approveAmount);
      });

      it('sets the allowance', async function () {
        expect(await this.contract.allowances(deployer.address, other.address)).to.equal(approveAmount);
      });
    });
  });

  describe('approveWithSignature(address,uint256,uint256,uint8,bytes32,bytes32)', function () {
    const amount = 123n;

    it('reverts if the spender is the zero address', async function () {
      const deadline = ethers.MaxUint256;
      const holder = deployer.address;
      const spender = ethers.ZeroAddress;
      const signature = await deployer.signTypedData(this.domain, ApproveType, {
        holder,
        spender,
        amount,
        deadline,
        nonce: await this.contract.nonces(await this.contract.getNonceKey(holder, spender)),
      });
      await expect(this.contract.approveWithSignature(holder, spender, amount, deadline, signature))
        .to.be.revertedWithCustomError(this.contract, 'ApprovalToAddressZero')
        .withArgs(holder);
    });

    it('reverts if the signature is invalid', async function () {
      const deadline = ethers.MaxUint256;
      const holder = deployer.address;
      const spender = other.address;
      const signature = await deployer.signTypedData(this.domain, ApproveType, {
        holder,
        spender,
        amount,
        deadline,
        nonce: (await this.contract.nonces(await this.contract.getNonceKey(holder, spender))) + 1n, // wrong nonce
      });
      await expect(this.contract.approveWithSignature(holder, spender, amount, deadline, signature)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    it('reverts if the signature is expired', async function () {
      const deadline = 0n;
      const holder = deployer.address;
      const spender = other.address;
      const signature = await deployer.signTypedData(this.domain, ApproveType, {
        holder,
        spender,
        amount,
        deadline,
        nonce: await this.contract.nonces(await this.contract.getNonceKey(holder, spender)),
      });
      await expect(this.contract.approveWithSignature(holder, spender, amount, deadline, signature)).to.be.revertedWithCustomError(
        this.contract,
        'ExpiredSignature',
      );
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.holder = deployer.address;
        this.spender = other.address;
        this.nonce = await this.contract.nonces(await this.contract.getNonceKey(this.holder, this.spender));
        this.deadline = ethers.MaxUint256;
        this.signature = await deployer.signTypedData(this.domain, ApproveType, {
          holder: this.holder,
          spender: this.spender,
          amount,
          deadline: this.deadline,
          nonce: this.nonce,
        });
        this.receipt = await this.contract.approveWithSignature(this.holder, this.spender, amount, this.deadline, this.signature);
      });

      it('emits an Approval event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Approval').withArgs(this.holder, this.spender, amount);
      });

      it('sets the allowance', async function () {
        expect(await this.contract.allowances(this.holder, this.spender)).to.equal(amount);
      });

      it('increments the nonce', async function () {
        expect(await this.contract.nonces(await this.contract.getNonceKey(this.holder, this.spender))).to.equal(this.nonce + 1n);
      });
    });
  });

  describe('spendFrom(address,uint256)', function () {
    const spendAmount = 123n;

    it('reverts if the holder does not have enough balance', async function () {
      await this.contract.connect(other).approve(deployer.address, spendAmount);
      await expect(this.contract.spendFrom(other.address, spendAmount))
        .to.be.revertedWithCustomError(this.contract, 'InsufficientBalance')
        .withArgs(other.address, 0n, spendAmount);
    });

    it('reverts if the allowance is insufficient', async function () {
      await expect(this.contract.connect(other).spendFrom(deployer.address, spendAmount))
        .to.be.revertedWithCustomError(this.contract, 'InsufficientAllowance')
        .withArgs(deployer.address, other.address, 0n, spendAmount);
    });

    context('when successful (spending from one-self)', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.spendFrom(deployer.address, spendAmount);
      });

      it('does not emit an Approval event', async function () {
        await expect(this.receipt).to.not.emit(this.contract, 'Approval');
      });

      it('emits a Spent event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Spent').withArgs(deployer.address, deployer.address, spendAmount);
      });

      it('decreases the holder balance', async function () {
        expect(await this.contract.balances(deployer.address)).to.equal(ethers.MaxUint256 - spendAmount);
      });
    });

    context('when successful (spending from another)', function () {
      const allowanceAmount = 456n;

      beforeEach(async function () {
        await this.contract.approve(other.address, allowanceAmount);
        this.receipt = await this.contract.connect(other).spendFrom(deployer.address, spendAmount);
      });

      it('emits an Approval event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'Approval')
          .withArgs(deployer.address, other.address, allowanceAmount - spendAmount);
      });

      it('emits a Spent event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Spent').withArgs(other.address, deployer.address, spendAmount);
      });

      it('decreases the holder balance', async function () {
        expect(await this.contract.balances(deployer.address)).to.equal(ethers.MaxUint256 - spendAmount);
      });

      it('decreases the allowance', async function () {
        expect(await this.contract.allowances(deployer.address, other.address)).to.equal(allowanceAmount - spendAmount);
      });
    });
  });

  describe('spendAndCall(uint256,address,bytes)', function () {
    it('reverts if the holder does not have enough balance', async function () {
      await expect(this.contract.connect(other).spendAndCall(123n, other.address, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InsufficientBalance')
        .withArgs(other.address, 0n, 123n);
    });

    it('reverts if the callback target does not implement the required interface', async function () {
      await expect(this.contract.spendAndCall(123n, other.address, '0x')).to.be.reverted;
    });

    it('reverts if the callback target returns an invalid response', async function () {
      let receiverContract = await deployContract('PointsV2WrongSpendingCallbackMock', await this.contract.getAddress());
      await expect(this.contract.spendAndCall(123n, await receiverContract.getAddress(), '0x'))
        .to.be.revertedWithCustomError(this.contract, 'CallbackRejected')
        .withArgs(deployer.address, 123n, await receiverContract.getAddress(), '0x');
    });

    context('when successful', function () {
      const spendAmount = 123n;
      let receiverContract;

      beforeEach(async function () {
        receiverContract = await deployContract('PointsV2SpendingCallbackMock', await this.contract.getAddress());
        this.receipt = await this.contract.spendAndCall(spendAmount, await receiverContract.getAddress(), '0x1234');
      });

      it('emits a Spent event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Spent').withArgs(deployer.address, deployer.address, spendAmount);
      });

      it('decreases the holder balance', async function () {
        expect(await this.contract.balances(deployer.address)).to.equal(ethers.MaxUint256 - spendAmount);
      });

      it('calls the callback', async function () {
        await expect(this.receipt).to.emit(receiverContract, 'PointsSpent').withArgs(deployer.address, spendAmount, '0x1234');
      });
    });
  });

  describe('__msgData()', function () {
    it('returns the msg.data', async function () {
      await this.contract.__msgData();
    });
  });
});
