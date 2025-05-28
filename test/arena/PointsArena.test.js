const {ethers} = require('hardhat');
const {expect} = require('chai');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('PointsArena', function () {
  const CONSUME_REASON_CODE = ethers.encodeBytes32String('ARENA_ADMISSION');
  const REWARD_REASON_CODE = ethers.encodeBytes32String('ARENA_REWARD');
  const REFUND_REASON_CODE = ethers.encodeBytes32String('ARENA_REFUND');
  const COMMISSION_REASON_CODE = ethers.encodeBytes32String('ARENA_COMMISSION');

  const MATCH_RESULT = {
    PLAYER1_WON: 0,
    PLAYER2_WON: 1,
    DRAW: 2,
  };

  const COMMISSION_RATE_PRECISION = 10000;

  function formatUuid(uuid) {
    const abiCoder = new ethers.AbiCoder();
    const value = '0x' + uuid.replace(/-/g, '');
    return abiCoder.encode(['uint256'], [value]);
  }

  before(async function () {
    [deployer, messageSigner, payoutWallet, user, user2, userWithoutAllocation, pointsAdmin, pointsDepositor, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.points = await deployContract('PointsSpenderMock');

    this.name = 'Arena';
    this.version = '1.0';

    this.entryFee = 150;
    this.commissionRate = 600; // 6%
    this.commission = 18;
    this.reward = 282;
    this.refund = 141;

    this.contract = await deployContract(
      'PointsArenaMock',
      this.entryFee,
      this.commissionRate,
      messageSigner,
      payoutWallet,
      this.points,
      CONSUME_REASON_CODE,
      REWARD_REASON_CODE,
      REFUND_REASON_CODE,
      COMMISSION_REASON_CODE,
      this.forwarderRegistryAddress,
    );

    const POINTS_DEPOSIT_REASON_CODE = ethers.encodeBytes32String('POINTS_DEPOSIT');
    await this.points.connect(pointsDepositor).deposit(user.address, this.entryFee, POINTS_DEPOSIT_REASON_CODE);
    await this.points.connect(pointsDepositor).deposit(user2.address, this.entryFee, POINTS_DEPOSIT_REASON_CODE);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('should revert if the price is zero', async function () {
      await expect(
        deployContract(
          'PointsArenaMock',
          0,
          this.commissionRate,
          messageSigner,
          payoutWallet,
          this.points,
          CONSUME_REASON_CODE,
          REWARD_REASON_CODE,
          REFUND_REASON_CODE,
          COMMISSION_REASON_CODE,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'ZeroPrice');
    });

    context('when successful', function () {
      it('should set the POINTS address', async function () {
        expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
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

      it('should set the consume reason code', async function () {
        expect(await this.contract.CONSUME_REASON_CODE()).to.equal(CONSUME_REASON_CODE);
      });

      it('should set the reward reason code', async function () {
        expect(await this.contract.REWARD_REASON_CODE()).to.equal(REWARD_REASON_CODE);
      });

      it('should set the refund reason code', async function () {
        expect(await this.contract.REFUND_REASON_CODE()).to.equal(REFUND_REASON_CODE);
      });

      it('should set the commission reason code', async function () {
        expect(await this.contract.COMMISSION_REASON_CODE()).to.equal(COMMISSION_REASON_CODE);
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

    it('should revert if the commission cannot be evenly divided by 2', async function () {
      await expect(this.contract.setCommissionRate(500)).to.be.revertedWithCustomError(this.contract, 'InvalidCommissionRate').withArgs(500);
    });

    context('when successful setting a positive commission rate', function () {
      beforeEach(async function () {
        this.rate = 9899; // 98.99%
        this.tx = await this.contract.setCommissionRate(this.rate);
        this.commission = 296;
        this.reward = 4;
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
        expect(await this.contract.reward()).to.equal(this.entryFee * 2);
      });

      it('should emit a CommissionRateSet event', async function () {
        await expect(this.tx).to.emit(this.contract, 'CommissionRateSet').withArgs(this.rate);
      });
    });
  });

  describe('admit()', function () {
    it('should revert if the user does not have enough balance', async function () {
      await expect(this.contract.connect(userWithoutAllocation).admit())
        .to.be.revertedWithCustomError(this.points, 'InsufficientBalance')
        .withArgs(userWithoutAllocation, this.entryFee);
    });

    context('when trying to pay again before completing the match', function () {
      beforeEach(async function () {
        await this.contract.connect(user).admit();
      });

      it('should revert if the user already in game', async function () {
        await expect(this.contract.connect(user).admit()).to.be.revertedWithCustomError(this.contract, 'AlreadyAdmitted').withArgs(user.address);
      });
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.tx = await this.contract.connect(user).admit();
        this.admissionTime = (await ethers.provider.getBlock('latest')).timestamp;
      });

      it('should set user as admitted', async function () {
        expect(await this.contract.admitted(user.address)).to.equal(this.admissionTime);
      });

      it('should emit an Admission event', async function () {
        await expect(this.tx).to.emit(this.contract, 'Admission').withArgs(user.address);
      });

      it('should emit a Consumed event', async function () {
        await expect(this.tx).to.emit(this.points, 'Consumed').withArgs(this.contract, CONSUME_REASON_CODE, user.address, this.entryFee);
      });
    });
  });

  describe(`completeMatch(
      uint256 matchId,
      address player1,
      address player2,
      MatchResult result,
      bytes calldata signature
    )`, function () {
    beforeEach(async function () {
      await this.contract.connect(user).admit();
      this.player1AdmissionTime = (await ethers.provider.getBlock('latest')).timestamp;

      await this.contract.connect(user2).admit();
      this.player2AdmissionTime = (await ethers.provider.getBlock('latest')).timestamp;

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
          {name: 'player1AdmissionTime', type: 'uint256'},
          {name: 'player2AdmissionTime', type: 'uint256'},
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
        player1AdmissionTime: this.player1AdmissionTime,
        player2AdmissionTime: this.player2AdmissionTime,
        result: 3,
      });
      await expect(this.contract.completeMatch(this.matchId, user.address, user2.address, 3, signature)).to.be.revertedWithoutReason();
    });

    it('should revert if the player1 is not admitted', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user2.address,
        player1AdmissionTime: this.player1AdmissionTime,
        player2AdmissionTime: this.player2AdmissionTime,
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
        player2: user2.address,
        player1AdmissionTime: this.player1AdmissionTime,
        player2AdmissionTime: this.player2AdmissionTime,
        result: MATCH_RESULT.PLAYER2_WON,
      });
      await expect(this.contract.completeMatch(this.matchId, user.address, userWithoutAllocation.address, MATCH_RESULT.PLAYER2_WON, signature))
        .to.be.revertedWithCustomError(this.contract, 'PlayerNotAdmitted')
        .withArgs(userWithoutAllocation.address);
    });

    it('should revert if signature is invalid', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user.address, // same as player1
        player1AdmissionTime: this.player1AdmissionTime,
        player2AdmissionTime: this.player2AdmissionTime,
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
          player1AdmissionTime: this.player1AdmissionTime,
          player2AdmissionTime: this.player2AdmissionTime,
          result: MATCH_RESULT.PLAYER1_WON,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.PLAYER1_WON);
        });

        it('should emit Deposited events with correct amount', async function () {
          await expect(this.tx)
            .to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REWARD_REASON_CODE, user.address, this.reward)
            .and.to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), COMMISSION_REASON_CODE, payoutWallet.address, this.commission);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user.address, this.matchId, this.reward);
        });
      });

      context('when commission = 0', function () {
        beforeEach(async function () {
          await this.contract.setCommissionRate(0);
          expect(await this.contract.commissionRate()).to.equal(0);

          this.reward = this.entryFee * 2;

          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER1_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.PLAYER1_WON);
        });

        it('should emit a Deposited event to the player1 without deducting commission fee', async function () {
          await expect(this.tx).to.emit(this.points, 'Deposited').withArgs(this.contract.getAddress(), REWARD_REASON_CODE, user.address, this.reward);
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
          player1AdmissionTime: this.player1AdmissionTime,
          player2AdmissionTime: this.player2AdmissionTime,
          result: MATCH_RESULT.PLAYER2_WON,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.PLAYER2_WON);
        });

        it('should emit Deposited events with correct amount', async function () {
          await expect(this.tx)
            .to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REWARD_REASON_CODE, user2.address, this.reward)
            .and.to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), COMMISSION_REASON_CODE, payoutWallet.address, this.commission);
        });

        it('should emit a PayoutDelivered event', async function () {
          await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user2.address, this.matchId, this.reward);
        });
      });

      context('when commission = 0', function () {
        beforeEach(async function () {
          await this.contract.setCommissionRate(0);
          expect(await this.contract.commissionRate()).to.equal(0);

          this.reward = this.entryFee * 2;

          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.PLAYER2_WON, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.PLAYER2_WON);
        });

        it('should emit a Deposited event to the player2 without deducting commission fee', async function () {
          await expect(this.tx)
            .to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REWARD_REASON_CODE, user2.address, this.reward);
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
          player1AdmissionTime: this.player1AdmissionTime,
          player2AdmissionTime: this.player2AdmissionTime,
          result: MATCH_RESULT.DRAW,
        });
      });

      context('when commission > 0', function () {
        beforeEach(async function () {
          this.tx = await this.contract.completeMatch(this.matchId, user.address, user2.address, MATCH_RESULT.DRAW, this.signature);
        });

        it('should remove the users from the storage', async function () {
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.DRAW);
        });

        it('should emit Deposited events to payout wallet for commission, and users for refund', async function () {
          await expect(this.tx)
            .to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), COMMISSION_REASON_CODE, payoutWallet.address, this.commission)
            .and.to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REFUND_REASON_CODE, user.address, this.refund)
            .and.to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REFUND_REASON_CODE, user2.address, this.refund);
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
          expect(await this.contract.admitted(user.address)).to.equal(0);
          expect(await this.contract.admitted(user2.address)).to.equal(0);
        });

        it('should emit a MatchResolved event', async function () {
          await expect(this.tx)
            .to.emit(this.contract, 'MatchCompleted')
            .withArgs(this.matchId, user.address, user2.address, this.player1AdmissionTime, this.player2AdmissionTime, MATCH_RESULT.DRAW);
        });

        it('should emit Deposited events to payout wallet for commission, and users for refund', async function () {
          await expect(this.tx)
            .to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REFUND_REASON_CODE, user.address, this.entryFee)
            .and.to.emit(this.points, 'Deposited')
            .withArgs(this.contract.getAddress(), REFUND_REASON_CODE, user2.address, this.entryFee);
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
