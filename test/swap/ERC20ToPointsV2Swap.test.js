const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20ToPointsV2Swap', () => {
  before(async function () {
    [deployer, owner, admin, depositor, user, payoutWallet, other] = await ethers.getSigners();
  });

  const fixture = async () => {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.erc20Token = await deployContract('ERC20PermitMock');
    await this.erc20Token.transfer(user.address, 1000n * 10n ** (await this.erc20Token.decimals()));

    this.pointsV2 = await deployContract('PointsV2', this.forwarderRegistryAddress);
    this.depositReasonCode = ethers.encodeBytes32String('ERC20_TO_POINTSV2_SWAP');

    await this.pointsV2.grantRole(await this.pointsV2.ADMIN_ROLE(), admin.address);

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
      'ERC20ToPointsV2SwapMock',
      await this.erc20Token.getAddress(),
      await this.pointsV2.getAddress(),
      this.rate,
      payoutWallet.address,
      this.forwarderRegistryAddress,
    );

    await this.pointsV2.grantRole(await this.pointsV2.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async () => {
    await loadFixture(fixture, this);
  });

  describe('constructor', () => {
    it('reverts if the token address is 0', async () => {
      await expect(
        deployContract(
          'ERC20ToPointsV2Swap',
          ethers.ZeroAddress,
          await this.pointsV2.getAddress(),
          this.rate,
          payoutWallet.address,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidERC20Token');
    });

    it('reverts if the pointsV2 address is 0', async () => {
      await expect(
        deployContract(
          'ERC20ToPointsV2Swap',
          await this.erc20Token.getAddress(),
          ethers.ZeroAddress,
          this.rate,
          payoutWallet.address,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsV2');
    });

    context('when successful', () => {
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

  describe('setRate(uint256 newRate)', () => {
    it('Reverts if sender is not the owner', async () => {
      await expect(this.contract.connect(other).setRate(1230000))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', () => {
      it('it should update to correct balance', async () => {
        const newRate = 1230000;
        await this.contract.connect(deployer).setRate(newRate);
        expect(await this.contract.rate()).equal(newRate);
      });

      it('it should emit an RateUpdated event', async () => {
        const newRate = 1230000;
        await expect(this.contract.connect(deployer).setRate(newRate)).to.emit(this.contract, 'RateUpdated').withArgs(newRate);
      });
    });
  });

  describe('swap(uint256 tokenAmountIn)', () => {
    it('Reverts if the tokenAmountIn is zero', async () => {
      await expect(this.contract.connect(deployer).swap(0)).to.revertedWithCustomError(this.contract, 'InvalidAmount');
    });

    context('when successful', () => {
      it('it should swap correct balances when no rounding', async () => {
        const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), tokenAmountIn);

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);

        await this.contract.connect(user).swap(tokenAmountIn);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - tokenAmountIn);
        const pointsAmount = (tokenAmountIn * this.rate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
      });

      it('it should swap correct balances when there is rounding', async () => {
        const newRate = 1234567n; // 123.4567
        await this.contract.connect(deployer).setRate(newRate);

        const tokenAmountIn = 123456789n * 10n ** ((await this.erc20Token.decimals()) - 6n); // 123.456789
        const expectedPointsAmount =
          (tokenAmountIn * newRate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());
        const expectedTokenAmountIn =
          (expectedPointsAmount * (await this.contract.ERC20_TOKEN_PRECISION()) * (await this.contract.RATE_PRECISION())) / newRate;

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), tokenAmountIn);

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);

        await this.contract.connect(user).swap(tokenAmountIn);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedTokenAmountIn);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + expectedPointsAmount);
      });

      it('it should emit a Swapped event', async () => {
        const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

        await this.erc20Token.connect(user).approve(await this.contract.getAddress(), tokenAmountIn);

        const pointsAmount = (tokenAmountIn * this.rate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());

        await expect(this.contract.connect(user).swap(tokenAmountIn))
          .to.emit(this.contract, 'Swapped')
          .withArgs(user.address, tokenAmountIn, pointsAmount);
      });
    });
  });

  describe('swap(address holder, uint256 tokenAmountIn, uint256 deadline, bytes memory signature)', () => {
    it('Reverts if the tokenAmountIn is zero', async () => {
      const tokenAmountIn = 0n;

      const deadline = 999999999999999;
      const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
        owner: user.address,
        spender: await this.contract.getAddress(),
        value: tokenAmountIn,
        nonce: await this.erc20Token.nonces(user.address),
        deadline: deadline,
      });

      await expect(this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidAmount',
      );
    });

    it('Reverts if the signature length is not 65', async () => {
      const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

      const deadline = 999999999999999;
      const signature = '0x1234';

      await expect(this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignatureLength',
      );
    });

    it('Reverts if the signature is not valid', async () => {
      const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

      const deadline = 999999999999999;
      const signature = '0x'.padEnd(132, '0');

      await expect(this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature)).to.revertedWithCustomError(
        this.contract,
        'InvalidSignature',
      );
    });

    context('when successful', () => {
      it('it should swap correct balances without rounding', async () => {
        const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const allowanceBefore = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: tokenAmountIn,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        await this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const allowanceAfter = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - tokenAmountIn);
        const pointsAmount = (tokenAmountIn * this.rate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + pointsAmount);
        expect(allowanceAfter).equal(allowanceBefore);
      });

      it('it should swap correct balances with rounding', async () => {
        const newRate = 1234567n; // 123.4567
        await this.contract.connect(deployer).setRate(newRate);

        const tokenAmountIn = 123456789n * 10n ** ((await this.erc20Token.decimals()) - 6n); // 123.456789
        const expectedPointsAmount =
          (tokenAmountIn * newRate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());
        const expectedTokenAmountIn =
          (expectedPointsAmount * (await this.contract.ERC20_TOKEN_PRECISION()) * (await this.contract.RATE_PRECISION())) / newRate;

        const erc20TokenBalanceBefore = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceBefore = await this.pointsV2.balances(user.address);
        const allowanceBefore = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: tokenAmountIn,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        await this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature);

        const erc20TokenBalanceAfter = await this.erc20Token.balanceOf(user.address);
        const pointsBalanceAfter = await this.pointsV2.balances(user.address);
        const allowanceAfter = await this.erc20Token.allowance(user.address, await this.contract.getAddress());

        expect(erc20TokenBalanceAfter).equal(erc20TokenBalanceBefore - expectedTokenAmountIn);
        expect(pointsBalanceAfter).equal(pointsBalanceBefore + expectedPointsAmount);
        expect(allowanceAfter - allowanceBefore).equal(tokenAmountIn - expectedTokenAmountIn);
      });

      it('emits a Swapped event', async () => {
        const tokenAmountIn = 123n * 10n ** (await this.erc20Token.decimals());

        const deadline = 999999999999999;
        const signature = await user.signTypedData(this.erc20PermitDomain, this.erc20PermitType, {
          owner: user.address,
          spender: await this.contract.getAddress(),
          value: tokenAmountIn,
          nonce: await this.erc20Token.nonces(user.address),
          deadline: deadline,
        });

        const pointsAmount = (tokenAmountIn * this.rate) / (await this.contract.ERC20_TOKEN_PRECISION()) / (await this.contract.RATE_PRECISION());
        await expect(this.contract.connect(other).swap(user.address, tokenAmountIn, deadline, signature))
          .to.emit(this.contract, 'Swapped')
          .withArgs(user.address, tokenAmountIn, pointsAmount);
      });
    });
  });

  context('support meta-transactions', () => {
    it('mock: _msgData()', async () => {
      expect(await this.contract.connect(user).__msgData()).to.exist;
    });

    it('mock: _msgSender()', async () => {
      expect(await this.contract.connect(user).__msgSender()).to.exist;
    });
  });
});
