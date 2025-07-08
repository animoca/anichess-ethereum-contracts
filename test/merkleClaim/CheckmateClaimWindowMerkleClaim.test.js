const {ethers} = require('hardhat');
const {expect} = require('chai');
const {MerkleTree} = require('merkletreejs');
const keccak256 = require('keccak256');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const helpers = require('@nomicfoundation/hardhat-network-helpers');
const {getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('CheckmateClaimWindowMerkleClaim', function () {
  before(async function () {
    [deployer, payoutWallet, claimer1, claimer2, claimer3, claimer4, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    const forwarderRegistryAddress = await getForwarderRegistryAddress();

    this.nftContract = await deployContract('ERC721Mock');
    this.checkmateTokenContract = await deployContract('ERC20Mock');
    this.stakingPoolContract = await deployContract('ERC20ReceiverMock');

    this.contract = await deployContract(
      'CheckmateClaimWindowMerkleClaimMock',
      this.checkmateTokenContract,
      this.nftContract,
      this.stakingPoolContract,
      payoutWallet,
      forwarderRegistryAddress,
    );

    this.epochId = ethers.encodeBytes32String('test-epoch-id');
    this.whitelistWithoutNFT = [
      {
        recipient: claimer1.address,
        amount: 1,
      },
      {
        recipient: claimer2.address,
        amount: 2,
      },
    ];
    this.whitelistWithNFT = [
      {
        recipient: claimer1.address,
        amount: 1,
        tokenIds: [1],
      },
      {
        recipient: claimer2.address,
        amount: 2,
        tokenIds: [2, 3],
      },
    ];
    this.whitelist = this.whitelistWithoutNFT.concat(this.whitelistWithNFT);

    this.leavesWithoutNFT = this.whitelistWithoutNFT.map((item) =>
      ethers.solidityPacked(['bytes32', 'address', 'uint256'], [this.epochId, item.recipient, item.amount]),
    );
    this.leavesWithNFT = this.whitelistWithNFT.map((item) =>
      ethers.solidityPacked(['bytes32', 'address', 'uint256', 'uint256[]'], [this.epochId, item.recipient, item.amount, item.tokenIds]),
    );
    this.leaves = this.leavesWithoutNFT.concat(this.leavesWithNFT);

    this.tree = new MerkleTree(this.leaves, keccak256, {hashLeaves: true, sortPairs: true});
    this.root = this.tree.getHexRoot();
    this.merkleClaimDataArr = this.leaves.map((leaf, index) => ({
      leaf: ethers.keccak256(leaf),
      proof: this.tree.getHexProof(keccak256(leaf, index)),
      recipient: this.whitelist[index].reciipient,
      amount: this.whitelist[index].amount,
      epochId: this.epochId,
    }));

    // await this.rewardContract.grantRole(await this.rewardContract.MINTER_ROLE(), await this.contract.getAddress());
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor', function () {
    it('sets the checkmate token', async function () {
      expect(await this.contract.CHECKMATE_TOKEN()).to.equal(this.checkmateTokenContract);
    });

    it('sets the NFT', async function () {
      expect(await this.contract.NFT()).to.equal(this.nftContract);
    });

    it('sets the staking pool', async function () {
      expect(await this.contract.STAKING_POOL()).to.equal(this.stakingPoolContract);
    });

    it('sets the payout wallet', async function () {
      expect(await this.contract.payoutWallet()).to.equal(payoutWallet);
    });
  });

  describe('setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime)', function () {
    let startTime, endTime, currentBlockTime;

    beforeEach(async function () {
      currentBlockTime = BigInt(await helpers.time.latest()); // unit: seconds
      startTime = currentBlockTime + 100n; // unit: seconds
      endTime = startTime + 100n; // unit: seconds
    });

    it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
      await expect(this.contract.connect(other).setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    it('reverts with "EpochIdAlreadyExists" if the epoch has already started', async function () {
      await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
        .withArgs(this.epochId);
    });

    it('reverts with "InvalidClaimWindow" if the start time is equals to the end time', async function () {
      endTime = startTime; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
    });

    it('reverts with "InvalidClaimWindow" if the start time is greater than the end time', async function () {
      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, endTime, startTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(endTime, startTime, currentBlockTime + 1n);
    });

    it(`reverts with "InvalidClaimWindow" if the end time is equals to the current time`, async function () {
      endTime = await helpers.time.latest(); // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
    });

    it('reverts with "InvalidClaimWindow" if the end time is less than the current time', async function () {
      startTime = currentBlockTime - 2n; // unit: seconds
      endTime = currentBlockTime - 1n; // unit: seconds

      await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
        .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
        .withArgs(startTime, endTime, currentBlockTime + 1n);
    });

    context('when successful', function () {
      it('sets the epoch merkle root', async function () {
        const claimWindowBefore = await this.contract.claimWindows(this.epochId);
        await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
        const claimWindowAfter = await this.contract.claimWindows(this.epochId);

        expect(claimWindowBefore.merkleRoot).to.equal(ethers.ZeroHash);
        expect(claimWindowAfter.merkleRoot).to.equal(this.root);
        expect(claimWindowBefore.startTime).to.equal(0);
        expect(claimWindowAfter.startTime).to.equal(startTime);
        expect(claimWindowBefore.endTime).to.equal(0);
        expect(claimWindowAfter.endTime).to.equal(endTime);
      });

      it('emits a EpochMerkleRootSet event', async function () {
        await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
          .to.emit(this.contract, 'EpochMerkleRootSet')
          .withArgs(this.epochId, this.root, startTime, endTime);
      });
    });
  });

  // describe('setPayoutWallet(address newPayoutWallet)', function () {
  //   beforeEach(async function () {
  //     currentBlockTime = BigInt(await helpers.time.latest()); // unit: seconds
  //     startTime = currentBlockTime + 100n; // unit: seconds
  //     endTime = startTime + 100n; // unit: seconds
  //   });

  //   it('reverts with "NotContractOwner" if the caller is not the owner', async function () {
  //     await expect(this.contract.connect(other).setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //       .to.revertedWithCustomError(this.contract, 'NotContractOwner')
  //       .withArgs(other.address);
  //   });

  //   it('reverts with "EpochIdAlreadyExists" if the epoch has already started', async function () {
  //     await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);

  //     await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //       .to.revertedWithCustomError(this.contract, 'EpochIdAlreadyExists')
  //       .withArgs(this.epochId);
  //   });

  //   it('reverts with "InvalidClaimWindow" if the start time is equals to the end time', async function () {
  //     endTime = startTime; // unit: seconds

  //     await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //       .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
  //       .withArgs(startTime, endTime, currentBlockTime + 1n);
  //   });

  //   it('reverts with "InvalidClaimWindow" if the start time is greater than the end time', async function () {
  //     await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, endTime, startTime))
  //       .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
  //       .withArgs(endTime, startTime, currentBlockTime + 1n);
  //   });

  //   it(`reverts with "InvalidClaimWindow" if the end time is equals to the current time`, async function () {
  //     endTime = await helpers.time.latest(); // unit: seconds

  //     await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //       .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
  //       .withArgs(startTime, endTime, currentBlockTime + 1n);
  //   });

  //   it('reverts with "InvalidClaimWindow" if the end time is less than the current time', async function () {
  //     startTime = currentBlockTime - 2n; // unit: seconds
  //     endTime = currentBlockTime - 1n; // unit: seconds

  //     await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //       .to.revertedWithCustomError(this.contract, 'InvalidClaimWindow')
  //       .withArgs(startTime, endTime, currentBlockTime + 1n);
  //   });

  //   context('when successful', function () {
  //     it('sets the epoch merkle root', async function () {
  //       const claimWindowBefore = await this.contract.claimWindows(this.epochId);
  //       await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
  //       const claimWindowAfter = await this.contract.claimWindows(this.epochId);

  //       expect(claimWindowBefore.merkleRoot).to.equal(ethers.ZeroHash);
  //       expect(claimWindowAfter.merkleRoot).to.equal(this.root);
  //       expect(claimWindowBefore.startTime).to.equal(0);
  //       expect(claimWindowAfter.startTime).to.equal(startTime);
  //       expect(claimWindowBefore.endTime).to.equal(0);
  //       expect(claimWindowAfter.endTime).to.equal(endTime);
  //     });

  //     it('emits a EpochMerkleRootSet event', async function () {
  //       await expect(this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime))
  //         .to.emit(this.contract, 'EpochMerkleRootSet')
  //         .withArgs(this.epochId, this.root, startTime, endTime);
  //     });
  //   });
  // });

  // describe('claim(bytes32 epochId, bytes32[] calldata proof, address recipient)', function () {
  //   let startTime, endTime, recipient, epochId, proof;

  //   beforeEach(async function () {
  //     startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
  //     endTime = startTime + 100n; // unit: seconds
  //     ({recipient, epochId, proof} = this.merkleClaimDataArr[0]);

  //     await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
  //   });

  //   it('reverts with "EpochIdNotExists" if the epoch has not been set', async function () {
  //     const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');

  //     await expect(this.contract.connect(claimer1).claim(invalidEpochId, proof, recipient))
  //       .to.revertedWithCustomError(this.contract, 'EpochIdNotExists')
  //       .withArgs(invalidEpochId);
  //   });

  //   it('reverts with "OutOfClaimWindow" if the epoch has not started', async function () {
  //     const currentBlockTimestamp = await helpers.time.latest();

  //     await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
  //       .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
  //       .withArgs(epochId, currentBlockTimestamp + 1);
  //   });

  //   it('reverts with "OutOfClaimWindow" if the epoch has ended', async function () {
  //     await helpers.time.increase(1000);

  //     const currentBlockTimestamp = await helpers.time.latest();

  //     await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
  //       .to.revertedWithCustomError(this.contract, 'OutOfClaimWindow')
  //       .withArgs(epochId, currentBlockTimestamp + 1);
  //   });

  //   it('reverts with "InvalidProof" if the proof can not be verified', async function () {
  //     await helpers.time.increase(110);

  //     const invalidProof = ['0x1234567890123456789012345678901234567890123456789012345678901234'];

  //     await expect(this.contract.connect(claimer1).claim(epochId, invalidProof, recipient))
  //       .to.revertedWithCustomError(this.contract, 'InvalidProof')
  //       .withArgs(epochId, recipient);
  //   });

  //   it('reverts with "AlreadyClaimed" if the recipient has already claimed the reward', async function () {
  //     await helpers.time.increase(110);

  //     await this.contract.connect(claimer1).claim(epochId, proof, recipient);

  //     await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
  //       .to.revertedWithCustomError(this.contract, 'AlreadyClaimed')
  //       .withArgs(this.epochId, recipient);
  //   });

  //   it('reverts with "ExceededMintSupply" if the mint supply has been exceeded', async function () {
  //     await helpers.time.increase(110);

  //     await this.contract
  //       .connect(claimer1)
  //       .claim(this.merkleClaimDataArr[0].epochId, this.merkleClaimDataArr[0].proof, this.merkleClaimDataArr[0].recipient);

  //     await expect(
  //       this.contract
  //         .connect(claimer1)
  //         .claim(this.merkleClaimDataArr[1].epochId, this.merkleClaimDataArr[1].proof, this.merkleClaimDataArr[1].recipient),
  //     ).to.revertedWithCustomError(this.contract, 'ExceededMintSupply');
  //   });

  //   context('when successful', function () {
  //     beforeEach(async function () {
  //       await helpers.time.increase(110);
  //     });

  //     it('should update the noOfTokensClaimed', async function () {
  //       const noOfTokensClaimedBefore = await this.contract.noOfTokensClaimed();
  //       await this.contract.connect(claimer1).claim(epochId, proof, recipient);
  //       const noOfTokensClaimedAfter = await this.contract.noOfTokensClaimed();

  //       expect(noOfTokensClaimedBefore).to.equal(0);
  //       expect(noOfTokensClaimedAfter).to.equal(1);
  //     });

  //     it('should update the claimStatus', async function () {
  //       const claimStatusBefore = await this.contract.claimed(recipient);
  //       await this.contract.connect(claimer1).claim(epochId, proof, recipient);
  //       const claimStatusAfter = await this.contract.claimed(recipient);

  //       expect(claimStatusBefore).to.equal(false);
  //       expect(claimStatusAfter).to.equal(true);
  //     });

  //     it('should update the recipient balance', async function () {
  //       const balanceBefore = await this.rewardContract.balanceOf(recipient);
  //       await this.contract.connect(claimer1).claim(epochId, proof, recipient);
  //       const balanceAfter = await this.rewardContract.balanceOf(recipient);

  //       expect(balanceBefore).to.equal(0);
  //       expect(balanceAfter).to.equal(1);
  //     });

  //     it('should update the owner of token', async function () {
  //       await expect(this.rewardContract.ownerOf(this.tokenId))
  //         .revertedWithCustomError(this.rewardContract, 'ERC721NonExistingToken')
  //         .withArgs(this.tokenId);

  //       await this.contract.connect(claimer1).claim(epochId, proof, recipient);

  //       const ownerAfter = await this.rewardContract.ownerOf(this.tokenId);
  //       expect(ownerAfter).to.equal(recipient);
  //     });

  //     it('emits a RewardClaimed event', async function () {
  //       await expect(this.contract.connect(claimer1).claim(epochId, proof, recipient))
  //         .to.emit(this.contract, 'RewardClaimed')
  //         .withArgs(this.epochId, recipient, this.tokenId);
  //     });
  //   });
  // });

  // describe('canClaim(bytes32 epochId, address recipient)', function () {
  //   let startTime, endTime, recipient, epochId, proof;

  //   beforeEach(async function () {
  //     startTime = BigInt(await helpers.time.latest()) + 100n; // unit: seconds
  //     endTime = startTime + 100n; // unit: seconds
  //     ({recipient, epochId, proof} = this.merkleClaimDataArr[0]);

  //     await this.contract.setEpochMerkleRoot(this.epochId, this.root, startTime, endTime);
  //   });

  //   it('returns ClaimError.EpochIdNotExists(1) if merkle root of the claim window has not been set', async function () {
  //     const invalidEpochId = ethers.encodeBytes32String('invalid-epoch-id');
  //     const canClaim = await this.contract.canClaim(invalidEpochId, claimer1);
  //     expect(canClaim).to.equal(1);
  //   });

  //   it('returns ClaimError.OutOfClaimWindow(2) if block time is earlier than start time of claim window', async function () {
  //     const canClaim = await this.contract.canClaim(epochId, claimer1);
  //     expect(canClaim).to.equal(2);
  //   });

  //   it('returns ClaimError.OutOfClaimWindow(2) if block time is after end time of claim window', async function () {
  //     await helpers.time.increase(1000);

  //     const canClaim = await this.contract.canClaim(epochId, claimer1);
  //     expect(canClaim).to.equal(2);
  //   });

  //   it('returns ClaimError.AlreadyClaimed(3) if already claimed', async function () {
  //     await helpers.time.increase(110);

  //     await this.contract.connect(claimer1).claim(epochId, proof, recipient);

  //     const canClaim = await this.contract.canClaim(epochId, claimer1);
  //     expect(canClaim).to.equal(3);
  //   });

  //   it('returns ClaimError.ExceededMintSupply(4) if number of claimed tokens is equal to total supply', async function () {
  //     await helpers.time.increase(110);

  //     let recipient, epochId, proof;
  //     ({recipient, epochId, proof} = this.merkleClaimDataArr[0]);
  //     await this.contract.connect(claimer1).claim(epochId, proof, recipient);

  //     const canClaim = await this.contract.canClaim(epochId, claimer2);
  //     expect(canClaim).to.equal(4);
  //   });

  //   it(`returns ClaimError.NoError(0)
  //         if not yet claimed,
  //         and number of claimed tokens is less than total supply,
  //         and merkle root of the claim window has been set,
  //         and block time is within claim window`, async function () {
  //     await helpers.time.increase(110);

  //     const canClaim = await this.contract.canClaim(epochId, claimer1);
  //     expect(canClaim).to.equal(0);
  //   });
  // });

  context('support meta-transactions', function () {
    it('mock: _msgData()', async function () {
      expect(await this.contract.connect(claimer1).__msgData()).to.be.exist;
    });

    it('mock: _msgSender()', async function () {
      expect(await this.contract.connect(claimer1).__msgSender()).to.be.exist;
    });
  });
});
