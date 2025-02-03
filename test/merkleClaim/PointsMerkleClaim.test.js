const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const helpers = require('@nomicfoundation/hardhat-network-helpers');

describe('PointsMerkleClaim', function () {
  before(async function () {
    [deployer, pointsAdmin, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwarderRegistryAddress = await getForwarderRegistryAddress();
    this.points = await deployContract('Points', this.forwarderRegistryAddress);
    this.contract = await deployContract('PointsMerkleClaim', this.points, this.forwarderRegistryAddress);

    this.claimData = [
      {
        holder: claimer1.address,
        amount: 101,
        depositReasonCode: '0x0000000000000000000000000000000000000000000000000000000000000001',
        deadline: 999999999999999,
      },
      {
        holder: claimer2.address,
        amount: 102,
        depositReasonCode: '0x0000000000000000000000000000000000000000000000000000000000000002',
        deadline: 999999999999999,
      },
      {
        holder: claimer3.address,
        amount: 103,
        depositReasonCode: '0x0000000000000000000000000000000000000000000000000000000000000003',
        deadline: 0,
      },
      {
        holder: claimer3.address,
        amount: 0,
        depositReasonCode: '0x0000000000000000000000000000000000000000000000000000000000000003',
        deadline: 999999999999999,
      },
    ];
    this.leaves = this.claimData.map(({holder, amount, depositReasonCode, deadline}) =>
      ethers.solidityPacked(['address', 'uint256', 'bytes32', 'uint256'], [holder, amount, depositReasonCode, deadline])
    );
    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      holder: this.claimData[index].holder,
      amount: this.claimData[index].amount,
      depositReasonCode: this.claimData[index].depositReasonCode,
      deadline: this.claimData[index].deadline,
    }));

    await this.points.connect(deployer).grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if the forwarder registry address is 0', async function () {
      await expect(deployContract('PointsMerkleClaim', this.points, '0x0000000000000000000000000000000000000000')).to.be.revertedWithCustomError(
        this.contract,
        'InvalidForwarderRegistry'
      );
    });

    it('reverts if the points contract address is 0', async function () {
      await expect(
        deployContract('PointsMerkleClaim', '0x0000000000000000000000000000000000000000', this.forwarderRegistryAddress)
      ).to.be.revertedWithCustomError(this.contract, 'InvalidPointsContractAddress');
    });
    context('when successful', function () {
      it('sets the points contract', async function () {
        expect(await this.contract.POINTS_CONTRACT()).to.equal(await this.points.getAddress());
      });
      it('does not set the root', async function () {
        expect(await this.contract.root()).to.equal('0x0000000000000000000000000000000000000000000000000000000000000000');
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
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        expect(await this.contract.root()).to.equal(this.root);
      });
      it('does not set paused', async function () {
        await this.contract.connect(deployer).setMerkleRoot(this.root);
        expect(await this.contract.paused()).to.equal(false);
      });
      it('emits a MerkleRootSet event', async function () {
        await expect(this.contract.connect(deployer).setMerkleRoot(this.root)).to.emit(this.contract, 'MerkleRootSet').withArgs(this.root);
      });
    });
  });

  describe('claimPayout(address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline, bytes32[] calldata proof)', function () {
    it('Reverts with {InvalidClaimAmount} if it is claiming a zero amount', async function () {
      const holder = this.merkleClaimDataArr[3].holder;
      const amount = this.merkleClaimDataArr[3].amount;
      const depositReasonCode = this.merkleClaimDataArr[3].depositReasonCode;
      const deadline = this.merkleClaimDataArr[3].deadline;
      const proof = this.merkleClaimDataArr[3].proof;

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimAmount')
        .withArgs(amount);
    });

    it('Reverts with {ClaimExpired} if the block timestamp is larger than deadline', async function () {
      const holder = this.merkleClaimDataArr[2].holder;
      const amount = this.merkleClaimDataArr[2].amount;
      const depositReasonCode = this.merkleClaimDataArr[2].depositReasonCode;
      const deadline = this.merkleClaimDataArr[2].deadline;
      const proof = this.merkleClaimDataArr[2].proof;

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof))
        .to.revertedWithCustomError(this.contract, 'ClaimExpired')
        .withArgs(deadline);
    });

    it('Reverts with {Paused} if contract is paused', async function () {
      await this.contract.connect(deployer).pause();

      const holder = this.merkleClaimDataArr[0].holder;
      const amount = this.merkleClaimDataArr[0].amount;
      const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
      const deadline = this.merkleClaimDataArr[0].deadline;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof)).to.revertedWithCustomError(
        this.contract,
        'Paused'
      );
    });

    it('Reverts with {MerkleRootNotExists} if the merkle root does not exist', async function () {
      const holder = this.merkleClaimDataArr[0].holder;
      const amount = this.merkleClaimDataArr[0].amount;
      const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
      const deadline = this.merkleClaimDataArr[0].deadline;
      const proof = this.merkleClaimDataArr[0].proof;

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof)).to.revertedWithCustomError(
        this.contract,
        'MerkleRootNotExists'
      );
    });

    it('Reverts with {InvalidProof} if the merkle proof has failed the verification', async function () {
      await this.contract.setMerkleRoot(this.root);

      const holder = this.merkleClaimDataArr[0].holder;
      const amount = this.merkleClaimDataArr[0].amount;
      const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
      const deadline = this.merkleClaimDataArr[0].deadline;
      const invalidProof = this.merkleClaimDataArr[1].proof;

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, invalidProof))
        .to.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(holder, amount, depositReasonCode, deadline);
    });

    it('Reverts with {AlreadyClaimed} if this specific payout has already been claimed', async function () {
      await this.contract.setMerkleRoot(this.root);

      const holder = this.merkleClaimDataArr[0].holder;
      const amount = this.merkleClaimDataArr[0].amount;
      const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
      const deadline = this.merkleClaimDataArr[0].deadline;
      const proof = this.merkleClaimDataArr[0].proof;

      await this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof);

      await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof))
        .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(holder, amount, depositReasonCode, deadline);
    });

    context('when successful', function () {
      it('sets claimed to true', async function () {
        await this.contract.setMerkleRoot(this.root);

        const holder = this.merkleClaimDataArr[0].holder;
        const amount = this.merkleClaimDataArr[0].amount;
        const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
        const deadline = this.merkleClaimDataArr[0].deadline;
        const proof = this.merkleClaimDataArr[0].proof;
        const leaf = this.merkleClaimDataArr[0].leaf;

        await this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof);
        const claimed = await this.contract.claimed(leaf);
        expect(claimed).to.equal(true);
      });

      it('emits a PayoutClaimed event', async function () {
        await this.contract.setMerkleRoot(this.root);

        const holder = this.merkleClaimDataArr[0].holder;
        const amount = this.merkleClaimDataArr[0].amount;
        const depositReasonCode = this.merkleClaimDataArr[0].depositReasonCode;
        const deadline = this.merkleClaimDataArr[0].deadline;
        const proof = this.merkleClaimDataArr[0].proof;

        await expect(this.contract.connect(other).claimPayout(holder, amount, depositReasonCode, deadline, proof))
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(this.root, holder, depositReasonCode, amount, deadline);
      });
    });
  });

  context('meta-transactions', function () {
    it('mock: _msgData()', async function () {
      // Arrange
      this.contract = await deployContract('PointsMerkleClaimMock', await this.points.getAddress(), this.forwarderRegistryAddress);
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      // Arrange
      this.contract = await deployContract('PointsMerkleClaimMock', await this.points.getAddress(), this.forwarderRegistryAddress);

      // Act

      // Assert
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
