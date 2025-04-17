const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('CheckmateMerkleClaim', function () {
  before(async function () {
    [deployer, payoutWallet, newPayoutWallet, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.checkmateTokenContract = await deployContract('ERC20MintBurn', 'CheckmateMock', 'CMOCK', 18, this.forwarderRegistryAddress);
    this.stakingDepositReasonCode = '0x0000000000000000000000000000000000000000000000000000000000000001';
    this.stakingContract = await deployContract('ERC20ReceiverMock');
    this.contract = await deployContract('CheckmateMerkleClaim', this.checkmateTokenContract, this.stakingContract, payoutWallet);

    this.claimData = [
      {
        recipient: claimer1.address,
        amount: 101n,
        nonce: 1,
      },
      {
        recipient: claimer2.address,
        amount: 102n,
        nonce: 1,
      },
      {
        recipient: claimer3.address,
        amount: 103n,
        nonce: 1,
      },
      {
        recipient: claimer4.address,
        amount: 0n,
        nonce: 1,
      },
      {
        recipient: ethers.ZeroAddress,
        amount: 1n,
        nonce: 1,
      },
    ];

    this.leaves = this.claimData.map(({recipient, amount, nonce}) =>
      ethers.solidityPacked(['address', 'uint256', 'uint16'], [recipient, amount, nonce]),
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
    await this.checkmateTokenContract.grantRole(await this.checkmateTokenContract.MINTER_ROLE(), deployer);
    await this.checkmateTokenContract.connect(deployer).mint(payoutWallet, totalAmount);
    await this.checkmateTokenContract.connect(payoutWallet).approve(this.contract, totalAmount);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the payout wallet address is 0', async function () {
      await expect(
        deployContract('CheckmateMerkleClaim', this.checkmateTokenContract, this.stakingContract, ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPayoutWallet');
    });

    it('reverts if the checkmate token contract address is 0', async function () {
      await expect(deployContract('CheckmateMerkleClaim', ethers.ZeroAddress, this.stakingContract, payoutWallet)).to.be.revertedWithCustomError(
        this.contract,
        'InvalidCheckmateTokenContract',
      );
    });

    it('reverts if the staking contract address is 0', async function () {
      await expect(
        deployContract('CheckmateMerkleClaim', this.checkmateTokenContract, ethers.ZeroAddress, payoutWallet),
      ).to.be.revertedWithCustomError(this.contract, 'InvalidStakingContract');
    });

    context('when successful', function () {
      it('sets the checkmate token contract', async function () {
        expect(await this.contract.CHECKMATE_TOKEN_CONTRACT()).to.equal(await this.checkmateTokenContract.getAddress());
      });
      it('sets the staking contract', async function () {
        expect(await this.contract.STAKING_CONTRACT()).to.equal(await this.stakingContract.getAddress());
      });
      it('sets the payout wallet', async function () {
        expect(await this.contract.payoutWallet()).to.equal(payoutWallet.address);
      });
      it('does not increment nonce', async function () {
        expect(await this.contract.nonce()).to.equal(0);
      });
    });
  });

  describe('setMerkleRoot(bytes32 merkleRoot)', function () {
    it('reverts with "InvalidRoot" if the merkle root is zero.', async function () {
      await expect(this.contract.connect(other).setMerkleRoot(ethers.ZeroHash)).to.revertedWithCustomError(this.contract, 'InvalidRoot');
    });

    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setMerkleRoot(this.root))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      it('sets the root', async function () {
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        expect(await this.contract.rootToNonceMap(this.root)).to.equal(1);
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
        await expect(this.contract.connect(deployer).setMerkleRoot(this.root)).to.emit(this.contract, 'MerkleRootSet').withArgs(this.root, 1);
      });
    });
  });

  describe('setPayoutWallet(address newPayoutWallet)', function () {
    it('reverts with "InvalidPayoutWallet" if the payout wallet is zero address', async function () {
      await expect(this.contract.connect(other).setPayoutWallet(ethers.ZeroAddress)).to.revertedWithCustomError(this.contract, 'InvalidPayoutWallet');
    });

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

  describe('claimAndStake(address recipient, uint256 amount, bytes32 root, bytes32[] calldata proof)', function () {
    it('Reverts with {InvalidClaimAmount} if it is claiming a zero amount', async function () {
      const recipient = this.merkleClaimDataArr[3].recipient;
      const amount = this.merkleClaimDataArr[3].amount;
      const proof = this.merkleClaimDataArr[3].proof;

      await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimAmount')
        .withArgs(amount);
    });

    it('Reverts with {Paused} if contract is paused', async function () {
      await this.contract.connect(deployer).pause();

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof)).to.revertedWithCustomError(
        this.contract,
        'Paused',
      );
    });

    it('Reverts with {MerkleRootNotExists} if the merkle root does not exist', async function () {
      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof)).to.revertedWithCustomError(
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

      await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, invalidProof))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(recipient, amount, nonce);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed', async function () {
      await this.contract.setMerkleRoot(this.root);

      const recipient = this.merkleClaimDataArr[0].recipient;
      const amount = this.merkleClaimDataArr[0].amount;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof);

      await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(recipient, amount, this.root);
    });

    context('when successful', function () {
      it('sets claimed to true', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const proof = this.merkleClaimDataArr[0].proof;
        const leaf = this.merkleClaimDataArr[0].leaf;

        await this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof);
        const claimed = await this.contract.claimed(leaf);
        expect(claimed).to.equal(true);
      });

      it('emits a PayoutClaimed event and a Staked event', async function () {
        await this.contract.setMerkleRoot(this.root);

        const recipient = this.merkleClaimDataArr[0].recipient;
        const amount = this.merkleClaimDataArr[0].amount;
        const proof = this.merkleClaimDataArr[0].proof;

        await expect(this.contract.connect(other).claimAndStake(recipient, amount, this.root, proof))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(this.root, payoutWallet.address, recipient, amount);
      });
    });
  });
});
