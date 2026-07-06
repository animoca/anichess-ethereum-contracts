const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {getForwarderRegistryAddress, getTokenMetadataResolverWithBaseURIAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

const {FulfillRandomnessType} = require('../../../src/constants/RNGProvider');
const {RequestType, RewardType, rowPrices, boardPositionsSetup, erc20RewardDivisor} = require('../../../src/constants/Scratching');

describe('Scratching', function () {
  let deployer, other, signer;

  before(async function () {
    [deployer, other, signer, holder] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.forwaderRegistryAddress = await getForwarderRegistryAddress();
    this.erc20 = await deployContract('ERC20FixedSupply', '', '', 18, [holder.address], [ethers.MaxUint256], this.forwaderRegistryAddress);
    this.board = await deployContract('ScratchingBoard', '', '', await getTokenMetadataResolverWithBaseURIAddress(), this.forwaderRegistryAddress);
    this.rng = await deployContract('RNGProvider', signer.address);
    this.rngDomain = {
      name: 'RNGProvider',
      version: '1',
      chainId: await getChainId(),
      verifyingContract: await this.rng.getAddress(),
    };
    this.points = await deployContract('PointsV2', this.forwaderRegistryAddress);
    await this.points.grantRole(await this.points.DEPOSITOR_ROLE(), deployer.address);
    await this.points.deposit(deployer.address, ethers.MaxUint256, ethers.ZeroHash);
    await this.points.deposit(other.address, ethers.MaxUint256, ethers.ZeroHash);
    this.contract = await deployContract(
      'ScratchingMock',
      await this.board.getAddress(),
      await this.erc20.getAddress(),
      await this.rng.getAddress(),
      await this.points.getAddress(),
    );
    this.rng.whitelistConsumer(await this.contract.getAddress(), true);
    await this.erc20.connect(holder).approve(await this.contract.getAddress(), ethers.MaxUint256);
    await this.board.grantRole(await this.board.MINTER_ROLE(), await this.contract.getAddress());
    await this.board.grantRole(await this.board.MINTER_ROLE(), deployer.address);
    await this.board.setScratchingContract(await this.contract.getAddress());
    await this.contract.setERC20TokenHolder(holder.address);
    this.erc20RewardMultiplier = 10n ** (await this.erc20.decimals()) / erc20RewardDivisor;
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('constructor(address)', function () {
    it('reverts if the ERC20 token has less than 2 decimals', async function () {
      const erc20 = await deployContract('ERC20FixedSupply', '', '', 1, [], [], this.forwaderRegistryAddress);
      await expect(
        deployContract(
          'ScratchingMock',
          await this.board.getAddress(),
          await erc20.getAddress(),
          await this.rng.getAddress(),
          await this.points.getAddress(),
        ),
      )
        .to.be.revertedWithCustomError(this.contract, 'UnsupportedERC20TokenDecimals')
        .withArgs(await erc20.decimals());
    });

    context('when successful', function () {
      it('sets the Scratching Board', async function () {
        expect(await this.contract.SCRATCHING_BOARD()).to.equal(await this.board.getAddress());
      });
      it('sets the ERC20 token', async function () {
        expect(await this.contract.ERC20_TOKEN()).to.equal(await this.erc20.getAddress());
      });

      it('sets the RNGProvider', async function () {
        expect(await this.contract.RNG_PROVIDER()).to.equal(await this.rng.getAddress());
      });
    });
  });

  describe('setERC20TokenHolder(address)', function () {
    it('reverts if not called by the contract owner', async function () {
      await expect(this.contract.connect(other).setERC20TokenHolder(other.address))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.setERC20TokenHolder(other.address);
      });
      it('sets the ERC20 token holder', async function () {
        expect(await this.contract.erc20TokenHolder()).to.equal(other.address);
      });
      it('emits a ERC20TokenHolderUpdated event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ERC20TokenHolderUpdated').withArgs(other.address);
      });
    });
  });

  describe('getMintPrice()', function () {
    it('returns the correct price', async function () {
      expect(await this.contract.getMintPrice()).to.equal(boardPositionsSetup[0].price);
    });
  });

  describe('getSingleScratchPrice(uint256) & getRowScratchPrice(uint256)', function () {
    for (let i = 0; i < 64; i++) {
      it(
        `returns the correct prices for board position ${i} (single: ${boardPositionsSetup[i].price}, ` + `row: ${rowPrices[Math.floor(i / 8)]})`,
        async function () {
          const tokenId = 0;
          await this.contract.setBoardPosition(tokenId, i);
          expect(await this.contract.getSingleScratchPrice(tokenId)).to.equal(boardPositionsSetup[i].price);
          expect(await this.contract.getRowScratchPrice(tokenId)).to.equal(rowPrices[Math.floor(i / 8)]);
        },
      );
    }
  });

  describe('_onPointsSpent(address,uint256,bytes)', function () {
    it('reverts if the data is malformed', async function () {
      await expect(this.points.spendAndCall(0, await this.contract.getAddress(), '0x12')).to.be.reverted;
    });

    describe('mint', function () {
      it('reverts if the payment amount is incorrect', async function () {
        const amount = (await this.contract.getMintPrice()) - 1n;
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.MINT, 0]);
        await expect(this.points.spendAndCall(amount, await this.contract.getAddress(), data))
          .to.be.revertedWithCustomError(this.contract, 'IncorrectPaymentAmount')
          .withArgs(0, await this.contract.getMintPrice(), amount);
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.tokenId = 0;
          this.mintPrice = await this.contract.getMintPrice();
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.MINT, 0]);
          this.receipt = await this.points.spendAndCall(this.mintPrice, await this.contract.getAddress(), data);
          this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 0]));
        });

        it('mints a new Scratching Board NFT to the caller', async function () {
          expect(await this.board.ownerOf(0)).to.equal(deployer.address);
        });

        it('the Scratching Board emits a Transfer event', async function () {
          await expect(this.receipt).to.emit(this.board, 'Transfer').withArgs(ethers.ZeroAddress, deployer.address, 0);
        });

        it('the Points emits a Spent event', async function () {
          await expect(this.receipt).to.emit(this.points, 'Spent').withArgs(deployer.address, deployer.address, this.mintPrice);
        });

        it('the RNG Provider emits a RandomnessRequested event', async function () {
          await expect(this.receipt)
            .to.emit(this.rng, 'RandomnessRequested')
            .withArgs(await this.contract.getAddress(), this.requestId, 1);
        });

        it('sets a pending scratching request', async function () {
          expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(this.requestId);
        });

        it('sets the scratching request status', async function () {
          const status = await this.contract.scratchRequests(this.requestId);
          expect(status).to.deep.equal([this.tokenId, RequestType.MINT]);
        });
      });
    });

    describe('scratchSingle', function () {
      beforeEach(async function () {
        this.tokenId = 0;
        this.mintPrice = await this.contract.getMintPrice();
        const mintData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.MINT, 0]);
        await this.points.spendAndCall(this.mintPrice, await this.contract.getAddress(), mintData);
        const mintRequestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 0]));
        const mintRandomWords = [ethers.MaxUint256];
        const fulfillRandomnessSignature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
          requestId: mintRequestId,
          randomWords: mintRandomWords,
        });
        await this.rng.fulfillRandomness(mintRequestId, mintRandomWords, fulfillRandomnessSignature);
      });

      it('reverts if the caller is not the owner of the token', async function () {
        this.scratchPrice = await this.contract.getSingleScratchPrice(this.tokenId);
        const scratchData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, this.tokenId]);
        await expect(this.points.connect(other).spendAndCall(this.scratchPrice, await this.contract.getAddress(), scratchData))
          .to.be.revertedWithCustomError(this.contract, 'NotTheTokenOwner')
          .withArgs(this.tokenId, deployer.address, other.address);
      });

      it('reverts if there is a pending scratch request for the token', async function () {
        this.scratchPrice = await this.contract.getSingleScratchPrice(this.tokenId);
        const scratchData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, this.tokenId]);
        await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), scratchData);
        const scratchRequestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 1]));
        await expect(this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), scratchData))
          .to.be.revertedWithCustomError(this.contract, 'ScratchRequestPending')
          .withArgs(this.tokenId, scratchRequestId);
      });

      it('reverts if the payment amount is incorrect', async function () {
        this.scratchPrice = await this.contract.getSingleScratchPrice(this.tokenId);
        const scratchData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, this.tokenId]);
        await expect(this.points.spendAndCall(this.scratchPrice - 1n, await this.contract.getAddress(), scratchData))
          .to.be.revertedWithCustomError(this.contract, 'IncorrectPaymentAmount')
          .withArgs(0, this.scratchPrice, this.scratchPrice - 1n);
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.scratchPrice = await this.contract.getSingleScratchPrice(this.tokenId);
          const scratchData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, this.tokenId]);
          this.receipt = await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), scratchData);
          this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 1]));
        });

        it('the RNG Provider emits a RandomnessRequested event', async function () {
          await expect(this.receipt)
            .to.emit(this.rng, 'RandomnessRequested')
            .withArgs(await this.contract.getAddress(), this.requestId, 1);
        });

        it('the Points emits a Spent event', async function () {
          await expect(this.receipt).to.emit(this.points, 'Spent').withArgs(deployer.address, deployer.address, this.scratchPrice);
        });

        it('sets a pending scratching request', async function () {
          expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(this.requestId);
        });

        it('sets the scratching request status', async function () {
          const status = await this.contract.scratchRequests(this.requestId);
          expect(status).to.deep.equal([this.tokenId, RequestType.SINGLE]);
        });
      });
    });

    describe('scratchRow', function () {
      beforeEach(async function () {
        this.tokenId = 0;
        this.mintPrice = await this.contract.getMintPrice();
        const mintData = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.MINT, 0]);
        await this.points.spendAndCall(this.mintPrice, await this.contract.getAddress(), mintData);
        const mintRequestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 0]));
        const mintRandomWords = [ethers.MaxUint256];
        const fulfillRandomnessSignature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
          requestId: mintRequestId,
          randomWords: mintRandomWords,
        });
        await this.rng.fulfillRandomness(mintRequestId, mintRandomWords, fulfillRandomnessSignature);
      });

      it('reverts if the caller is not the owner of the token', async function () {
        this.scratchPrice = await this.contract.getRowScratchPrice(0);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
        await expect(this.points.connect(other).spendAndCall(this.scratchPrice, await this.contract.getAddress(), data))
          .to.be.revertedWithCustomError(this.contract, 'NotTheTokenOwner')
          .withArgs(0, deployer.address, other.address);
      });

      it('reverts if there is a pending scratch request for the token', async function () {
        this.scratchPrice = await this.contract.getRowScratchPrice(0);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
        await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
        const scratchRequestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 7, 1]));
        await expect(this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data))
          .to.be.revertedWithCustomError(this.contract, 'ScratchRequestPending')
          .withArgs(this.tokenId, scratchRequestId);
      });

      context('when successful', function () {
        beforeEach(async function () {
          this.tokenId = 0;
          this.scratchPrice = await this.contract.getRowScratchPrice(this.tokenId);
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
          this.receipt = await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
          this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 7, 1]));
        });

        it('the RNG Provider emits a RandomnessRequested event', async function () {
          await expect(this.receipt)
            .to.emit(this.rng, 'RandomnessRequested')
            .withArgs(await this.contract.getAddress(), this.requestId, 7);
        });

        it('the Points emits a Spent event', async function () {
          await expect(this.receipt).to.emit(this.points, 'Spent').withArgs(deployer.address, deployer.address, this.scratchPrice);
        });

        it('sets a pending scratching request', async function () {
          expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(this.requestId);
        });

        it('sets the scratching request status', async function () {
          const status = await this.contract.scratchRequests(this.requestId);
          expect(status).to.deep.equal([this.tokenId, RequestType.ROW]);
        });
      });
    });
  });

  describe('_fulfillRandomness(uint256,uint256[],bytes)', function () {
    context('single scratch request', function () {
      for (let i = 0n; i < 64n; i++) {
        context(`on board position ${i}`, function () {
          beforeEach(async function () {
            this.tokenId = 0;
            await this.board.mint(deployer.address);
            await this.contract.setBoardPosition(this.tokenId, i);
          });

          const nbRewards = BigInt(boardPositionsSetup[i].rewards.length);
          for (let j = 0; j < nbRewards; j++) {
            const reward = boardPositionsSetup[i].rewards[j];
            context(`with a ${Object.keys(RewardType)[reward.type]} reward`, function () {
              beforeEach(async function () {
                this.scratchPrice = await this.contract.getSingleScratchPrice(this.tokenId);
                const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, this.tokenId]);
                await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
                this.requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, 0]));
                const accumulatedProbability = boardPositionsSetup[i].rewards
                  .map((r) => r.probability)
                  .slice(0, j + 1)
                  .reduce((a, b) => a + b, 0n);
                const randomValue = BigInt(accumulatedProbability) * 10n ** 60n - 1n;
                this.randomWords = [randomValue];
                const signature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
                  requestId: this.requestId,
                  randomWords: this.randomWords,
                });
                this.scratchBoardPosition = await this.contract.boardPositions(this.tokenId);
                this.receipt = await this.rng.fulfillRandomness(this.requestId, this.randomWords, signature);
              });

              it('clears the pending scratch request', async function () {
                expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(0);
              });

              if (reward.type == RewardType.PROGRESS) {
                it('increases the board position by 1', async function () {
                  expect(await this.contract.boardPositions(this.tokenId)).to.equal(this.scratchBoardPosition + 1n);
                });

                it('does not burn the Board token', async function () {
                  expect(await this.board.ownerOf(this.tokenId)).to.equal(deployer.address);
                });

                it('does not transfer any reward to the token owner', async function () {
                  expect(this.receipt).to.not.emit(this.erc20, 'Transfer');
                });
              } else {
                it('does not increase the board position', async function () {
                  expect(await this.contract.boardPositions(this.tokenId)).to.equal(this.scratchBoardPosition);
                });

                it('burns the Board token', async function () {
                  await expect(this.board.ownerOf(this.tokenId))
                    .to.be.revertedWithCustomError(this.board, 'ERC721NonExistingToken')
                    .withArgs(this.tokenId);
                  await expect(this.receipt).to.emit(this.board, 'Transfer').withArgs(deployer.address, ethers.ZeroAddress, this.tokenId);
                });

                it('transfers the reward to the token owner', async function () {
                  console.log(
                    'Board position:',
                    this.scratchBoardPosition,
                    'Reward type:',
                    Object.keys(RewardType)[reward.type],
                    'Reward amount:',
                    ethers.formatEther(reward.reward * this.erc20RewardMultiplier),
                  );
                  await expect(this.receipt)
                    .to.emit(this.erc20, 'Transfer')
                    .withArgs(holder.address, deployer.address, reward.reward * this.erc20RewardMultiplier);
                });
              }

              it('emits a ScratchedSingle event', async function () {
                await expect(this.receipt)
                  .to.emit(this.contract, 'ScratchedSingle')
                  .withArgs(this.tokenId, this.scratchBoardPosition, reward.type, reward.reward * this.erc20RewardMultiplier);
              });
            });
          }
        });
      }
    });

    context('row scratch request', function () {
      function rowScratch(boardPosition) {
        const nbScratches = 8 - (boardPosition % 8);
        beforeEach(async function () {
          this.tokenId = 0;
          await this.board.mint(deployer.address);
          await this.contract.setBoardPosition(this.tokenId, boardPosition);
        });
        for (let i = 0; i < nbScratches; i++) {
          context(`reward hit when scratching position ${i + 1}`, function () {
            beforeEach(async function () {
              this.scratchPrice = await this.contract.getRowScratchPrice(this.tokenId);
              const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
              await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
              this.requestId = BigInt(
                ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), nbScratches, 0]),
              );
              this.randomWords = new Array(nbScratches).fill(ethers.MaxUint256);
              this.randomWords[i] = 0n;
              const signature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
                requestId: this.requestId,
                randomWords: this.randomWords,
              });
              this.receipt = await this.rng.fulfillRandomness(this.requestId, this.randomWords, signature);
            });

            it('clears the pending scratch request', async function () {
              expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(0);
            });

            if (i == 0) {
              it('does not increase the board position', async function () {
                expect(await this.contract.boardPositions(this.tokenId)).to.equal(boardPosition);
              });
            } else {
              it('increases the board position by the number of scratches before the reward hit', async function () {
                expect(await this.contract.boardPositions(this.tokenId)).to.equal(boardPosition + i);
              });
            }

            it('burns the Board token', async function () {
              await expect(this.board.ownerOf(this.tokenId))
                .to.be.revertedWithCustomError(this.board, 'ERC721NonExistingToken')
                .withArgs(this.tokenId);
              await expect(this.receipt).to.emit(this.board, 'Transfer').withArgs(deployer.address, ethers.ZeroAddress, this.tokenId);
            });

            it('transfers the reward to the token owner', async function () {
              await expect(this.receipt)
                .to.emit(this.erc20, 'Transfer')
                .withArgs(holder.address, deployer.address, boardPositionsSetup[boardPosition + i].rewards[0].reward * this.erc20RewardMultiplier);
            });

            it('emits a ScratchedRow event', async function () {
              await expect(this.receipt)
                .to.emit(this.contract, 'ScratchedRow')
                .withArgs(
                  this.tokenId,
                  boardPosition,
                  boardPosition + i,
                  boardPositionsSetup[boardPosition + i].rewards[0].type,
                  boardPositionsSetup[boardPosition + i].rewards[0].reward * this.erc20RewardMultiplier,
                );
            });
          });
        }
        context('no reward hit when scratching all positions', function () {
          beforeEach(async function () {
            this.scratchPrice = await this.contract.getRowScratchPrice(this.tokenId);
            const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
            await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
            this.requestId = BigInt(
              ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), nbScratches, 0]),
            );
            this.randomWords = new Array(nbScratches).fill(ethers.MaxUint256);
            const signature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
              requestId: this.requestId,
              randomWords: this.randomWords,
            });
            this.receipt = await this.rng.fulfillRandomness(this.requestId, this.randomWords, signature);
          });
          it('clears the pending scratch request', async function () {
            expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(0);
          });
          it('increases the board position to after the end of the row', async function () {
            expect(await this.contract.boardPositions(this.tokenId)).to.equal(boardPosition + nbScratches);
          });
          it('does not burn the Board token', async function () {
            expect(await this.board.ownerOf(this.tokenId)).to.equal(deployer.address);
          });
          it('does not transfer any reward to the token owner', async function () {
            await expect(this.receipt).to.not.emit(this.erc20, 'Transfer');
          });
          it('emits a ScratchedRow event', async function () {
            await expect(this.receipt)
              .to.emit(this.contract, 'ScratchedRow')
              .withArgs(this.tokenId, boardPosition, boardPosition + nbScratches - 1, RewardType.PROGRESS, 0);
          });
        });
      }

      context('scratching from initial position after minting (position 1)', function () {
        rowScratch(1);
      });

      context('scratching from position 7 (end of first row)', function () {
        rowScratch(7);
      });

      context('scratching from position 8 (start of second row)', function () {
        rowScratch(8);
      });

      context('scratching from position 12 (middle of second row)', function () {
        rowScratch(12);
      });

      context('scratching from position 15 (end of second row)', function () {
        rowScratch(15);
      });

      context('scratching from position 63 (final position)', function () {
        const boardPosition = 63;
        const nbScratches = 8 - (boardPosition % 8);
        beforeEach(async function () {
          this.tokenId = 0;
          await this.board.mint(deployer.address);
          await this.contract.setBoardPosition(this.tokenId, boardPosition);
          this.scratchPrice = await this.contract.getRowScratchPrice(this.tokenId);
          const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.ROW, this.tokenId]);
          await this.points.spendAndCall(this.scratchPrice, await this.contract.getAddress(), data);
          this.requestId = BigInt(
            ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), nbScratches, 0]),
          );
          this.randomWords = [0n];
          const signature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
            requestId: this.requestId,
            randomWords: this.randomWords,
          });
          this.receipt = await this.rng.fulfillRandomness(this.requestId, this.randomWords, signature);
        });

        it('clears the pending scratch request', async function () {
          expect(await this.contract.pendingScratchRequest(this.tokenId)).to.equal(0);
        });

        it('does not increase the board position', async function () {
          expect(await this.contract.boardPositions(this.tokenId)).to.equal(boardPosition);
        });

        it('burns the Board token', async function () {
          await expect(this.board.ownerOf(this.tokenId)).to.be.revertedWithCustomError(this.board, 'ERC721NonExistingToken').withArgs(this.tokenId);
          await expect(this.receipt).to.emit(this.board, 'Transfer').withArgs(deployer.address, ethers.ZeroAddress, this.tokenId);
        });

        it('transfers the reward to the token owner', async function () {
          await expect(this.receipt)
            .to.emit(this.erc20, 'Transfer')
            .withArgs(holder.address, deployer.address, boardPositionsSetup[boardPosition].rewards[0].reward * this.erc20RewardMultiplier);
        });

        it('emits a ScratchedRow event', async function () {
          await expect(this.receipt)
            .to.emit(this.contract, 'ScratchedRow')
            .withArgs(
              this.tokenId,
              boardPosition,
              boardPosition,
              boardPositionsSetup[boardPosition].rewards[0].type,
              boardPositionsSetup[boardPosition].rewards[0].reward * this.erc20RewardMultiplier,
            );
        });
      });
    });
  });

  describe.skip('RNG probability test', function () {
    const boardPosition = 17; // B3

    it('hits the rewards with correct probability', async function () {
      let random = BigInt('0x0e243149833c93f3086937269af326795595405c06a7aba270b06f8397074d85');

      const hits = {
        [RewardType.PROGRESS]: 0,
        [RewardType.X1]: 0,
        [RewardType.X5]: 0,
      };

      const iterations = 20000;

      for (let i = 0; i < iterations; i++) {
        await this.board.mint(deployer.address);
        await this.contract.setBoardPosition(i, boardPosition);
        const scratchPrice = await this.contract.getSingleScratchPrice(i);
        const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint8', 'uint256'], [RequestType.SINGLE, i]);
        await this.points.spendAndCall(scratchPrice, await this.contract.getAddress(), data);
        const requestId = BigInt(ethers.solidityPackedKeccak256(['address', 'uint32', 'uint256'], [await this.contract.getAddress(), 1, i]));
        const randomWords = [random];
        const signature = await signer.signTypedData(this.rngDomain, FulfillRandomnessType, {
          requestId: requestId,
          randomWords: randomWords,
        });
        const receipt = await this.rng.fulfillRandomness(requestId, randomWords, signature);
        const logs = (await receipt.wait()).logs;
        const event = this.contract.interface.parseLog(logs[logs.length - 1]);
        hits[event.args.rewardType]++;
        random = ethers.keccak256(ethers.solidityPacked(['uint256'], [random]));
      }

      const progressRate = (hits[RewardType.PROGRESS] * 100) / iterations;
      const x1Rate = (hits[RewardType.X1] * 100) / iterations;
      const x5Rate = (hits[RewardType.X5] * 100) / iterations;

      const expectedProgressRate = Number(boardPositionsSetup[boardPosition].rewards[2].probability) / 100;
      const expectedX1Rate = Number(boardPositionsSetup[boardPosition].rewards[1].probability) / 100;
      const expectedX5Rate = Number(boardPositionsSetup[boardPosition].rewards[0].probability) / 100;

      console.log('Total iterations:', iterations);
      console.log(`Progress hits: ${hits[RewardType.PROGRESS]}, rate ${progressRate}%, expected ${expectedProgressRate}%`);
      console.log(`X5 hits: ${hits[RewardType.X5]}, rate ${x5Rate}%, expected ${expectedX5Rate}%`);
      console.log(`X1 hits: ${hits[RewardType.X1]}, rate ${x1Rate}%, expected ${expectedX1Rate}%`);

      expect(progressRate).to.be.closeTo(expectedProgressRate, 0.5);
      expect(x1Rate).to.be.closeTo(expectedX1Rate, 0.5);
      expect(x5Rate).to.be.closeTo(expectedX5Rate, 0.5);
    });
  });
});
