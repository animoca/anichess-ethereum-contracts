// require('../setup.js');
const {expect} = require('chai');
// const {Wallet, Provider, Contract, utils, Signer} = require('zksync-ethers');
const {Wallet, Provider, utils} = require('zksync-ethers');
const hre = require('hardhat');
const {Deployer} = require('@matterlabs/hardhat-zksync');

describe('AbstractGaslessPaymaster', function () {
  let provider;
  let randomWallet;
  let emptyWallet;
  // let initialBalance;
  let paymaster;
  let paymasterAddress;
  let greeter;
  // let greeterAddress;
  // let signers;
  let deployer;

  before(async function () {
    const rpcUrl = hre.network.config.url;
    provider = new Provider(rpcUrl, undefined, {cacheTimeout: -1});
    // retrieve default signers
    // signers = await ethers.getSigners();
    // deployer = signers[0];
    // deployerWallet = Wallet.createRandom();
    const privateKey = '0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110';
    const deployerWallet = new Wallet(privateKey, provider);

    // setup new empty wallet
    randomWallet = Wallet.createRandom();
    emptyWallet = new Wallet(randomWallet.privateKey, provider);

    // deploy contracts
    deployer = new Deployer(hre, deployerWallet);

    const greeterArtifact = await deployer.loadArtifact('Greeter');

    greeter = await deployer.deploy(greeterArtifact, ['Hi']);
    greeterAddress = await greeter.getAddress();

    const paymasterArtifact = await deployer.loadArtifact('AbstractGaslessPaymaster').catch((error) => {
      if (error?.message?.includes(`Artifact for contract MockSmartAccount not found.`)) {
        console.error(error.message);
        throw new Error(`⛔️ Please make sure you have compiled your contracts or specified the correct contract name!`);
      } else {
        throw error;
      }
    });

    // Estimate contract deployment fee
    // const paymasterDeploymentFee = await deployer.estimateDeployFee(paymasterArtifact, []);
    // console.log(`Estimated paymaster deployment cost: ${parseEther(paymasterDeploymentFee)} ETH`);

    // Check if the wallet has enough balance
    // await verifyEnoughBalance(deployerWallet, paymasterDeploymentFee);

    // Deploy the contract to zkSync
    paymaster = await deployer.deploy(paymasterArtifact, [greeterAddress, greeter.interface.getFunction('setGreeting').selector]);
    paymasterAddress = await paymaster.getAddress();
    // const smartAccountContractSource = `${smartAccountArtifact.sourceName}:${smartAccountArtifact.contractName}`;

    // const paymaterContractFactory = await ethers.getContractFactory('AbstractGaslessPaymaster');
    // paymaster = await paymaterContractFactory.deploy();
    // paymasterAddress = await paymaster.getAddress();

    // const greeterContractFactory = await ethers.getContractFactory('Greeter');
    // greeter = await greeterContractFactory.deploy('Hi');
    // greeterAddress = await greeter.getAddress();

    // fund paymaster
    await (
      await deployerWallet.sendTransaction({
        to: paymasterAddress,
        value: hre.ethers.parseEther('1'),
      })
    ).wait();

    initialBalance = await provider.getBalance(emptyWallet.address);
  });

  async function executeGreetingTransaction(contract, user) {
    const gasPrice = await provider.getGasPrice();

    const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
      type: 'General',
      // empty bytes as paymaster does not use innerInput
      innerInput: new Uint8Array(),
    });

    const setGreetingTx = await contract.connect(user).setGreeting('Hola, mundo!', {
      maxPriorityFeePerGas: 0n,
      maxFeePerGas: gasPrice,
      // maxFeePerGas: 20000000n,
      // hardcoded for testing
      gasLimit: 6000000,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        paymasterParams,
      },
    });

    return await setGreetingTx.wait();
  }

  describe('validateAndPayForPaymasterTransaction(bytes32 _txHash, bytes32 _suggestedSignedHash, Transaction calldata _transaction)', () => {
    it('reverts with "NotFromBootloader" if not called by bootloader', async () => {
      const tx = {
        txType: 0,
        from: 0,
        to: 0,
        gasLimit: 30000000,
        gasPerPubdataByteLimit: 0,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        paymaster: 0,
        nonce: 0,
        value: 1,
        reserved: [0, 0, 0, 0],
        data: '0x',
        signature: '0x',
        factoryDeps: [],
        paymasterInput: '0x8c5a3445', // general selector
        reservedDynamic: '0x',
      };

      await expect(paymaster.validateAndPayForPaymasterTransaction(ethers.ZeroHash, ethers.ZeroHash, tx)).to.be.revertedWithCustomError(
        paymaster,
        'NotFromBootloader',
      );
    });

    it('reverts with "ShortPaymasterInput" if paymaster input has length less than 4', async () => {
      const tx = {
        txType: 0,
        from: 0,
        to: 0,
        gasLimit: 30000000,
        gasPerPubdataByteLimit: 0,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        paymaster: 0,
        nonce: 0,
        value: 1,
        reserved: [0, 0, 0, 0],
        data: '0x',
        signature: '0x',
        factoryDeps: [],
        paymasterInput: '0x',
        reservedDynamic: '0x',
      };

      await expect(paymaster.validateAndPayForPaymasterTransaction(ethers.ZeroHash, ethers.ZeroHash, tx)).to.be.revertedWithCustomError(
        paymaster,
        'ShortPaymasterInput',
      );
    });

    it('reverts with "UnsupportedPaymasterFlow" if selector in paymaster input is not supported', async () => {
      const tx = {
        txType: 0,
        from: 0,
        to: 0,
        gasLimit: 30000000,
        gasPerPubdataByteLimit: 0,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        paymaster: 0,
        nonce: 0,
        value: 1,
        reserved: [0, 0, 0, 0],
        data: '0x',
        signature: '0x',
        factoryDeps: [],
        paymasterInput: '0x11223344', // Invalid selector
        reservedDynamic: '0x',
      };

      await expect(paymaster.validateAndPayForPaymasterTransaction(ethers.ZeroHash, ethers.ZeroHash, tx)).to.be.revertedWithCustomError(
        paymaster,
        'UnsupportedPaymasterFlow',
      );
    });

    it('reverts with "InvalidToAddress" if contract is not sponsored', async () => {
      const greeterArtifact = await deployer.loadArtifact('Greeter');
      const greeter2 = await deployer.deploy(greeterArtifact, ['Hi']);

      const gasPrice = await provider.getGasPrice();

      const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
        type: 'General',
        // empty bytes as paymaster does not use innerInput
        innerInput: new Uint8Array(),
      });

      const tx = await greeter2.setGreeting('Hola, mundo!', {
        maxPriorityFeePerGas: 0n,
        maxFeePerGas: gasPrice,
        // maxFeePerGas: 20000000n,
        // hardcoded for testing
        gasLimit: 6000000,
        customData: {
          gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
          paymasterParams,
        },
      });

      const receipt = await provider.getTransactionReceipt(tx.hash);
      expect(receipt).to.be.null;
    });

    context('when successful', () => {
      it('Owner can update message for free', async () => {
        const userInitialETHBalance = await provider.getBalance(emptyWallet.address);
        await executeGreetingTransaction(greeter, emptyWallet);

        const newBalance = await provider.getBalance(emptyWallet.address);
        expect(await greeter.greet()).to.equal('Hola, mundo!');
        expect(newBalance).to.eql(userInitialETHBalance);
      });
    });
  });

  // it('should allow owner to withdraw all funds', async function () {
  //   try {
  //     const tx = await paymaster.connect(deployer).withdraw(emptyWallet.address);
  //     await tx.wait();
  //   } catch (e) {
  //     console.error('Error executing withdrawal:', e);
  //   }

  //   const finalContractBalance = await hre.ethers.provider.getBalance(paymasterAddress);

  //   expect(finalContractBalance).to.eql(0n);
  // });

  // it("should prevent non-owners from withdrawing funds", async function () {
  //   try {
  //     await paymaster.connect(emptyWallet).withdraw(emptyWallet.address);
  //   } catch (e) {
  //     expect(e.message).to.include("Ownable: caller is not the owner");
  //   }
  // });
});
