const {ethers} = require('hardhat');
const {expect} = require('chai');
const {BN} = require('bn.js');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20Arena', function () {
  function formatUuid(uuid) {
    const abiCoder = new ethers.AbiCoder();
    const value = '0x' + uuid.replace(/-/g, '');
    return abiCoder.encode(['uint256'], [value]);
  }

  const MATCH_RESULT = {
    PLAYER1_WON: 0,
    PLAYER2_WON: 1,
    DRAW: 2,
  };

  const COMMISSION_RATE_PRECISION = 10000;

  before(async function () {
    [deployer, messageSigner, payoutWallet, user, user2, userWithoutAllocation, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.erc20 = await deployContract(
      'ERC20FixedSupply',
      '',
      '',
      18,
      [user.address, user2.address],
      [ethers.parseEther('10'), ethers.parseEther('10')],
      this.forwarderRegistryAddress,
    );

    this.name = 'Arena';
    this.version = '1.0';

    this.entryFee = ethers.parseEther('0.1');
    this.commissionRate = 500; // 5%
    this.commission = ethers.parseEther('0.01');
    this.reward = ethers.parseEther('0.19');
    this.refund = ethers.parseEther('0.095');

    this.contract = await deployContract(
      'ERC20ArenaMock',
      this.entryFee,
      this.commissionRate,
      messageSigner,
      payoutWallet,
      this.erc20,
      this.forwarderRegistryAddress,
    );
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('should revert if the price is zero', async function () {
      await expect(
        deployContract('ERC20ArenaMock', 0, this.commissionRate, messageSigner, payoutWallet, this.erc20, this.forwarderRegistryAddress),
      ).to.be.revertedWithCustomError(this.contract, 'ZeroPrice');
    });

    it('should revert if the commission cannot be evenly divided by 2', async function () {
      await expect(
        deployContract(
          'ERC20ArenaMock',
          ethers.parseEther('0.000000000000001'),
          9899,
          messageSigner,
          payoutWallet,
          this.erc20,
          this.forwarderRegistryAddress,
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'InvalidCommissionRate')
        .withArgs(9899);
    });

    context('when successful', function () {
      it('should set the ERC20 address', async function () {
        expect(await this.contract.ERC20()).to.equal(await this.erc20.getAddress());
      });

      it('should set the ENTRY_FEE', async function () {
        expect(await this.contract.ENTRY_FEE()).to.equal(this.entryFee);
      });

      it('should set the reward', async function () {
        expect(await this.contract.reward()).to.equal(this.reward);
      });

      it('should set the commission', async function () {
        expect(await this.contract.commission()).to.equal(this.commission);
      });

      it('should set the payout wallet', async function () {
        expect(await this.contract.payoutWallet()).to.equal(payoutWallet.address);
      });

      it('should set the message signer', async function () {
        expect(await this.contract.messageSigner()).to.equal(messageSigner.address);
      });
    });
  });

  describe('setMessageSigner(address signer)', function () {
    it('should revert if the sender is not the owner', async function () {
      await expect(this.contract.connect(user).setMessageSigner(user.address))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(user.address);
    });

    it('should set the message signer', async function () {
      await this.contract.setMessageSigner(other.address);
      expect(await this.contract.messageSigner()).to.equal(other.address);
    });
  });

  describe('setCommissionRate(uint256 newCommissionRate)', function () {
    it('should revert if the sender is not the owner', async function () {
      await expect(this.contract.connect(user).setCommissionRate(0))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(user.address);
    });

    it('should revert if the commission rate is equal to 100%', async function () {
      await expect(this.contract.setCommissionRate(COMMISSION_RATE_PRECISION))
        .to.be.revertedWithCustomError(this.contract, 'InvalidCommissionRate')
        .withArgs(COMMISSION_RATE_PRECISION);
    });

    context('when successful setting a positive commission rate', function () {
      beforeEach(async function () {
        this.rate = 9999; // 99.99%
        this.tx = await this.contract.setCommissionRate(this.rate);
        this.commission = ethers.parseEther('0.19998');
        this.reward = ethers.parseEther('0.00002');
      });

      it('should set the correct commission rate', async function () {
        expect(await this.contract.commissionRate()).to.equal(this.rate);
      });

      it('should set the correct commission', async function () {
        expect(await this.contract.commission()).to.equal(this.commission);
      });

      it('should set the correct reward', async function () {
        expect(await this.contract.reward()).to.equal(this.reward);
      });

      it('should emit a CommissionRateSet event', async function () {
        await expect(this.tx).to.emit(this.contract, 'CommissionRateSet').withArgs(this.rate);
      });
    });

    context('when successful setting a zero commission rate', function () {
      beforeEach(async function () {
        this.rate = 0;
        this.tx = await this.contract.setCommissionRate(this.rate);
      });

      it('should set the correct commission rate', async function () {
        expect(await this.contract.commissionRate()).to.equal(this.rate);
      });

      it('should set the correct commission', async function () {
        expect(await this.contract.commission()).to.equal('0');
      });

      it('should set the correct reward', async function () {
        expect(await this.contract.reward()).to.equal(new BN(this.entryFee).mul(new BN(2)));
      });

      it('should emit a CommissionRateSet event', async function () {
        await expect(this.tx).to.emit(this.contract, 'CommissionRateSet').withArgs(this.rate);
      });
    });
  });

  describe('onERC20Received(address, address from, uint256 amount, bytes calldata)', function () {
    it('should revert if the sender is not the ERC20 contract', async function () {
      const anotherToken = await deployContract(
        'ERC20FixedSupply',
        '',
        '',
        18,
        [user.address],
        [ethers.parseEther('10')],
        this.forwarderRegistryAddress,
      );

      await expect(anotherToken.connect(user).safeTransfer(this.contract, this.entryFee, '0x'))
        .to.be.revertedWithCustomError(this.contract, 'InvalidPaymentToken')
        .withArgs(anotherToken.getAddress());
    });

    it('should revert if the user does not have enough balance', async function () {
      await expect(this.erc20.connect(userWithoutAllocation).safeTransfer(this.contract, this.entryFee, '0x'))
        .to.be.revertedWithCustomError(this.erc20, 'ERC20InsufficientBalance')
        .withArgs(userWithoutAllocation, 0, this.entryFee);
    });

    it('should revert if the amount to transfer is not equal to the price', async function () {
      await expect(this.erc20.connect(user).safeTransfer(this.contract, ethers.parseEther('0.009'), '0x')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidPaymentAmount',
      );
    });

    context('when trying to pay again before completing the match', function () {
      beforeEach(async function () {
        await this.erc20.connect(user).safeTransfer(this.contract, this.entryFee, '0x');
      });

      it('should revert if the user already in game', async function () {
        await expect(this.erc20.connect(user).safeTransfer(this.contract, this.entryFee, '0x'))
          .to.be.revertedWithCustomError(this.contract, 'AlreadyAdmitted')
          .withArgs(user.address);
      });
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.tx = await this.erc20.connect(user).safeTransfer(this.contract, this.entryFee, '0x');
      });

      it('should transfer the price to the contract', async function () {
        expect(await this.erc20.balanceOf(this.contract)).to.equal(this.entryFee);
      });

      it('should set user as admitted', async function () {
        expect(await this.contract.admitted(user.address)).to.be.true;
      });

      it('should increase the feeLocked amount', async function () {
        expect(await this.contract.feeLocked()).to.equal(this.entryFee);
      });

      it('should emit an Admission event', async function () {
        await expect(this.tx).to.emit(this.contract, 'Admission').withArgs(user.address);
      });

      it('should emit a Transfer event', async function () {
        await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(user.address, this.contract, this.entryFee);
      });
    });
  });

  describe('admit()', function () {
    it("reverts if the user doesn't approve the contract to spend the entry fee", async function () {
      await expect(this.contract.connect(user).admit())
        .to.be.revertedWithCustomError(this.erc20, 'ERC20InsufficientAllowance')
        .withArgs(user.address, this.contract.getAddress(), 0, this.entryFee);
    });

    it('reverts if the user does not have enough balance', async function () {
      await this.erc20.connect(userWithoutAllocation).approve(this.contract.getAddress(), this.entryFee);
      await expect(this.contract.connect(userWithoutAllocation).admit())
        .to.be.revertedWithCustomError(this.erc20, 'ERC20InsufficientBalance')
        .withArgs(userWithoutAllocation, 0, this.entryFee);
    });

    context('when trying to admit again before completing the match', function () {
      beforeEach(async function () {
        await this.erc20.connect(user).approve(this.contract.getAddress(), this.entryFee);
        await this.contract.connect(user).admit();
      });

      it('should revert if the user already in game', async function () {
        await expect(this.erc20.connect(user).safeTransfer(this.contract, this.entryFee, '0x'))
          .to.be.revertedWithCustomError(this.contract, 'AlreadyAdmitted')
          .withArgs(user.address);
      });
    });

    context('when successful', function () {
      beforeEach(async function () {
        await this.erc20.connect(user).approve(this.contract.getAddress(), this.entryFee);
        this.tx = await this.contract.connect(user).admit();
      });

      it('should transfer the price to the contract', async function () {
        expect(await this.erc20.balanceOf(this.contract)).to.equal(this.entryFee);
      });

      it('should set user as admitted', async function () {
        expect(await this.contract.admitted(user.address)).to.be.true;
      });

      it('should increase the feeLocked amount', async function () {
        expect(await this.contract.feeLocked()).to.equal(this.entryFee);
      });

      it('should emit an Admission event', async function () {
        await expect(this.tx).to.emit(this.contract, 'Admission').withArgs(user.address);
      });

      it('should emit a Transfer event', async function () {
        await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(user.address, this.contract, this.entryFee);
      });
    });
  });

  describe('recoverERC20s(address[] calldata accounts, IERC20[] calldata tokens, uint256[] calldata amounts)', function () {
    it('reverts if not called by the contract owner', async function () {
      await expect(this.contract.connect(user).recoverERC20s([], [], []))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(user.address);
    });

    it('reverts if trying to recover deposited ERC20', async function () {
      await this.erc20.connect(user).safeTransfer(this.contract.getAddress(), this.entryFee, '0x');
      await expect(this.contract.recoverERC20s([other.address], [this.erc20.getAddress()], [1]))
        .to.be.revertedWithCustomError(this.contract, 'Unrecoverable')
        .withArgs(0, 1);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.anotherToken = await deployContract(
          'ERC20FixedSupply',
          '',
          '',
          18,
          [user.address],
          [ethers.parseEther('10')],
          this.forwarderRegistryAddress,
        );
        await this.erc20.connect(user).safeTransfer(this.contract.getAddress(), this.entryFee, '0x');
        await this.erc20.connect(user).transfer(this.contract.getAddress(), ethers.parseEther('5'));
        await this.anotherToken.connect(user).transfer(this.contract.getAddress(), ethers.parseEther('5'));
        this.receipt = await this.contract.recoverERC20s(
          [user.address, user.address, user.address],
          [this.erc20.getAddress(), this.erc20.getAddress(), this.anotherToken.getAddress()],
          [3, 2, 5],
        );
      });

      it('emits Transfer events', async function () {
        await expect(this.receipt)
          .to.emit(this.erc20, 'Transfer')
          .withArgs(await this.contract.getAddress(), user.address, 3)
          .and.to.emit(this.erc20, 'Transfer')
          .withArgs(await this.contract.getAddress(), user.address, 2)
          .and.to.emit(this.anotherToken, 'Transfer')
          .withArgs(await this.contract.getAddress(), user.address, 5);
      });
    });
  });

  describe(`
    completeMatch(
      uint256 matchId,
      address player1,
      address player2,
      MatchResult result,
      bytes calldata signature
    )`, function () {
    beforeEach(async function () {
      await this.erc20.connect(user).safeTransfer(this.contract, this.entryFee, '0x');
      await this.erc20.connect(user2).safeTransfer(this.contract, this.entryFee, '0x');
      expect(await this.contract.feeLocked()).to.equal(new BN(this.entryFee).mul(new BN(2)).toString());

      this.eip712Domain = {
        name: this.name,
        version: this.version,
        chainId: 31337,
        verifyingContract: await this.contract.getAddress(),
      };
      this.eip712Types = {
        CompleteMatch: [
          {name: 'matchId', type: 'uint256'},
          {name: 'player1', type: 'address'},
          {name: 'player2', type: 'address'},
          {name: 'result', type: 'uint8'},
        ],
      };

      this.matchId = formatUuid('ab82edf1-e8d7-4f2d-826d-f52bb0d26682');
    });

    it('should revert if match result is invalid', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user2.address,
        result: 3,
      });
      await expect(this.contract.completeMatch(this.matchId, user.address, user2.address, 3, signature)).to.be.revertedWithoutReason();
    });

    it('should revert if the player1 is not admitted', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: userWithoutAllocation.address,
        player2: user2.address,
        result: MATCH_RESULT.PLAYER1_WON,
      });
      await expect(this.contract.completeMatch(this.matchId, userWithoutAllocation.address, user2.address, MATCH_RESULT.PLAYER1_WON, signature))
        .to.be.revertedWithCustomError(this.contract, 'PlayerNotAdmitted')
        .withArgs(userWithoutAllocation.address);
    });

    it('should revert if the player2 is not admitted', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: userWithoutAllocation.address,
        result: MATCH_RESULT.PLAYER2_WON,
      });
      await expect(this.contract.completeMatch(this.matchId, user2.address, userWithoutAllocation.address, MATCH_RESULT.PLAYER2_WON, signature))
        .to.be.revertedWithCustomError(this.contract, 'PlayerNotAdmitted')
        .withArgs(userWithoutAllocation.address);
    });

    it('should revert if signature is invalid', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user.address, // same as player1
        result: MATCH_RESULT.PLAYER1_WON,
      });
      await expect(
        this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON, signature),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidSignature');
    });

    context('when successful with Player1Won', function () {
      beforeEach(async function () {
        this.signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          result: MATCH_RESULT.PLAYER1_WON,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON);
        });

        it('should emit Transfer events with correct amount', async function () {
          await expect(this.tx)
            .to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user.address, this.reward)
            .and.to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), payoutWallet.address, this.commission);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user.address, this.matchId, this.reward);
        });
      });

      context('when commission = 0', function () {
        beforeEach(async function () {
          await this.contract.setCommissionRate(0);
          expect(await this.contract.commissionRate()).to.equal(0);

          this.reward = new BN(this.entryFee).mul(new BN(2)).toString();
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON);
        });

        it('should emit a Transfer event to the player1 without deducting commission fee', async function () {
          await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(this.contract.getAddress(), user.address, this.reward);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user.address, this.matchId, this.reward);
        });
      });
    });

    context('when successful with Player2Won', function () {
      beforeEach(async function () {
        this.signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          result: MATCH_RESULT.PLAYER2_WON,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON);
        });

        it('should emit Transfer events with correct amount', async function () {
          await expect(this.tx)
            .to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user2.address, this.reward)
            .and.to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), payoutWallet.address, this.commission);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user2.address, this.matchId, this.reward);
        });
      });

      context('when commission = 0', function () {
        beforeEach(async function () {
          await this.contract.setCommissionRate(0);
          expect(await this.contract.commissionRate()).to.equal(0);

          this.reward = new BN(this.entryFee).mul(new BN(2)).toString();
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON);
        });

        it('should emit a Transfer event to the player2 without deducting commission fee', async function () {
          await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(this.contract.getAddress(), user2.address, this.reward);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user2.address, this.matchId, this.reward);
        });
      });
    });

    context('when successful with Draw', function () {
      beforeEach(async function () {
        this.signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          result: MATCH_RESULT.DRAW,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.DRAW, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx).to.emit(this.contract, 'MatchCompleted').withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.DRAW);
        });

        it('should emit Transfer events to payout wallet for commission, and users for refund', async function () {
          await expect(this.tx)
            .to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), payoutWallet.address, this.commission)
            .and.to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user.address, this.refund)
            .and.to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user2.address, this.refund);
        });

        it('should emit PayoutDelivered events for refund', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'PayoutDelivered')
            .withArgs(user.address, this.matchId, this.refund)
            .and.to.emit(this.contract, 'PayoutDelivered')
            .withArgs(user2.address, this.matchId, this.refund);
        });
      });

      context('when commission = 0', function () {
        beforeEach(async function () {
          await this.contract.setCommissionRate(0);
          expect(await this.contract.commissionRate()).to.equal(0);

          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.DRAW, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.be.false;
          expect(await this.contract.admitted(user2.address)).to.be.false;
        });

        it('should decrease the feeLocked amount', async function () {
          expect(await this.contract.feeLocked()).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx).to.emit(this.contract, 'MatchCompleted').withArgs(this.matchId, user.address, user2.address, MATCH_RESULT.DRAW);
        });

        it('should emit Transfer events to payout wallet for commission, and users for refund', async function () {
          await expect(this.tx)
            .to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user.address, this.entryFee)
            .and.to.emit(this.erc20, 'Transfer')
            .withArgs(this.contract.getAddress(), user2.address, this.entryFee);
        });

        it('should emit PayoutDelivered events for refund', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'PayoutDelivered')
            .withArgs(user.address, this.matchId, this.entryFee)
            .and.to.emit(this.contract, 'PayoutDelivered')
            .withArgs(user2.address, this.matchId, this.entryFee);
        });
      });
    });
  });

  context('Meta transaction', function () {
    it('returns the msg.sender', async function () {
      expect(await this.contract.__msgSender()).to.be.exist;
    });

    it('returns the msg.data', async function () {
      expect(await this.contract.__msgData()).to.be.exist;
    });
  });
});
