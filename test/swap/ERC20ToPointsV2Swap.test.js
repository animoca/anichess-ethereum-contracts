const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');

describe('ERC20ToPointsV2Swap', () => {
  before(async function () {
    [deployer, user, payoutWallet, other] = await ethers.getSigners();
  });

  const fixture = async () => {
    this.erc20Token = await deployContract('ERC20PermitMock');

    await this.erc20Token.transfer(user.address, 1000n * 10n ** (await this.erc20Token.decimals()));

    this.pointsV2 = await deployContract('PointsV2');

    this.depositReasonCode = ethers.encodeBytes32String('ERC20_TO_POINTSV2_SWAP');

    this.erc20PermitDomain = {
      name: 'TEST',
      version: '1',
      chainId: await getChainId(),
      verifyingContract: await this.erc20Token.getAddress(),
    };

    this.erc20PermitType = {
      Permit: [
        {name: 'owner', type: 'address'},
        {name: 'spender', type: 'address'},
        {name: 'value', type: 'uint256'},
        {name: 'nonce', type: 'uint256'},
        {name: 'deadline', type: 'uint256'},
      ],
    };

    this.rate = 1000000n; // 100.0000

    this.contract = await deployContract(
      'ERC20ToPointsV2Swap',
      await this.erc20Token.getAddress(),
      await this.pointsV2.getAddress(),
      this.rate,
      payoutWallet.address,
    );

    await this.pointsV2.grantRole(await this.pointsV2.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async () => {
    await loadFixture(fixture, this);
  });

  describe('constructor', () => {
    it('reverts if the token address is 0', async () => {
      await expect(
        deployContract('ERC20ToPointsV2Swap', ethers.ZeroAddress, await this.pointsV2.getAddress(), this.rate, payoutWallet.address),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidERC20Token');
    });

    it('reverts if the pointsV2 address is 0', async () => {
      await expect(
        deployContract('ERC20ToPointsV2Swap', await this.erc20Token.getAddress(), ethers.ZeroAddress, this.rate, payoutWallet.address),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsV2');
    });

    context('when successful', () => {
      it('should have set the correct deposit reason code', async () => {
        expect(await this.contract.DEPOSIT_REASON_CODE()).to.equal(this.depositReasonCode);
      });

      it('should have set the correct token address', async () => {
        expect(await this.contract.ERC20_TOKEN()).to.equal(await this.erc20Token.getAddress());
      });

      it('should have set the correct pointsV2 address', async () => {
        expect(await this.contract.POINTSV2()).to.equal(await this.pointsV2.getAddress());
      });

      it('should have set the correct payout wallet address', async () => {
        expect(await this.contract.payoutWallet()).to.equal(payoutWallet.address);
      });

      it('should have set the correct rate', async () => {
        expect(await this.contract.rate()).to.equal(this.rate);
      });
    });
  });

  describe('calculateRequiredTokenAmount(uint256 pointsAmount)', () => {
    it('should return correct token amount', async () => {
      const pointsAmount = 100n;
      const expectedErc20TokenAmount =
        (pointsAmount * 10n ** (await this.erc20Token.decimals()) * (await this.contract.RATE_PRECISION())) / this.rate;
      const erc20TokenAmount = await this.contract.calculateRequiredTokenAmount(pointsAmount);
      expect(erc20TokenAmount).equal(expectedErc20TokenAmount);
    });
  });

  describe('setRate(uint256 newRate)', () => {
    const newRate = 1230000;

    it('reverts if sender is not the owner', async () => {
      await expect(this.contract.connect(other).setRate(newRate))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', () => {
      it('should update to correct balance', async () => {
        await this.contract.connect(deployer).setRate(newRate);
        expect(await this.contract.rate()).equal(newRate);
      });

      it('should emit an RateUpdated event', async () => {
        await expect(this.contract.connect(deployer).setRate(newRate)).to.emit(this.contract, 'RateUpdated').withArgs(this.rate, newRate);
      });
    });
  });

  describe('swap(uint256 pointsAmount)', () => {
    it('reverts if the pointsAmountO is zero', async () => {
      await expect(this.contract.connect(user).swap(0)).to.revertedWithCustomError(this.contract, 'InvalidAmount');
    });

    context('when successful', () => {
      it('should swap correct balances without rounding', async () => {
        const pointsAmount = 100n;
        const expectedErc20TokenAmount = 1n * 10n ** (await this.erc20Token.decimals());

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), expectedErc20TokenAmount);

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const payoutWalletBalanceBefore = await this.erc20Token.balanceOf(payoutWallet.address);

        await this.contract.connect(user).swap(pointsAmount);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const payoutWalletBalanceAfter = await this.erc20Token.balanceOf(payoutWallet.address);

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedErc20TokenAmount);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
        expect(payoutWalletBalanceAfter).equal(payoutWalletBalanceBefore + expectedErc20TokenAmount);
      });

      it('should swap correct balances with rounding', async () => {
        const newRate = 1234567n; // 123.4567
        await this.contract.connect(deployer).setRate(newRate);

        const pointsAmount = 100000n; // 100.0000

        const erc20TokenPrecision = 10n ** (await this.erc20Token.decimals());
        const expectedErc20TokenAmount = (pointsAmount * erc20TokenPrecision * (await this.contract.RATE_PRECISION())) / newRate;

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), expectedErc20TokenAmount);

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const payoutWalletBalanceBefore = await this.erc20Token.balanceOf(payoutWallet.address);

        await this.contract.connect(user).swap(pointsAmount);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const payoutWalletBalanceAfter = await this.erc20Token.balanceOf(payoutWallet.address);

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedErc20TokenAmount);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
        expect(payoutWalletBalanceAfter).equal(payoutWalletBalanceBefore + expectedErc20TokenAmount);
      });

      it('should emit a Swapped event', async () => {
        const pointsAmount = 100n;
        const expectedErc20TokenAmount = 1n * 10n ** (await this.erc20Token.decimals());

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), expectedErc20TokenAmount);

        await expect(this.contract.connect(user).swap(pointsAmount))
          .to.emit(this.contract, 'Swapped')
          .withArgs(user.address, expectedErc20TokenAmount, pointsAmount);
      });
    });
  });

  describe('swap(address holder, uint256 pointsAmount, uint256 permittedTokenAmount, uint256 deadline, bytes memory signature)', () => {
    it('reverts if the pointsAmount is zero', async () => {
      const pointsAmount = 0n;
      const expectedErc20TokenAmount = 0n;

      const deadline = 999999999999999;
      const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
        owner: user.address,
        spender: await this.contract.getAddress(),
        value: expectedErc20TokenAmount,
        nonce: await this.erc20Token.nonces(user.address),
        deadline: deadline,
      });

      const sig = ethers.Signature.from(signature);
      await expect(
        this.contract.connect(user).swap(pointsAmount, expectedErc20TokenAmount, deadline, sig.v, sig.r, sig.s),
      ).to.revertedWithCustomError(this.contract, 'InvalidAmount');
    });

    it('reverts if the signature is not valid', async () => {
      const pointsAmount = 100n;
      const expectedErc20TokenAmount = 1n * 10n ** (await this.erc20Token.decimals());

      const deadline = 999999999999999;
      const signature = '0x'.padEnd(132, '0');

      const sig = ethers.Signature.from(signature);

      await expect(
        this.contract.connect(user).swap(pointsAmount, expectedErc20TokenAmount, deadline, sig.v, sig.r, sig.s),
      ).to.revertedWithCustomError(this.erc20Token, 'ECDSAInvalidSignature');
    });

    context('when successful', () => {
      it('should swap correct balances without rounding', async () => {
        const pointsAmount = 100n;
        const expectedErc20TokenAmount = 1n * 10n ** (await this.erc20Token.decimals());

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const allowanceBefore = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: expectedErc20TokenAmount,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        const sig = ethers.Signature.from(signature);

        await this.contract.connect(user).swap(pointsAmount, expectedErc20TokenAmount, deadline, sig.v, sig.r, sig.s);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const allowanceAfter = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedErc20TokenAmount);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
        expect(allowanceAfter).equal(allowanceBefore);
      });

      it('should swap correct balances with rounding', async () => {
        const newRate = 1234567n; // 123.4567
        await this.contract.connect(deployer).setRate(newRate);

        const pointsAmount = 123n;

        const erc20TokenPrecision = 10n ** (await this.erc20Token.decimals());
        const expectedTokenAmount = (pointsAmount * erc20TokenPrecision * (await this.contract.RATE_PRECISION())) / newRate;

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const allowanceBefore = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: expectedTokenAmount,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        const sig = ethers.Signature.from(signature);

        await this.contract.connect(user).swap(pointsAmount, expectedTokenAmount, deadline, sig.v, sig.r, sig.s);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const allowanceAfter = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedTokenAmount);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
        expect(allowanceAfter).equal(allowanceBefore);
      });

      it('emits a Swapped event', async () => {
        const pointsAmount = 100n;
        const expectedErc20TokenAmount = 1n * 10n ** (await this.erc20Token.decimals());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: expectedErc20TokenAmount,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        const sig = ethers.Signature.from(signature);
        await expect(this.contract.connect(user).swap(pointsAmount, expectedErc20TokenAmount, deadline, sig.v, sig.r, sig.s))
          .to.emit(this.contract, 'Swapped')
          .withArgs(user.address, expectedErc20TokenAmount, pointsAmount);
      });
    });
  });
});
