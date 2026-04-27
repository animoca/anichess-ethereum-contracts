const {ethers} = require('hardhat');
const {expect} = require('chai');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

const contractName = 'GambitMock';

const JoinMatch712Type = {
  JoinMatch: [
    {name: 'matchId', type: 'uint256'},
    {name: 'player', type: 'address'},
    {name: 'playerMoveKey', type: 'address'},
    {name: 'matchDeadline', type: 'uint256'},
  ],
};

const CompleteMatch712Type = {
  CompleteMatch: [
    {name: 'matchId', type: 'uint256'},
    {name: 'winner', type: 'address'},
  ],
};

const RefundMatch712Type = {
  RefundMatch: [
    {name: 'matchId', type: 'uint256'},
    {name: 'player', type: 'address'},
  ],
};

const DrawMatch712Type = {
  DrawMatch: [
    {name: 'matchId', type: 'uint256'},
    {name: 'player', type: 'address'},
  ],
};

describe('Gambit', function () {
  let deployer, player1, player2, payoutWallet, signer, admin, other;

  before(async function () {
    [deployer, player1, player2, payoutWallet, signer, admin, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.buyIn = 1000n;
    this.platformFee = 10n;

    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.token = await deployContract(
      'ERC20FixedSupply',
      '',
      '',
      18,
      [player1.address, player2.address],
      [100000n, 100000n],
      this.forwarderRegistryAddress,
    );
    this.contractNoFee = await deployContract(
      contractName,
      payoutWallet.address,
      await this.token.getAddress(),
      this.buyIn,
      0n,
      this.forwarderRegistryAddress,
    );
    this.contract = await deployContract(
      contractName,
      payoutWallet.address,
      await this.token.getAddress(),
      this.buyIn,
      this.platformFee,
      this.forwarderRegistryAddress,
    );
    this.receiverContract = await deployContract('GambitMatchCompleteCallbackMock', await this.contract.getAddress());
    this.invalidReceiverContract = await deployContract('InvalidGambitMatchCompleteCallbackMock', await this.contract.getAddress());
    this.receiverContractNoFee = await deployContract('GambitMatchCompleteCallbackMock', await this.contractNoFee.getAddress());
    await this.token.connect(player1).approve(await this.contract.getAddress(), 100000n);
    await this.token.connect(player2).approve(await this.contract.getAddress(), 100000n);
    await this.token.connect(player1).approve(await this.contractNoFee.getAddress(), 100000n);
    await this.token.connect(player2).approve(await this.contractNoFee.getAddress(), 100000n);

    this.adminRole = await this.contract.ADMIN_ROLE();
    await this.contract.connect(deployer).grantRole(this.adminRole, admin.address);

    this.refereeRole = await this.contract.REFEREE_ROLE();
    await this.contract.connect(deployer).grantRole(this.refereeRole, signer.address);
    await this.contractNoFee.connect(deployer).grantRole(this.refereeRole, signer.address);

    this.domain = {
      name: 'Gambit',
      version: '1',
      chainId: await getChainId(),
      verifyingContract: await this.contract.getAddress(),
    };
    this.domainNoFee = {
      ...this.domain,
      verifyingContract: await this.contractNoFee.getAddress(),
    };

    this.player1MoveKey = ethers.Wallet.createRandom().address;
    this.player2MoveKey = ethers.Wallet.createRandom().address;
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('sets the payout wallet correctly', async function () {
      expect(await this.contract.payoutWallet()).to.equal(payoutWallet.address);
    });

    it('sets the buyin token correctly', async function () {
      expect(await this.contract.BUYIN_TOKEN()).to.equal(await this.token.getAddress());
    });

    it('sets the buyin amount correctly', async function () {
      expect(await this.contract.buyIn()).to.equal(this.buyIn);
    });

    it('sets the platform fee correctly', async function () {
      expect(await this.contract.platformFee()).to.equal(this.platformFee);
    });

    it('sets the platform fee correctly if it is zero', async function () {
      const contractZeroFee = await deployContract(
        contractName,
        payoutWallet.address,
        await this.token.getAddress(),
        10n,
        0n,
        this.forwarderRegistryAddress,
      );
      expect(await contractZeroFee.platformFee()).to.equal(0n);
    });
  });

  describe('setMatchCompleteCallback', function () {
    it('revert if not called by the owner', async function () {
      await expect(this.contract.connect(other).setMatchCompleteCallback(await this.receiverContract.getAddress()))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(deployer).setMatchCompleteCallback(await this.receiverContract.getAddress());
      });

      it('sets the match complete callback correctly', async function () {
        expect(await this.contract.matchCompleteCallback()).to.equal(await this.receiverContract.getAddress());
      });

      it('emits the MatchCompleteCallbackUpdated event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'MatchCompleteCallbackUpdated')
          .withArgs(await this.receiverContract.getAddress());
      });
    });
  });

  describe('setPlatformFee', function () {
    it('revert if the platform fee is above the buyin amount', async function () {
      await expect(this.contract.connect(admin).setPlatformFee((await this.contract.buyIn()) + 1n))
        .to.be.revertedWithCustomError(this.contract, 'PlatformFeeExceedsBuyIn')
        .withArgs(1000n, 1001n);
    });

    it('revert if not called by the owner', async function () {
      await expect(this.contract.connect(other).setPlatformFee(500n))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.adminRole, other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(admin).setPlatformFee(500n);
      });

      it('sets the platform fee correctly', async function () {
        expect(await this.contract.platformFee()).to.equal(500n);
      });

      it('emits the PlatformFeeUpdated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'PlatformFeeUpdated').withArgs(10n, 500n);
      });
    });
  });

  describe('setBuyIn', function () {
    it('revert if the platform fee is above the new buyin amount', async function () {
      await expect(this.contract.connect(admin).setBuyIn((await this.contract.platformFee()) - 1n))
        .to.be.revertedWithCustomError(this.contract, 'PlatformFeeExceedsBuyIn')
        .withArgs(9n, 10n);
    });

    it('revert if not called by the owner', async function () {
      await expect(this.contract.connect(other).setBuyIn(500n))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.adminRole, other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.connect(admin).setBuyIn(500n);
      });

      it('sets the buyin amount correctly', async function () {
        expect(await this.contract.buyIn()).to.equal(500n);
      });

      it('emits the BuyInUpdated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'BuyInUpdated').withArgs(1000n, 500n);
      });
    });
  });

  describe('isMatchConcluded', function () {
    beforeEach(async function () {
      await this.contract.connect(deployer).unpause();
      this.matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      this.player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline: this.matchDeadline,
      });
      this.player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline: this.matchDeadline,
      });
    });

    context('Both players joined', function () {
      beforeEach(async function () {
        await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.player1JoinMatchSig);
        await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.player2JoinMatchSig);
      });

      it('returns false if the match is not concluded', async function () {
        const isConcluded = await this.contract.isMatchConcluded(0n);
        expect(isConcluded).to.be.false;
      });

      it('returns true if the match is concluded', async function () {
        const completeSignature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
          matchId: 0n,
          winner: player1.address,
        });
        await this.contract.connect(other).completeMatch(0n, player1.address, completeSignature);
        const isConcluded = await this.contract.isMatchConcluded(0n);
        expect(isConcluded).to.be.true;
      });

      it('returns true if the match is refunded', async function () {
        const player1RefundSig = await signer.signTypedData(this.domain, RefundMatch712Type, {
          matchId: 0n,
          player: player1.address,
        });
        const player2RefundSig = await signer.signTypedData(this.domain, RefundMatch712Type, {
          matchId: 0n,
          player: player2.address,
        });
        await this.contract.connect(other).refundMatch(0n, player1.address, player1RefundSig);
        await this.contract.connect(other).refundMatch(0n, player2.address, player2RefundSig);
        const isConcluded = await this.contract.isMatchConcluded(0n);
        expect(isConcluded).to.be.true;
      });
    });

    context('Only 1 player joined', function () {
      beforeEach(async function () {
        await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.player1JoinMatchSig);
      });

      it('returns false if the match is not concluded', async function () {
        const isConcluded = await this.contract.isMatchConcluded(0n);
        expect(isConcluded).to.be.false;
      });

      it('returns true if the match is refunded', async function () {
        const refundSignature = await signer.signTypedData(this.domain, RefundMatch712Type, {
          matchId: 0n,
          player: player1.address,
        });
        await this.contract.connect(other).refundMatch(0n, player1.address, refundSignature);
        const isConcluded = await this.contract.isMatchConcluded(0n);
        expect(isConcluded).to.be.true;
      });
    });
  });

  describe('joinMatch', function () {
    it('revert if the match deadline has passed', async function () {
      const matchDeadline = Math.floor(Date.now() / 1000) - 10;
      const signature = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await expect(
        this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signature),
      ).to.be.revertedWithCustomError(this.contract, 'ExpiredSignature');
    });

    it('revert if the player address is invalid', async function () {
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: ethers.ZeroAddress,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await expect(
        this.contract.connect(player1).joinMatch(0n, ethers.ZeroAddress, this.player1MoveKey, matchDeadline, signature),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPlayer');
    });

    it('revert if the player move key is invalid', async function () {
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: ethers.ZeroAddress,
        matchDeadline,
      });
      await expect(
        this.contract.connect(player1).joinMatch(0n, player1.address, ethers.ZeroAddress, matchDeadline, signature),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPlayerMoveKey');
    });

    it('revert if it is paused', async function () {
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const signature = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await expect(
        this.contract.connect(other).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signature),
      ).to.be.revertedWithCustomError(this.contract, 'Paused');
    });

    it('revert if the signature is invalid', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const invalidSignature = await other.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await expect(this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, invalidSignature))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.refereeRole, other.address);
    });

    it('revert if the match is already concluded', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const signaturePlayer1 = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      const signaturePlayer2 = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signaturePlayer1);
      await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, signaturePlayer2);
      const signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
        matchId: 0n,
        winner: player1.address,
      });
      await this.contract.connect(player1).completeMatch(0n, player1.address, signature);

      await expect(this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signaturePlayer1))
        .to.be.revertedWithCustomError(this.contract, 'MatchAlreadyConcluded')
        .withArgs(0n);
    });

    it('revert if the match is full', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const signatureWhite = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      const signatureBlack = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signatureWhite);
      await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, signatureBlack);
      await expect(this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, signatureWhite))
        .to.be.revertedWithCustomError(this.contract, 'MatchIsFull')
        .withArgs(0n);
    });

    context('when successful (Player1 first)', function () {
      beforeEach(async function () {
        await this.contract.connect(deployer).unpause();
        this.matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        this.signature = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player1.address,
          playerMoveKey: this.player1MoveKey,
          matchDeadline: this.matchDeadline,
        });
        this.receiptPlayer1 = await this.contract
          .connect(player1)
          .joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.signature);
      });

      it('reverts if player1 tries to join again', async function () {
        await expect(this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.signature))
          .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyJoined')
          .withArgs(0n, player1.address);
      });

      context('Player1 joined', function () {
        it('emits a PlayerJoined event', async function () {
          await expect(this.receiptPlayer1)
            .to.emit(this.contract, 'PlayerJoined')
            .withArgs(0n, player1.address, this.player1MoveKey, true, this.buyIn, this.platformFee);
        });

        it('sets the match details correctly', async function () {
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1).to.equal(player1.address);
          expect(matchDetail.p1MoveKey).to.equal(this.player1MoveKey);
          expect(matchDetail.p1Balance).to.equal(this.buyIn);
          expect(matchDetail.platformFee).to.equal(this.platformFee);
          expect(matchDetail.p2).to.equal(ethers.ZeroAddress);
          expect(matchDetail.p2MoveKey).to.equal(ethers.ZeroAddress);
          expect(matchDetail.p2Balance).to.equal(0);
        });
      });

      context('Player2 joined', function () {
        beforeEach(async function () {
          this.signaturePlayer2 = await signer.signTypedData(this.domain, JoinMatch712Type, {
            matchId: 0n,
            player: player2.address,
            playerMoveKey: this.player2MoveKey,
            matchDeadline: this.matchDeadline,
          });
          this.receiptPlayer2 = await this.contract
            .connect(player2)
            .joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.signaturePlayer2);
        });

        it('emits a PlayerJoined event', async function () {
          await expect(this.receiptPlayer2)
            .to.emit(this.contract, 'PlayerJoined')
            .withArgs(0n, player2.address, this.player2MoveKey, false, this.buyIn, this.platformFee);
        });

        it('sets the match details correctly', async function () {
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1).to.equal(player1.address);
          expect(matchDetail.p1MoveKey).to.equal(this.player1MoveKey);
          expect(matchDetail.p1Balance).to.equal(this.buyIn);
          expect(matchDetail.platformFee).to.equal(this.platformFee);
          expect(matchDetail.p2).to.equal(player2.address);
          expect(matchDetail.p2MoveKey).to.equal(this.player2MoveKey);
          expect(matchDetail.p2Balance).to.equal(this.buyIn);
        });
      });
    });

    context('when successful (Player2 first)', function () {
      beforeEach(async function () {
        await this.contract.connect(deployer).unpause();
        this.matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        this.signaturePlayer2 = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player2.address,
          playerMoveKey: this.player2MoveKey,
          matchDeadline: this.matchDeadline,
        });
        this.receiptPlayer2 = await this.contract
          .connect(player2)
          .joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.signaturePlayer2);
      });

      it('reverts if Player2 tries to join again', async function () {
        await expect(this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.signaturePlayer2))
          .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyJoined')
          .withArgs(0n, player2.address);
      });

      context('Player2 joined', function () {
        it('emits a PlayerJoined event', async function () {
          await expect(this.receiptPlayer2)
            .to.emit(this.contract, 'PlayerJoined')
            .withArgs(0n, player2.address, this.player2MoveKey, true, this.buyIn, this.platformFee);
        });

        it('sets the match details correctly', async function () {
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1).to.equal(player2.address);
          expect(matchDetail.p1MoveKey).to.equal(this.player2MoveKey);
          expect(matchDetail.p1Balance).to.equal(this.buyIn);
          expect(matchDetail.platformFee).to.equal(this.platformFee);
          expect(matchDetail.p2).to.equal(ethers.ZeroAddress);
          expect(matchDetail.p2MoveKey).to.equal(ethers.ZeroAddress);
          expect(matchDetail.p2Balance).to.equal(0);
        });
      });

      context('Player1 joined', function () {
        beforeEach(async function () {
          this.signaturePlayer1 = await signer.signTypedData(this.domain, JoinMatch712Type, {
            matchId: 0n,
            player: player1.address,
            playerMoveKey: this.player1MoveKey,
            matchDeadline: this.matchDeadline,
          });
          this.receiptPlayer1 = await this.contract
            .connect(player1)
            .joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.signaturePlayer1);
        });

        it('emits a PlayerJoined event', async function () {
          await expect(this.receiptPlayer1)
            .to.emit(this.contract, 'PlayerJoined')
            .withArgs(0n, player1.address, this.player1MoveKey, false, this.buyIn, this.platformFee);
        });

        it('sets the match details correctly', async function () {
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1).to.equal(player2.address);
          expect(matchDetail.p1MoveKey).to.equal(this.player2MoveKey);
          expect(matchDetail.p1Balance).to.equal(this.buyIn);
          expect(matchDetail.platformFee).to.equal(this.platformFee);
          expect(matchDetail.p2).to.equal(player1.address);
          expect(matchDetail.p2MoveKey).to.equal(this.player1MoveKey);
          expect(matchDetail.p2Balance).to.equal(this.buyIn);
        });
      });
    });
  });

  describe('completeMatch', function () {
    it('revert if the match is not started', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);

      const signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
        matchId: 0n,
        winner: player1.address,
      });
      await expect(this.contract.connect(other).completeMatch(0n, player1.address, signature))
        .to.be.revertedWithCustomError(this.contract, 'InsufficientMatchBalance')
        .withArgs(0n);
    });

    it('revert if the match complete callback is invalid', async function () {
      await this.contract.connect(deployer).setMatchCompleteCallback(await this.invalidReceiverContract.getAddress());
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      const player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
      await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
      const signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
        matchId: 0n,
        winner: player1.address,
      });
      await expect(this.contract.connect(other).completeMatch(0n, player1.address, signature))
        .to.be.revertedWithCustomError(this.contract, 'CallbackRejected')
        .withArgs(
          await this.invalidReceiverContract.getAddress(),
          0n,
          player1.address,
          player2.address,
          (this.buyIn - this.platformFee) * 2n,
          this.platformFee * 2n,
        );
    });

    context('platform fee is not zero', function () {
      beforeEach(async function () {
        await this.contract.connect(deployer).unpause();
        const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player1.address,
          playerMoveKey: this.player1MoveKey,
          matchDeadline,
        });
        const player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player2.address,
          playerMoveKey: this.player2MoveKey,
          matchDeadline,
        });
        await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
        await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
      });

      it('revert if the player is not part of the match', async function () {
        const signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
          matchId: 0n,
          winner: other.address,
        });
        await expect(this.contract.connect(other).completeMatch(0n, other.address, signature))
          .to.be.revertedWithCustomError(this.contract, 'NotMatchPlayer')
          .withArgs(0n, other.address);
      });

      it('revert if the signature is invalid', async function () {
        const invalidSignature = await other.signTypedData(this.domain, CompleteMatch712Type, {
          matchId: 0n,
          winner: player1.address,
        });
        await expect(this.contract.connect(other).completeMatch(0n, player1.address, invalidSignature))
          .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
          .withArgs(this.refereeRole, other.address);
      });

      context('without callback', function () {
        context('when successful (Player1 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
              matchId: 0n,
              winner: player1.address,
            });
            this.receipt = await this.contract.connect(other).completeMatch(0n, player1.address, this.signature);
            this.expectedPrize = (this.buyIn - this.platformFee) * 2n;
          });

          it('revert if the match is completed again', async function () {
            await expect(this.contract.connect(other).completeMatch(0n, player1.address, this.signature))
              .to.be.revertedWithCustomError(this.contract, 'InsufficientMatchBalance')
              .withArgs(0n);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchCompleted').withArgs(0n, player1.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n + 1980n);
            expect(player2Balance).to.equal(100000n - 1000n);
            expect(payoutWalletBalance).to.equal(20n);
          });

          it('does not call the match complete callback', async function () {
            await expect(this.receipt).not.to.emit(this.receiverContract, 'OnMatchCompletedCalled');
          });
        });

        context('when successful (Player2 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
              matchId: 0n,
              winner: player2.address,
            });
            this.receipt = await this.contract.connect(other).completeMatch(0n, player2.address, this.signature);
            this.expectedPrize = (this.buyIn - this.platformFee) * 2n;
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchCompleted').withArgs(0n, player2.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 1980n);
            expect(payoutWalletBalance).to.equal(20n);
          });

          it('does not call the match complete callback', async function () {
            await expect(this.receipt).not.to.emit(this.receiverContract, 'OnMatchCompletedCalled');
          });
        });
      });

      context('with callback', function () {
        beforeEach(async function () {
          await this.contract.connect(deployer).setMatchCompleteCallback(await this.receiverContract.getAddress());
        });

        context('when successful (Player1 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
              matchId: 0n,
              winner: player1.address,
            });
            this.receipt = await this.contract.connect(other).completeMatch(0n, player1.address, this.signature);
            this.expectedPrize = (this.buyIn - this.platformFee) * 2n;
          });

          it('revert if the match is completed again', async function () {
            await expect(this.contract.connect(other).completeMatch(0n, player1.address, this.signature))
              .to.be.revertedWithCustomError(this.contract, 'InsufficientMatchBalance')
              .withArgs(0n);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchCompleted').withArgs(0n, player1.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n + 1980n);
            expect(player2Balance).to.equal(100000n - 1000n);
            expect(payoutWalletBalance).to.equal(20n);
          });

          it('calls the match complete callback', async function () {
            await expect(this.receipt)
              .to.emit(this.receiverContract, 'OnMatchCompletedCalled')
              .withArgs(0n, player1.address, player2.address, this.expectedPrize, this.platformFee * 2n);
          });
        });

        context('when successful (Player2 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
              matchId: 0n,
              winner: player2.address,
            });
            this.receipt = await this.contract.connect(other).completeMatch(0n, player2.address, this.signature);
            this.expectedPrize = (this.buyIn - this.platformFee) * 2n;
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchCompleted').withArgs(0n, player2.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 1980n);
            expect(payoutWalletBalance).to.equal(20n);
          });

          it('calls the match complete callback', async function () {
            await expect(this.receipt)
              .to.emit(this.receiverContract, 'OnMatchCompletedCalled')
              .withArgs(0n, player2.address, player1.address, this.expectedPrize, this.platformFee * 2n);
          });
        });
      });
    });

    context('platform fee is zero', function () {
      beforeEach(async function () {
        await this.contractNoFee.connect(deployer).unpause();
        const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        const player1JoinMatchSig = await signer.signTypedData(this.domainNoFee, JoinMatch712Type, {
          matchId: 0n,
          player: player1.address,
          playerMoveKey: this.player1MoveKey,
          matchDeadline,
        });
        const player2JoinMatchSig = await signer.signTypedData(this.domainNoFee, JoinMatch712Type, {
          matchId: 0n,
          player: player2.address,
          playerMoveKey: this.player2MoveKey,
          matchDeadline,
        });
        await this.contractNoFee.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
        await this.contractNoFee.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
        this.expectedPrize = this.buyIn * 2n;
      });

      context('without callback', function () {
        context('when successful (Player1 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domainNoFee, CompleteMatch712Type, {
              matchId: 0n,
              winner: player1.address,
            });
            this.receipt = await this.contractNoFee.connect(other).completeMatch(0n, player1.address, this.signature);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchCompleted').withArgs(0n, player1.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n + 2000n);
            expect(player2Balance).to.equal(100000n - 1000n);
            expect(payoutWalletBalance).to.equal(0n);
          });

          it('does not call the match complete callback', async function () {
            await expect(this.receipt).to.not.emit(this.receiverContractNoFee, 'OnMatchCompletedCalled');
          });
        });

        context('when successful (Player2 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domainNoFee, CompleteMatch712Type, {
              matchId: 0n,
              winner: player2.address,
            });
            this.receipt = await this.contractNoFee.connect(other).completeMatch(0n, player2.address, this.signature);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchCompleted').withArgs(0n, player2.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 2000n);
            expect(payoutWalletBalance).to.equal(0n);
          });

          it('does not call the match complete callback', async function () {
            await expect(this.receipt).to.not.emit(this.receiverContractNoFee, 'OnMatchCompletedCalled');
          });
        });
      });

      context('with callback', function () {
        beforeEach(async function () {
          await this.contractNoFee.connect(deployer).setMatchCompleteCallback(await this.receiverContractNoFee.getAddress());
        });

        context('when successful (Player1 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domainNoFee, CompleteMatch712Type, {
              matchId: 0n,
              winner: player1.address,
            });
            this.receipt = await this.contractNoFee.connect(other).completeMatch(0n, player1.address, this.signature);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchCompleted').withArgs(0n, player1.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n + 2000n);
            expect(player2Balance).to.equal(100000n - 1000n);
            expect(payoutWalletBalance).to.equal(0n);
          });

          it('calls the match complete callback', async function () {
            await expect(this.receipt)
              .to.emit(this.receiverContractNoFee, 'OnMatchCompletedCalled')
              .withArgs(0n, player1.address, player2.address, this.expectedPrize, 0n);
          });
        });

        context('when successful (Player2 wins)', function () {
          beforeEach(async function () {
            this.signature = await signer.signTypedData(this.domainNoFee, CompleteMatch712Type, {
              matchId: 0n,
              winner: player2.address,
            });
            this.receipt = await this.contractNoFee.connect(other).completeMatch(0n, player2.address, this.signature);
          });

          it('emits a MatchCompleted event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchCompleted').withArgs(0n, player2.address, this.expectedPrize);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });

          it('transfers the prize correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 2000n);
            expect(payoutWalletBalance).to.equal(0n);
          });

          it('calls the match complete callback', async function () {
            await expect(this.receipt)
              .to.emit(this.receiverContractNoFee, 'OnMatchCompletedCalled')
              .withArgs(0n, player2.address, player1.address, this.expectedPrize, 0n);
          });
        });
      });
    });
  });

  describe('refundMatch', function () {
    beforeEach(async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      const player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
      await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
    });

    it('revert if the signature is invalid', async function () {
      const invalidSignature = await other.signTypedData(this.domain, RefundMatch712Type, {
        matchId: 0n,
        player: other.address,
      });
      await expect(this.contract.connect(other).refundMatch(0n, other.address, invalidSignature))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.refereeRole, other.address);
    });

    it('revert if the match is already concluded', async function () {
      const completeSignature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
        matchId: 0n,
        winner: player1.address,
      });
      await this.contract.connect(other).completeMatch(0n, player1.address, completeSignature);

      const refundSignature = await signer.signTypedData(this.domain, RefundMatch712Type, {
        matchId: 0n,
        player: player1.address,
      });
      await expect(this.contract.connect(other).refundMatch(0n, player1.address, refundSignature))
        .to.be.revertedWithCustomError(this.contract, 'MatchAlreadyConcluded')
        .withArgs(0n);
    });

    context('when successful', function () {
      it('revert if the player is invalid', async function () {
        const refundSignature = await signer.signTypedData(this.domain, RefundMatch712Type, {
          matchId: 0n,
          player: ethers.ZeroAddress,
        });
        await expect(this.contract.connect(other).refundMatch(0n, ethers.ZeroAddress, refundSignature)).to.be.revertedWithCustomError(
          this.contract,
          'InvalidPlayer',
        );
      });

      it('revert if the player is not part of the match', async function () {
        const refundSignature = await signer.signTypedData(this.domain, RefundMatch712Type, {
          matchId: 0n,
          player: other.address,
        });
        await expect(this.contract.connect(other).refundMatch(0n, other.address, refundSignature))
          .to.be.revertedWithCustomError(this.contract, 'NotMatchPlayer')
          .withArgs(0n, other.address);
      });

      context('Player1 first', function () {
        beforeEach(async function () {
          this.refundSignaturePlayer1 = await signer.signTypedData(this.domain, RefundMatch712Type, {
            matchId: 0n,
            player: player1.address,
          });
          this.receipt = await this.contract.connect(other).refundMatch(0n, player1.address, this.refundSignaturePlayer1);
        });

        it('revert if Player1 try to refund again', async function () {
          await expect(this.contract.connect(other).refundMatch(0n, player1.address, this.refundSignaturePlayer1))
            .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyRefunded')
            .withArgs(0n, player1.address);
        });

        context('Player1 Refunded', function () {
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, 1000n);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(1000n);
          });

          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            expect(player1Balance).to.equal(100000n - 1000n + 1000n);
            expect(player2Balance).to.equal(100000n - 1000n);
          });
        });

        context('Player2 refunded', function () {
          beforeEach(async function () {
            this.refundSignaturePlayer2 = await signer.signTypedData(this.domain, RefundMatch712Type, {
              matchId: 0n,
              player: player2.address,
            });
            this.receiptPlayer2 = await this.contract.connect(other).refundMatch(0n, player2.address, this.refundSignaturePlayer2);
          });

          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer2).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, 1000n);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
          });

          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            expect(player1Balance).to.equal(100000n - 1000n + 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 1000n);
          });
        });
      });

      context('Player2 first', function () {
        beforeEach(async function () {
          this.refundSignaturePlayer2 = await signer.signTypedData(this.domain, RefundMatch712Type, {
            matchId: 0n,
            player: player2.address,
          });
          this.receipt = await this.contract.connect(other).refundMatch(0n, player2.address, this.refundSignaturePlayer2);
        });

        it('revert if Player2 try to refund again', async function () {
          await expect(this.contract.connect(other).refundMatch(0n, player2.address, this.refundSignaturePlayer2))
            .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyRefunded')
            .withArgs(0n, player2.address);
        });

        context('Player2 Refunded', function () {
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, 1000n);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(1000n);
            expect(matchDetail.p2Balance).to.equal(0n);
          });

          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            expect(player1Balance).to.equal(100000n - 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 1000n);
          });
        });

        context('Player1 refunded', function () {
          beforeEach(async function () {
            this.refundSignaturePlayer1 = await signer.signTypedData(this.domain, RefundMatch712Type, {
              matchId: 0n,
              player: player1.address,
            });
            this.receiptPlayer1 = await this.contract.connect(other).refundMatch(0n, player1.address, this.refundSignaturePlayer1);
          });

          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer1).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, 1000n);
          });

          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
          });

          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            expect(player1Balance).to.equal(100000n - 1000n + 1000n);
            expect(player2Balance).to.equal(100000n - 1000n + 1000n);
          });
        });
      });
    });
  });

  describe('drawMatch', function () {
    it('revert if the signature is invalid', async function () {
      const invalidSignature = await other.signTypedData(this.domain, RefundMatch712Type, {
        matchId: 0n,
        player: other.address,
      });
      await expect(this.contract.connect(other).refundMatch(0n, other.address, invalidSignature))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.refereeRole, other.address);
    });

    it('revert if the match does not have enough players', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 1n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(1n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);

      const drawSignature = await signer.signTypedData(this.domain, DrawMatch712Type, {
        matchId: 1n,
        player: player1.address,
      });
      await expect(this.contract.connect(other).drawMatch(1n, player1.address, drawSignature))
        .to.be.revertedWithCustomError(this.contract, 'InsufficientPlayers')
        .withArgs(1n);
    });

    it('revert if the match already concluded', async function () {
      await this.contract.connect(deployer).unpause();
      const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline,
      });
      const player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline,
      });
      await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
      await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
      const completeSignature = await signer.signTypedData(this.domain, CompleteMatch712Type, {
        matchId: 0n,
        winner: player1.address,
      });
      await this.contract.connect(other).completeMatch(0n, player1.address, completeSignature);

      const drawSignature = await signer.signTypedData(this.domain, DrawMatch712Type, {
        matchId: 0n,
        player: player1.address,
      });
      await expect(this.contract.connect(other).drawMatch(0n, player1.address, drawSignature))
        .to.be.revertedWithCustomError(this.contract, 'MatchAlreadyConcluded')
        .withArgs(0n);
    });

    context('platform fee is not zero', function () {
      beforeEach(async function () {
        await this.contract.connect(deployer).unpause();
        const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        const player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player1.address,
          playerMoveKey: this.player1MoveKey,
          matchDeadline,
        });
        const player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
          matchId: 0n,
          player: player2.address,
          playerMoveKey: this.player2MoveKey,
          matchDeadline,
        });
        await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
        await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
      });

      it('revert if the player is invalid', async function () {
        const drawSignature = await signer.signTypedData(this.domain, DrawMatch712Type, {
          matchId: 0n,
          player: ethers.ZeroAddress,
        });
        await expect(this.contract.connect(other).drawMatch(0n, ethers.ZeroAddress, drawSignature))
          .to.be.revertedWithCustomError(this.contract, 'NotMatchPlayer')
          .withArgs(0n, ethers.ZeroAddress);
      });

      it('revert if the player is invalid (no fee calculation)', async function () {
        const player1DrawSignature = await signer.signTypedData(this.domain, DrawMatch712Type, {
          matchId: 0n,
          player: player1.address,
        });
        await this.contract.connect(other).drawMatch(0n, player1.address, player1DrawSignature);
        const drawSignature = await signer.signTypedData(this.domain, DrawMatch712Type, {
          matchId: 0n,
          player: ethers.ZeroAddress,
        });
        await expect(this.contract.connect(other).drawMatch(0n, ethers.ZeroAddress, drawSignature))
          .to.be.revertedWithCustomError(this.contract, 'NotMatchPlayer')
          .withArgs(0n, ethers.ZeroAddress);
      });

      context('when successful (Player1 first)', function () {
        beforeEach(async function () {
          this.drawSignaturePlayer1 = await signer.signTypedData(this.domain, DrawMatch712Type, {
            matchId: 0n,
            player: player1.address,
          });
          this.receipt = await this.contract.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1);
          this.expectedRefund = this.buyIn - this.platformFee;
        });
        context('Player1 Refunded', function () {
          it('revert if Player1 try to refund again', async function () {
            await expect(this.contract.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1))
              .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyRefunded')
              .withArgs(0n, player1.address);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(this.expectedRefund);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn);
            expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
          });
        });

        context('Player2 refunded', function () {
          beforeEach(async function () {
            this.drawSignaturePlayer2 = await signer.signTypedData(this.domain, DrawMatch712Type, {
              matchId: 0n,
              player: player2.address,
            });
            this.receiptPlayer2 = await this.contract.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer2).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
          });
        });
      });

      context('when successful (Player2 first)', function () {
        beforeEach(async function () {
          this.drawSignaturePlayer2 = await signer.signTypedData(this.domain, DrawMatch712Type, {
            matchId: 0n,
            player: player2.address,
          });
          this.receipt = await this.contract.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2);
          this.expectedRefund = this.buyIn - this.platformFee;
        });
        context('Player2 Refunded', function () {
          it('revert if Player2 try to refund again', async function () {
            await expect(this.contract.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2))
              .to.be.revertedWithCustomError(this.contract, 'PlayerAlreadyRefunded')
              .withArgs(0n, player2.address);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(this.expectedRefund);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
          });
        });
        context('Player1 refunded', function () {
          beforeEach(async function () {
            this.drawSignaturePlayer1 = await signer.signTypedData(this.domain, DrawMatch712Type, {
              matchId: 0n,
              player: player1.address,
            });
            this.receiptPlayer1 = await this.contract.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer1).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contract.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
          });
        });
      });
    });

    context('platform fee is zero', function () {
      beforeEach(async function () {
        await this.contractNoFee.connect(deployer).unpause();
        const matchDeadline = Math.floor(Date.now() / 1000) + 3600;
        const player1JoinMatchSig = await signer.signTypedData(this.domainNoFee, JoinMatch712Type, {
          matchId: 0n,
          player: player1.address,
          playerMoveKey: this.player1MoveKey,
          matchDeadline,
        });
        const player2JoinMatchSig = await signer.signTypedData(this.domainNoFee, JoinMatch712Type, {
          matchId: 0n,
          player: player2.address,
          playerMoveKey: this.player2MoveKey,
          matchDeadline,
        });
        await this.contractNoFee.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, matchDeadline, player1JoinMatchSig);
        await this.contractNoFee.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, matchDeadline, player2JoinMatchSig);
      });

      context('when successful (Player1 first)', function () {
        beforeEach(async function () {
          this.drawSignaturePlayer1 = await signer.signTypedData(this.domainNoFee, DrawMatch712Type, {
            matchId: 0n,
            player: player1.address,
          });
          this.receipt = await this.contractNoFee.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1);
          this.expectedRefund = this.buyIn;
        });
        context('Player1 Refunded', function () {
          it('revert if Player1 try to refund again', async function () {
            await expect(this.contractNoFee.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1))
              .to.be.revertedWithCustomError(this.contractNoFee, 'PlayerAlreadyRefunded')
              .withArgs(0n, player1.address);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(this.expectedRefund);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn);
            expect(payoutWalletBalance).to.equal(0n);
          });
        });

        context('Player2 refunded', function () {
          beforeEach(async function () {
            this.drawSignaturePlayer2 = await signer.signTypedData(this.domainNoFee, DrawMatch712Type, {
              matchId: 0n,
              player: player2.address,
            });
            this.receiptPlayer2 = await this.contractNoFee.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer2).to.emit(this.contractNoFee, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(0n);
          });
        });
      });

      context('when successful (Player2 first)', function () {
        beforeEach(async function () {
          this.drawSignaturePlayer2 = await signer.signTypedData(this.domainNoFee, DrawMatch712Type, {
            matchId: 0n,
            player: player2.address,
          });
          this.receipt = await this.contractNoFee.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2);
          this.expectedRefund = this.buyIn;
        });
        context('Player2 Refunded', function () {
          it('revert if Player2 try to refund again', async function () {
            await expect(this.contractNoFee.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2))
              .to.be.revertedWithCustomError(this.contractNoFee, 'PlayerAlreadyRefunded')
              .withArgs(0n, player2.address);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receipt).to.emit(this.contractNoFee, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(this.expectedRefund);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(0n);
          });
        });
        context('Player1 refunded', function () {
          beforeEach(async function () {
            this.drawSignaturePlayer1 = await signer.signTypedData(this.domainNoFee, DrawMatch712Type, {
              matchId: 0n,
              player: player1.address,
            });
            this.receiptPlayer1 = await this.contractNoFee.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1);
          });
          it('emits a MatchRefunded event', async function () {
            await expect(this.receiptPlayer1).to.emit(this.contractNoFee, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
          });
          it('sets the match result correctly', async function () {
            const matchDetail = await this.contractNoFee.matches(0n);
            expect(matchDetail.p1Balance).to.equal(0n);
            expect(matchDetail.p2Balance).to.equal(0n);
            expect(matchDetail.platformFee).to.equal(0n);
          });
          it('transfers the refund correctly', async function () {
            const player1Balance = await this.token.balanceOf(player1.address);
            const player2Balance = await this.token.balanceOf(player2.address);
            const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
            expect(player1Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(player2Balance).to.equal(100000n - this.buyIn + this.expectedRefund);
            expect(payoutWalletBalance).to.equal(0n);
          });
        });
      });
    });
  });

  describe('refundMatch(via Admin)', function () {
    beforeEach(async function () {
      await this.contract.connect(deployer).unpause();
      this.matchDeadline = Math.floor(Date.now() / 1000) + 3600;
      this.player1JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player1.address,
        playerMoveKey: this.player1MoveKey,
        matchDeadline: this.matchDeadline,
      });
      this.player2JoinMatchSig = await signer.signTypedData(this.domain, JoinMatch712Type, {
        matchId: 0n,
        player: player2.address,
        playerMoveKey: this.player2MoveKey,
        matchDeadline: this.matchDeadline,
      });

      this.refundSignaturePlayer1 = await signer.signTypedData(this.domain, RefundMatch712Type, {
        matchId: 0n,
        player: player1.address,
      });
      this.refundSignaturePlayer2 = await signer.signTypedData(this.domain, RefundMatch712Type, {
        matchId: 0n,
        player: player2.address,
      });

      this.drawSignaturePlayer1 = await signer.signTypedData(this.domain, DrawMatch712Type, {
        matchId: 0n,
        player: player1.address,
      });
      this.drawSignaturePlayer2 = await signer.signTypedData(this.domain, DrawMatch712Type, {
        matchId: 0n,
        player: player2.address,
      });
    });

    it('revert if not called by admin', async function () {
      await expect(this.contract.connect(other).refundMatch(0n))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(this.adminRole, other.address);
    });

    context('No player submitted refund/draw', function () {
      context('only 1 player joined', function () {
        beforeEach(async function () {
          await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.player1JoinMatchSig);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn;
        });
        it('revert if the match is already concluded', async function () {
          await expect(this.contract.connect(admin).refundMatch(0n))
            .to.be.revertedWithCustomError(this.contract, 'MatchAlreadyConcluded')
            .withArgs(0n);
        });
        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
        });
        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });
        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n);
          expect(player2Balance).to.equal(100000n);
          expect(payoutWalletBalance).to.equal(0n);
        });
      });

      context('both players joined', function () {
        beforeEach(async function () {
          await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.player1JoinMatchSig);
          await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.player2JoinMatchSig);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn;
        });

        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
        });

        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });

        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n);
          expect(player2Balance).to.equal(100000n);
          expect(payoutWalletBalance).to.equal(0n);
        });
      });
    });

    context('One player submitted refund/draw', function () {
      beforeEach(async function () {
        await this.contract.connect(player1).joinMatch(0n, player1.address, this.player1MoveKey, this.matchDeadline, this.player1JoinMatchSig);
        await this.contract.connect(player2).joinMatch(0n, player2.address, this.player2MoveKey, this.matchDeadline, this.player2JoinMatchSig);
      });

      context('Player1 submitted refund', function () {
        beforeEach(async function () {
          await this.contract.connect(other).refundMatch(0n, player1.address, this.refundSignaturePlayer1);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn;
        });

        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
        });

        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });

        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n);
          expect(player2Balance).to.equal(100000n);
          expect(payoutWalletBalance).to.equal(0n);
        });
      });

      context('Player2 submitted refund', function () {
        beforeEach(async function () {
          await this.contract.connect(other).refundMatch(0n, player2.address, this.refundSignaturePlayer2);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn;
        });

        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
        });

        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });

        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n);
          expect(player2Balance).to.equal(100000n);
          expect(payoutWalletBalance).to.equal(0n);
        });
      });

      context('Player1 submitted draw', function () {
        beforeEach(async function () {
          await this.contract.connect(other).drawMatch(0n, player1.address, this.drawSignaturePlayer1);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn - this.platformFee;
        });

        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player2.address, this.expectedRefund);
        });

        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });

        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n - this.platformFee);
          expect(player2Balance).to.equal(100000n - this.platformFee);
          expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
        });
      });

      context('Player2 submitted draw', function () {
        beforeEach(async function () {
          await this.contract.connect(other).drawMatch(0n, player2.address, this.drawSignaturePlayer2);
          this.receipt = await this.contract.connect(admin).refundMatch(0n);
          this.expectedRefund = this.buyIn - this.platformFee;
        });

        it('emits a MatchRefunded event', async function () {
          await expect(this.receipt).to.emit(this.contract, 'MatchRefunded').withArgs(0n, player1.address, this.expectedRefund);
        });

        it('sets the match result correctly', async function () {
          expect(await this.contract.isMatchConcluded(0n)).to.equal(true);
          const matchDetail = await this.contract.matches(0n);
          expect(matchDetail.p1Balance).to.equal(0n);
          expect(matchDetail.p2Balance).to.equal(0n);
          expect(matchDetail.platformFee).to.equal(0n);
        });

        it('transfers the prize correctly', async function () {
          const player1Balance = await this.token.balanceOf(player1.address);
          const player2Balance = await this.token.balanceOf(player2.address);
          const payoutWalletBalance = await this.token.balanceOf(payoutWallet.address);
          expect(player1Balance).to.equal(100000n - this.platformFee);
          expect(player2Balance).to.equal(100000n - this.platformFee);
          expect(payoutWalletBalance).to.equal(this.platformFee * 2n);
        });
      });
    });
  });

  describe('__msgData()', function () {
    it('returns the msg.data', async function () {
      await this.contract.__msgData();
    });
  });
});
