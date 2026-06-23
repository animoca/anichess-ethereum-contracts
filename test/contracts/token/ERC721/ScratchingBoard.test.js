const {ethers} = require('hardhat');
const {expect} = require('chai');
const {loadFixture} = require('@animoca/ethereum-contract-helpers/src/test/fixtures');
const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
const {getTokenMetadataResolverWithBaseURIAddress, getForwarderRegistryAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');

describe('ScratchingBoard', function () {
  let deployer, other;

  before(async function () {
    [deployer, other] = await ethers.getSigners();
  });

  const fixture = async function () {
    this.contract = await deployContract('ScratchingBoard', '', '', await getTokenMetadataResolverWithBaseURIAddress());
    await this.contract.grantRole(await this.contract.MINTER_ROLE(), deployer.address);
  };

  beforeEach(async function () {
    await loadFixture(fixture, this);
  });

  describe('mint(address)', function () {
    it('reverts if not called by an account with the minter role', async function () {
      await expect(this.contract.connect(other).mint(other.address))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.MINTER_ROLE(), other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.mint(other.address);
      });

      it('sets the token owner', async function () {
        expect(await this.contract.ownerOf(0)).to.equal(other.address);
      });

      it('increases the token owner balance', async function () {
        expect(await this.contract.balanceOf(other.address)).to.equal(1);
      });

      it('emits a Transfer event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Transfer').withArgs(ethers.ZeroAddress, other.address, 0);
      });

      it('increments the nextTokenId', async function () {
        expect(await this.contract.nextTokenId()).to.equal(1);
      });
    });
  });

  describe('burn(uint256)', function () {
    it('reverts if not called by an account with the minter role', async function () {
      await this.contract.mint(other.address);
      await expect(this.contract.connect(other).burn(0))
        .to.be.revertedWithCustomError(this.contract, 'NotRoleHolder')
        .withArgs(await this.contract.MINTER_ROLE(), other.address);
    });

    it('reverts if the token does not exist', async function () {
      await expect(this.contract.burn(0)).to.be.revertedWithCustomError(this.contract, 'ERC721NonExistingToken').withArgs(0);
    });

    context('when successful', function () {
      beforeEach(async function () {
        await this.contract.mint(other.address);
        this.receipt = await this.contract.burn(0);
      });

      it('removes the token owner', async function () {
        await expect(this.contract.ownerOf(0)).to.be.revertedWithCustomError(this.contract, 'ERC721NonExistingToken').withArgs(0);
      });

      it('decreases the token owner balance', async function () {
        expect(await this.contract.balanceOf(other.address)).to.equal(0);
      });

      it('emits a Transfer event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'Transfer').withArgs(other.address, ethers.ZeroAddress, 0);
      });
    });
  });

  describe('setScratchingContract(address)', function () {
    it('reverts if not called by the contract owner', async function () {
      await expect(this.contract.connect(other).setScratchingContract(other.address))
        .to.be.revertedWithCustomError(this.contract, 'NotContractOwner')
        .withArgs(other.address);
    });

    context('when successful', function () {
      beforeEach(async function () {
        this.receipt = await this.contract.setScratchingContract(other.address);
      });

      it('sets the scratching contract', async function () {
        expect(await this.contract.scratchingContract()).to.equal(other.address);
      });

      it('emits a ScratchingContractSet event', async function () {
        await expect(this.receipt).to.emit(this.contract, 'ScratchingContractSet').withArgs(other.address);
      });
    });
  });

  describe('transfers', function () {
    beforeEach(async function () {
      const erc20 = await deployContract('ERC20FixedSupply', '', '', 18, [], [], await getForwarderRegistryAddress());
      this.scratchingContract = await deployContract(
        'ScratchingMock',
        ethers.ZeroAddress,
        await erc20.getAddress(),
        ethers.ZeroAddress,
        ethers.ZeroAddress,
      );
    });

    describe('transferFrom(address,address,uint256)', function () {
      it('without a scratching contract set, allows transfer', async function () {
        await this.contract.mint(other.address);
        await this.contract.connect(other).transferFrom(other.address, deployer.address, 0);
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('with a scratching contract set and no pending scratch request, allows transfer', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.contract.connect(other).transferFrom(other.address, deployer.address, 0);
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('reverts if there is a scratching contract set and the token has a pending scratch request', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.scratchingContract.setPendingScratchRequest(0, 1);
        await expect(this.contract.connect(other).transferFrom(other.address, deployer.address, 0))
          .to.be.revertedWithCustomError(this.contract, 'PendingScratchRequest')
          .withArgs(0, 1);
      });
    });

    describe('safeTransferFrom(address,address,uint256)', function () {
      it('without a scratching contract set, allows transfer', async function () {
        await this.contract.mint(other.address);
        await this.contract.connect(other).safeTransferFrom(other.address, deployer.address, 0);
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('with a scratching contract set and no pending scratch request, allows transfer', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.contract.connect(other).safeTransferFrom(other.address, deployer.address, 0);
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('reverts if there is a scratching contract set and the token has a pending scratch request', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.scratchingContract.setPendingScratchRequest(0, 1);
        await expect(this.contract.connect(other).safeTransferFrom(other.address, deployer.address, 0))
          .to.be.revertedWithCustomError(this.contract, 'PendingScratchRequest')
          .withArgs(0, 1);
      });
    });

    describe('safeTransferFrom(address,address,uint256,bytes)', function () {
      it('without a scratching contract set, allows transfer', async function () {
        await this.contract.mint(other.address);
        await this.contract.connect(other)['safeTransferFrom(address,address,uint256,bytes)'](other.address, deployer.address, 0, '0x');
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('with a scratching contract set and no pending scratch request, allows transfer', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.contract.connect(other)['safeTransferFrom(address,address,uint256,bytes)'](other.address, deployer.address, 0, '0x');
        expect(await this.contract.ownerOf(0)).to.equal(deployer.address);
      });

      it('reverts if there is a scratching contract set and the token has a pending scratch request', async function () {
        await this.contract.setScratchingContract(await this.scratchingContract.getAddress());
        await this.contract.mint(other.address);
        await this.scratchingContract.setPendingScratchRequest(0, 1);
        await expect(this.contract.connect(other)['safeTransferFrom(address,address,uint256,bytes)'](other.address, deployer.address, 0, '0x'))
          .to.be.revertedWithCustomError(this.contract, 'PendingScratchRequest')
          .withArgs(0, 1);
      });
    });
  });
});
