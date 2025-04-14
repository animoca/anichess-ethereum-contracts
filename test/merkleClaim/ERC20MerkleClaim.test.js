const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ERC20MerkleClaim', function () {
  before(async function () {
    [deployer, payoutWallet, newPayoutWallet, treasuryWallet, newTreasuryWallet, claimer1, claimer2, claimer3, claimer4, other] =
      await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.rewardContract = await deployContract('ERC20MintBurn', 'CheckmateMock', 'CMOCK', 18, this.forwarderRegistryAddress);
    this.points = await deployContract('Points', this.forwarderRegistryAddress);
    this.stakingDepositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';
    this.fee = 100n; // 1%

    const claimContractAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: (await deployer.getNonce()) + 1,
    });

    this.stakingContract = await deployContract(
      'ERC20StakingPointsRewardsLimitedLinearPool',
      claimContractAddress,
      this.rewardContract,
      this.points,
      this.stakingDepositReasonCode,
      this.forwarderRegistryAddress,
    );

    this.contract = await deployContract(
      'ERC20MerkleClaimMock',
      this.rewardContract,
      this.stakingContract,
      payoutWallet,
      treasuryWallet,
      this.fee,
      this.forwarderRegistryAddress,
    );

    this.claimData = [
      {
        recipient: claimer1.address,
        amount: 101n,
        nonce: 0,
      },
      {
        recipient: claimer2.address,
        amount: 102n,
        nonce: 0,
      },
      {
        recipient: claimer3.address,
        amount: 103n,
        nonce: 0,
      },
      {
        recipient: claimer4.address,
        amount: 0n,
        nonce: 0,
      },
      {
        recipient: '0x0000000000000000000000000000000000000000',
        amount: 1n,
        nonce: 0,
      },
    ];

    this.leaves = this.claimData.map(({recipient, amount, nonce}) =>
      ethers.solidityPacked(['address', 'uint256', 'uint256'], [recipient, amount, nonce]),
    );
    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.claimData[index].recipient,
      amount: this.claimData[index].amount,
      nonce: this.claimData[index].nonce,
    }));

    const totalAmount = BigInt(100) * BigInt(10) ** BigInt(18);
    await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), deployer);
    await this.rewardContract.connect(deployer).mint(payoutWallet, totalAmount);
    await this.rewardContract.connect(payoutWallet).approve(this.contract, totalAmount);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the forwarder registry address is 0', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          this.rewardContract,
          this.stakingContract,
          payoutWallet,
          treasuryWallet,
          this.fee,
          '0x0000000000000000000000000000000000000000',
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidForwarderRegistry');
    });

    it('reverts if the payout wallet address is 0', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          this.rewardContract,
          this.stakingContract,
          '0x0000000000000000000000000000000000000000',
          treasuryWallet,
          this.fee,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPayoutWallet');
    });

    it('reverts if the treasury wallet address is 0', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          this.rewardContract,
          this.stakingContract,
          payoutWallet,
          '0x0000000000000000000000000000000000000000',
          this.fee,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidTreasuryWallet');
    });

    it('reverts if the reward contract address is 0', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          '0x0000000000000000000000000000000000000000',
          this.stakingContract,
          payoutWallet,
          treasuryWallet,
          this.fee,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidRewardContract');
    });

    it('reverts if the staking contract address is 0', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          this.rewardContract,
          '0x0000000000000000000000000000000000000000',
          payoutWallet,
          treasuryWallet,
          this.fee,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidStakingContract');
    });

    it('reverts if fee is too big', async function () {
      await expect(
        deployContract(
          'ERC20MerkleClaim',
          this.rewardContract,
          this.stakingContract,
          payoutWallet,
          treasuryWallet,
          10001,
          this.forwarderRegistryAddress,
        ),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidFee');
    });

    context('when successful', function () {
      it('sets the reward contract', async function () {
        expect(await this.contract.REWARD_CONTRACT()).to.equal(await this.rewardContract.getAddress());
      });
      it('sets the staking contract', async function () {
        expect(await this.contract.STAKING_CONTRACT()).to.equal(await this.stakingContract.getAddress());
      });
      it('sets the payout wallet', async function () {
        expect(await this.contract.payoutWallet()).to.equal(payoutWallet.address);
      });
      it('sets the treasury wallet', async function () {
        expect(await this.contract.treasuryWallet()).to.equal(treasuryWallet.address);
      });
      it('sets the fee', async function () {
        expect(await this.contract.fee()).to.equal(this.fee);
      });
      it('does not increment nonce', async function () {
        expect(await this.contract.nonce()).to.equal(0);
      });
    });
  });

  describe('setMerkleRoot(bytes32 merkleRoot)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setMerkleRoot(this.root))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      it('sets the root', async function () {
        const nonce = await this.contract.nonce();
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        expect(await this.contract.rootMap(nonce)).to.equal(this.root);
      });
      it('increments the nonce', async function () {
        const nonce = await this.contract.nonce();
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        const nonceAgain = await this.contract.nonce();
        expect(nonceAgain).to.equal(nonce + 1n);
      });
      it('does not set paused', async function () {
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        expect(await this.contract.paused()).to.equal(false);
      });
      it('emits a MerkleRootSet event', async function () {
        await expect(this.contract.connect(deployer).setMerkleRoot(this.root)).to.emit(this.contract, 'MerkleRootSet').withArgs(0, this.root);
      });
    });
  });

  describe('setPayoutWallet(address newPayoutWallet)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setPayoutWallet(newPayoutWallet))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      it('sets the payout wallet', async function () {
        await this.contract.connect(deployer).setPayoutWallet(newPayoutWallet);
        expect(await this.contract.payoutWallet()).to.equal(newPayoutWallet);
      });
      it('emits a PayoutWalletSet event', async function () {
        await expect(this.contract.connect(deployer).setPayoutWallet(newPayoutWallet))
          .to.emit(this.contract, 'PayoutWalletSet')
          .withArgs(newPayoutWallet);
      });
    });
  });

  describe('setTreasuryWallet(address newTreasuryWallet)', function () {
    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setTreasuryWallet(newTreasuryWallet))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      it('sets the treasury wallet', async function () {
        await this.contract.connect(deployer).setTreasuryWallet(newTreasuryWallet);
        expect(await this.contract.treasuryWallet()).to.equal(newTreasuryWallet);
      });
      it('emits a TreasuryWalletSet event', async function () {
        await expect(this.contract.connect(deployer).setTreasuryWallet(newTreasuryWallet))
          .to.emit(this.contract, 'TreasuryWalletSet')
          .withArgs(newTreasuryWallet);
      });
    });
  });

  describe('claimPayout(address recipient, uint256 amount, uint256 nonce_, bytes32[] calldata proof)', function () {
    it('Reverts with {InvalidClaimAmount} if it is claiming a zero amount', async function () {
      const recipient = this.merkleClaimDataArr[3].recipient;
      const amount = this.merkleClaimDataArr[3].amount;
      const nonce = this.merkleClaimDataArr[3].nonce;
      const proof = this.merkleClaimDataArr[3].proof;

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimAmount')
        .withArgs(amount);
    });

    it('Reverts with {Paused} if contract is paused', async function () {
      await this.contract.connect(deployer).pause();

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof)).to.revertedWithCustomError(this.contract, 'Paused');
    });

    it('Reverts with {MerkleRootNotExists} if the merkle root does not exist', async function () {
      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof)).to.revertedWithCustomError(
        this.contract,
        'MerkleRootNotExists',
      );
    });

    it('Reverts with {InvalidProof} if the merkle proof has failed the verification', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const invalidProof = this.merkleClaimDataArr[1].proof;

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, invalidProof))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(recipient, amount, nonce);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed by previous claimPayout() call', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimPayout(recipient, amount, nonce, proof);

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, amount, nonce);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed  by previous claimPayoutAndStake() call', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof);

      await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, amount, nonce);
    });

    context('when successful', function () {
      it('sets claimed to true', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const nonce = this.merkleClaimDataArr[0].nonce;
        const proof = this.merkleClaimDataArr[0].proof;
        const leaf = this.merkleClaimDataArr[0].leaf;

        await this.contract.connect(other).claimPayout(recipient, amount, nonce, proof);
        const claimed = await this.contract.claimed(leaf);
        expect(claimed).to.equal(true);
      });

      it('emits a PayoutClaimed event', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const nonce = this.merkleClaimDataArr[0].nonce;
        const proof = this.merkleClaimDataArr[0].proof;

        const feeAmount = (amount * this.fee) / (await this.contract.FEE_PRECISION());
        const netAmount = amount - feeAmount;

        await expect(this.contract.connect(other).claimPayout(recipient, amount, nonce, proof))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(nonce, this.root, payoutWallet.address, recipient, netAmount, feeAmount);
      });
    });
  });

  describe('claimPayoutAndStake(address recipient, uint256 amount, uint256 nonce_, bytes32[] calldata proof)', function () {
    it('Reverts with {InvalidClaimAmount} if it is claiming a zero amount', async function () {
      const recipient = this.merkleClaimDataArr[3].recipient;
      const amount = this.merkleClaimDataArr[3].amount;
      const nonce = this.merkleClaimDataArr[3].nonce;
      const proof = this.merkleClaimDataArr[3].proof;

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimAmount')
        .withArgs(amount);
    });

    it('Reverts with {Paused} if contract is paused', async function () {
      await this.contract.connect(deployer).pause();

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof)).to.revertedWithCustomError(
        this.contract,
        'Paused',
      );
    });

    it('Reverts with {MerkleRootNotExists} if the merkle root does not exist', async function () {
      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof)).to.revertedWithCustomError(
        this.contract,
        'MerkleRootNotExists',
      );
    });

    it('Reverts with {InvalidProof} if the merkle proof has failed the verification', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const invalidProof = this.merkleClaimDataArr[1].proof;

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, invalidProof))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(recipient, amount, nonce);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed by previous claimPayout() call', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimPayout(recipient, amount, nonce, proof);

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, amount, nonce);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed by previous claimPayoutAndStake() call', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const nonce = this.merkleClaimDataArr[0].nonce;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof);

      await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, amount, nonce);
    });

    context('when successful', function () {
      it('sets claimed to true', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const nonce = this.merkleClaimDataArr[0].nonce;
        const proof = this.merkleClaimDataArr[0].proof;
        const leaf = this.merkleClaimDataArr[0].leaf;

        await this.contract.connect(other).claimPayout(recipient, amount, nonce, proof);
        const claimed = await this.contract.claimed(leaf);
        expect(claimed).to.equal(true);
      });

      it('emits a PayoutClaimed event and a Staked event', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const nonce = this.merkleClaimDataArr[0].nonce;
        const proof = this.merkleClaimDataArr[0].proof;

        await expect(this.contract.connect(other).claimPayoutAndStake(recipient, amount, nonce, proof))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(nonce, this.root, payoutWallet.address, recipient, amount, 0)
          .to.emit(this.stakingContract, 'Staked')
          .withArgs(recipient, amount, amount);
      });
    });
  });

  context('meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      this.contract = await deployContract(
        'ERC20MerkleClaimMock',
        this.rewardContract,
        this.stakingContract,
        payoutWallet,
        treasuryWallet,
        this.fee,
        this.forwarderRegistryAddress,
      );
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      this.contract = await deployContract(
        'ERC20MerkleClaimMock',
        this.rewardContract,
        this.stakingContract,
        payoutWallet,
        treasuryWallet,
        this.fee,
        this.forwarderRegistryAddress,
      );

      // Act

      // Assert
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
