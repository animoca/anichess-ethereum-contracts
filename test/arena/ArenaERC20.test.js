const {ethers} = require('hardhat');
const {expect} = require('chai');
const {beforeEach} = require('mocha');
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
      this.forwarderRegistryAddress
    );

    this.name = 'Arena';
    this.version = '1.0';

    this.price = ethers.parseEther('0.1');
    this.commissionRate = 500; // 5%
    this.commission = ethers.parseEther('0.01');
    this.reward = ethers.parseEther('0.19');

    this.contract = await deployContract(
      'ERC20ArenaMock',
      this.price,
      this.commissionRate,
      messageSigner,
      payoutWallet,
      this.erc20,
      this.forwarderRegistryAddress
    );
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('should revert if the price is zero', async function () {
      await expect(
        deployContract('ERC20ArenaMock', 0, this.commissionRate, messageSigner, payoutWallet, this.erc20, this.forwarderRegistryAddress)
      ).to.be.revertedWithCustomError(this.contract, 'ZeroPrice');
    });

    context('when successful', function () {
      it('should set the ERC20 address', async function () {
        expect(await this.contract.ERC20()).to.equal(await this.erc20.getAddress());
      });

      it('should set the ENTRY_FEE', async function () {
        expect(await this.contract.ENTRY_FEE()).to.equal(this.price);
      });

      it('should set the reward', async function () {
        expect(await this.contract.reward()).to.equal(this.reward);
      });

      it('should set the commission', async function () {
        expect(await this.contract.commission()).to.equal(this.commission);
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

    context('when successful setting a positive commission rate', function () {
      beforeEach(async function () {
        this.rate = 9999; // 99.99%
        this.tx = await this.contract.setCommissionRate(this.rate);
        this.commission = ethers.parseEther('0.19998');
        this.reward = ethers.parseEther('0.00002');
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

      it('should set the correct commission', async function () {
        expect(await this.contract.commission()).to.equal('0');
      });

      it('should set the correct reward', async function () {
        expect(await this.contract.reward()).to.equal(new BN(this.price).mul(new BN(2)).toString());
      });

      it('should emit a CommissionRateSet event', async function () {
        await expect(this.tx).to.emit(this.contract, 'CommissionRateSet').withArgs(this.rate);
      });
    });
  });

  describe('onERC20Received(address, address from, uint256 amount, bytes calldata data)', function () {
    beforeEach(function () {
      this.sessionId = formatUuid('441707e9-0d24-4b30-be1c-a0661b2920ee');
      this.sessionId2 = formatUuid('8584eb9e-a823-48c9-8ba9-2cfd8e8c2275');
    });

    it('should revert if the sender is not the ERC20 contract', async function () {
      const anotherToken = await deployContract(
        'ERC20FixedSupply',
        '',
        '',
        18,
        [user.address],
        [ethers.parseEther('10')],
        this.forwarderRegistryAddress
      );

      await expect(anotherToken.connect(user).safeTransfer(this.contract, this.price, '0x')).to.be.revertedWithoutReason();
    });

    it('should revert if the user does not have enough balance', async function () {
      await expect(this.erc20.connect(userWithoutAllocation).safeTransfer(this.contract, this.price, '0x'))
        .to.be.revertedWithCustomError(this.erc20, 'ERC20InsufficientBalance')
        .withArgs(userWithoutAllocation, 0, this.price);
    });

    it('should revert if the amount to transfer is not equal to the price', async function () {
      await expect(this.erc20.connect(user).safeTransfer(this.contract, ethers.parseEther('0.009'), '0x')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidPaymentAmount'
      );
    });

    context('when trying to pay the same session again', function () {
      beforeEach(async function () {
        await this.erc20.connect(user).safeTransfer(this.contract, this.price, this.sessionId);
      });

      it('should revert if the user already has the session', async function () {
        await expect(this.erc20.connect(user).safeTransfer(this.contract, this.price, this.sessionId))
          .to.be.revertedWithCustomError(this.contract, 'AlreadyAdmitted')
          .withArgs(this.sessionId);
      });
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.tx = await this.erc20.connect(user).safeTransfer(this.contract, this.price, this.sessionId);
      });

      it('should transfer the price to the contract', async function () {
        expect(await this.erc20.balanceOf(this.contract)).to.equal(this.price);
      });

      it('should update session id', async function () {
        expect(await this.contract.sessions(this.sessionId)).to.equal(user.address);
      });

      it('should emit an Admission event', async function () {
        await expect(this.tx).to.emit(this.contract, 'Admission').withArgs(user.address, this.sessionId);
      });

      it('should emit a Transfer event', async function () {
        await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(user.address, this.contract, this.price);
      });
    });
  });

  describe('completeMatch(uint256 matchId, uint256 player1SessionId, uint256 player2SessionId, bool isDraw, bytes calldata signature)', function () {
    beforeEach(async function () {
      this.sessionId = formatUuid('441707e9-0d24-4b30-be1c-a0661b2920ee');
      this.sessionId2 = formatUuid('8584eb9e-a823-48c9-8ba9-2cfd8e8c2275');

      await this.erc20.connect(user).safeTransfer(this.contract, this.price, this.sessionId);
      await this.erc20.connect(user2).safeTransfer(this.contract, this.price, this.sessionId2);

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
          {name: 'player1SessionId', type: 'uint256'},
          {name: 'player2SessionId', type: 'uint256'},
          {name: 'isDraw', type: 'bool'},
        ],
      };

      this.matchId = formatUuid('ab82edf1-e8d7-4f2d-826d-f52bb0d26682');
    });

    it('should revert if the player1 session id does not exist', async function () {
      const nonRegisteredSessionId = formatUuid('00000000-0000-0000-0000-000000000000');
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user2.address,
        player1SessionId: nonRegisteredSessionId,
        player2SessionId: this.sessionId2,
        isDraw: false,
      });
      await expect(this.contract.completeMatch(this.matchId, nonRegisteredSessionId, this.sessionId2, false, signature))
        .to.be.revertedWithCustomError(this.contract, 'SessionNotExists')
        .withArgs(nonRegisteredSessionId);
    });

    it('should revert if the player2 session id does not exist', async function () {
      const nonRegisteredSessionId = formatUuid('00000000-0000-0000-0000-000000000001');
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user2.address,
        player1SessionId: this.sessionId,
        player2SessionId: nonRegisteredSessionId,
        isDraw: false,
      });
      await expect(this.contract.completeMatch(this.matchId, this.sessionId, nonRegisteredSessionId, false, signature))
        .to.be.revertedWithCustomError(this.contract, 'SessionNotExists')
        .withArgs(nonRegisteredSessionId);
    });

    it('should revert if signature is invalid', async function () {
      const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
        matchId: this.matchId,
        player1: user.address,
        player2: user.address, // same as player1
        player1SessionId: this.sessionId,
        player2SessionId: this.sessionId2,
        isDraw: false,
      });
      await expect(this.contract.completeMatch(this.matchId, this.sessionId, this.sessionId2, false, signature)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidSignature'
      );
    });

    context('when successful with player1 and commission > 0', function () {
      beforeEach(async function () {
        const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          player1SessionId: this.sessionId,
          player2SessionId: this.sessionId2,
          isDraw: false,
        });
        this.tx = await this.contract.completeMatch(this.matchId, this.sessionId, this.sessionId2, false, signature);
      });

      it('should remove the users from the session', async function () {
        expect(await this.contract.sessions(this.sessionId)).to.equal(ethers.ZeroAddress);
        expect(await this.contract.sessions(this.sessionId2)).to.equal(ethers.ZeroAddress);
      });

      it('should emit a MatchResolved event', async function () {
        await expect(this.tx)
          .to.emit(this.contract, 'MatchCompleted')
          .withArgs(this.matchId, user.address, user2.address, this.sessionId, this.sessionId2, false);
      });

      it('should emit Transfer events with correct amount', async function () {
        await expect(this.tx)
          .to.emit(this.erc20, 'Transfer')
          .withArgs(this.contract.getAddress(), user.address, this.reward.toString())
          .and.to.emit(this.erc20, 'Transfer')
          .withArgs(this.contract.getAddress(), payoutWallet.address, this.commission.toString());
      });

      it('should emit a PayoutDelivered event', async function () {
        await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user.address, this.matchId, this.reward.toString());
      });
    });

    context('when successful with player1 and commission = 0', function () {
      beforeEach(async function () {
        await this.contract.setCommissionRate(0);
        this.reward = ethers.parseEther('0.2');

        const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          player1SessionId: this.sessionId,
          player2SessionId: this.sessionId2,
          isDraw: false,
        });
        this.tx = await this.contract.completeMatch(this.matchId, this.sessionId, this.sessionId2, false, signature);
      });

      it('should remove the users from the session', async function () {
        expect(await this.contract.sessions(this.sessionId)).to.equal(ethers.ZeroAddress);
        expect(await this.contract.sessions(this.sessionId2)).to.equal(ethers.ZeroAddress);
      });

      it('should emit a MatchResolved event', async function () {
        await expect(this.tx)
          .to.emit(this.contract, 'MatchCompleted')
          .withArgs(this.matchId, user.address, user2.address, this.sessionId, this.sessionId2, false);
      });

      it('should emit a Transfer event to the player1 without deducting commission fee', async function () {
        await expect(this.tx).to.emit(this.erc20, 'Transfer').withArgs(this.contract.getAddress(), user.address, this.reward.toString());
      });

      it('should emit a PayoutDelivered event', async function () {
        await expect(this.tx).to.emit(this.contract, 'PayoutDelivered').withArgs(user.address, this.matchId, this.reward.toString());
      });
    });

    context('when successful with draw result and commission > 0', function () {
      beforeEach(async function () {
        const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          player1SessionId: this.sessionId,
          player2SessionId: this.sessionId2,
          isDraw: true,
        });
        this.tx = await this.contract.completeMatch(this.matchId, this.sessionId, this.sessionId2, true, signature);
      });

      it('should remove the users from the session', async function () {
        expect(await this.contract.sessions(this.sessionId)).to.equal(ethers.ZeroAddress);
        expect(await this.contract.sessions(this.sessionId2)).to.equal(ethers.ZeroAddress);
      });

      it('should emit a MatchResolved event', async function () {
        await expect(this.tx)
          .to.emit(this.contract, 'MatchCompleted')
          .withArgs(this.matchId, user.address, user2.address, this.sessionId, this.sessionId2, true);
      });

      it('should emit Transfer event to payout wallet with correct amount', async function () {
        await expect(this.tx)
          .and.to.emit(this.erc20, 'Transfer')
          .withArgs(this.contract.getAddress(), payoutWallet.address, this.commission.toString());
      });

      it('should not emit a PayoutDelivered event', async function () {
        await expect(this.tx).to.not.emit(this.contract, 'PayoutDelivered');
      });
    });

    context('when successful with draw result and commission = 0', function () {
      beforeEach(async function () {
        await this.contract.setCommissionRate(0);

        const signature = await messageSigner.signTypedData(this.eip712Domain, this.eip712Types, {
          matchId: this.matchId,
          player1: user.address,
          player2: user2.address,
          player1SessionId: this.sessionId,
          player2SessionId: this.sessionId2,
          isDraw: true,
        });
        this.tx = await this.contract.completeMatch(this.matchId, this.sessionId, this.sessionId2, true, signature);
      });

      it('should remove the users from the session', async function () {
        expect(await this.contract.sessions(this.sessionId)).to.equal(ethers.ZeroAddress);
        expect(await this.contract.sessions(this.sessionId2)).to.equal(ethers.ZeroAddress);
      });

      it('should emit a MatchResolved event', async function () {
        await expect(this.tx)
          .to.emit(this.contract, 'MatchCompleted')
          .withArgs(this.matchId, user.address, user2.address, this.sessionId, this.sessionId2, true);
      });

      it('should not emit a Transfer event', async function () {
        await expect(this.tx).to.not.emit(this.erc20, 'Transfer');
      });

      it('should not emit a PayoutDelivered event', async function () {
        await expect(this.tx).to.not.emit(this.contract, 'PayoutDelivered');
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
