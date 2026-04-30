const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');

describe('PointsMerkleClaimV2', function () {
  let claimer, other;

  before(async function () {
    [, claimer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.points = await deployContract('PointsV2', await getForwarderRegistryAddress());
    this.contract = await deployContract('PointsMerkleClaimV2', await this.points.getAddress());
    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('reverts if points contract address is zero', async function () {
      await expect(deployContract('PointsMerkleClaimV2', ethers.ZeroAddress))
        .to.be.revertedWithCustomError(this.contract, 'InvalidPointsContractAddress')
        .withArgs(ethers.ZeroAddress);
    });
    context('when successful', function () {
      it('sets points contract', async function () {
        expect(await this.contract.POINTS()).to.equal(await this.points.getAddress());
      });
    });
  });

  describe('activateMerkleRoot', function () {
    it('reverts if not owner', async function () {
      await expect(this.contract.connect(other).activateMerkleRoot(ethers.ZeroHash))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.activateMerkleRoot(ethers.ZeroHash);
      });

      it('reverts if merkle root already activated', async function () {
        await expect(this.contract.activateMerkleRoot(ethers.ZeroHash))
          .to.be.revertedWithCustomError(this.contract, 'MerkleRootAlreadyActivated')
          .withArgs(ethers.ZeroHash);
      });

      it('sets the merkle root', async function () {
        expect(await this.contract.roots(ethers.ZeroHash)).to.equal(true);
      });
      it('emits a MerkleRootActivated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'MerkleRootActivated').withArgs(ethers.ZeroHash);
      });
    });
  });

  describe('deactivateMerkleRoot', function () {
    it('reverts if not owner', async function () {
      await expect(this.contract.connect(other).deactivateMerkleRoot(ethers.ZeroHash))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    it('reverts if merkle root not activated', async function () {
      await expect(this.contract.deactivateMerkleRoot(ethers.ZeroHash))
        .to.be.revertedWithCustomError(this.contract, 'MerkleRootNotActivated')
        .withArgs(ethers.ZeroHash);
    });

    context('when successful', function () {
      beforeEach(async function () {
        await this.contract.activateMerkleRoot(ethers.ZeroHash);
        this.receipt = await this.contract.deactivateMerkleRoot(ethers.ZeroHash);
      });
      it('root removed from mapping', async function () {
        expect(await this.contract.roots(ethers.ZeroHash)).to.equal(false);
      });
      it('emits a MerkleRootDeactivated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'MerkleRootDeactivated').withArgs(ethers.ZeroHash);
      });
    });
  });

  describe('claim', function () {
    beforeEach(async function () {
      const distributionId = ethers.encodeBytes32String('test');
      const element = {
        holder: claimer.address,
        amount: 1,
        depositReasonCode: ethers.ZeroHash,
        deadline: 9999999999, //not expired
        distributionId,
      };
      const rawLeaf = ethers.solidityPacked(
        ['address', 'uint256', 'bytes32', 'uint256', 'bytes32'],
        [element.holder, element.amount, element.depositReasonCode, element.deadline, element.distributionId],
      );
      const merkleTree = new MerkleTree([rawLeaf], ethers.keccak256, {hashLeaves: true, sortPairs: true});
      this.root = merkleTree.getHexRoot();
      await this.contract.activateMerkleRoot(this.root);

      this.claimData = {
        ...element,
        rawLeaf,
        leafHash: ethers.keccak256(rawLeaf),
        proof: merkleTree.getHexProof(rawLeaf, 0),
      };
    });

    it('reverts if claim amount is zero', async function () {
      await expect(
        this.contract.claim(
          this.root,
          this.claimData.holder,
          0, // zero amount
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
          this.claimData.proof,
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'InvalidClaimAmount')
        .withArgs(0);
    });

    it('reverts if claim is expired', async function () {
      await expect(
        this.contract.claim(
          this.root,
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          0, //expired immediately
          this.claimData.distributionId,
          this.claimData.proof,
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'ClaimExpired')
        .withArgs(0);
    });

    it('reverts if merkle root does not activated', async function () {
      await expect(
        this.contract.claim(
          ethers.ZeroHash, // unactivated root
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
          this.claimData.proof,
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'MerkleRootNotActivated')
        .withArgs(ethers.ZeroHash);
    });

    it('reverts if merkle proof is invalid', async function () {
      await expect(
        this.contract.claim(
          this.root,
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
          [ethers.ZeroHash], // invalid proof
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'InvalidProof')
        .withArgs(
          this.root,
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
        );
    });

    it('reverts if trying to claim twice', async function () {
      await this.contract
        .connect(claimer)
        .claim(
          this.root,
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
          this.claimData.proof,
        );

      await expect(
        this.contract
          .connect(claimer)
          .claim(
            this.root,
            this.claimData.holder,
            this.claimData.amount,
            this.claimData.depositReasonCode,
            this.claimData.deadline,
            this.claimData.distributionId,
            this.claimData.proof,
          ),
      )
        .to.be.revertedWithCustomError(this.contract, 'AlreadyClaimed')
        .withArgs(
          this.root,
          this.claimData.holder,
          this.claimData.amount,
          this.claimData.depositReasonCode,
          this.claimData.deadline,
          this.claimData.distributionId,
        );
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract
          .connect(claimer)
          .claim(
            this.root,
            this.claimData.holder,
            this.claimData.amount,
            this.claimData.depositReasonCode,
            this.claimData.deadline,
            this.claimData.distributionId,
            this.claimData.proof,
          );
      });

      it('marks the claim as claimed', async function () {
        expect(await this.contract.claimed(this.claimData.leafHash)).to.equal(true);
      });

      it('deposits points to the claimer', async function () {
        expect(await this.points.balances(claimer.address)).to.equal(1);
      });

      it('emits a Claimed event', async function () {
        await expect(this.receipt)
          .to.emit(this.contract, 'PayoutClaimed')
          .withArgs(
            this.root,
            this.claimData.holder,
            this.claimData.depositReasonCode,
            this.claimData.amount,
            this.claimData.deadline,
            this.claimData.distributionId,
          );
      });
    });
  });
});
