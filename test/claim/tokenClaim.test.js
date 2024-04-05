const {ethers} = require('hardhat');
const {getOperatorFilterRegistryAddress} = require('@animoca/ethereum-contracts-1.1.1/test/helpers/registries');

describe('ORBNFTClaimTest', function () {
  let deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other, MINTER_ROLE;

  // Set up test data
  let orbIds = [1, 2, 3];
  let xpUsed = [100, 200, 300];
  let amount = [1, 1, 1];

  beforeEach(async function () {
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    [deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other] = await ethers.getSigners();
    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    this.tokenClaim = await tokenClaimContract.deploy(this.ORBNFTToken.address, signer.address);
    MINTER_ROLE = await this.ORBNFTToken.MINTER_ROLE();
  });

  it('should claim tokens successfully when orbIds, xpUsed, amount values are correct', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the datan
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Claim tokens
    await this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature);

    const balance1 = await this.ORBNFTToken.balanceOf(claimer.address, orbIds[0]);
    expect(balance1).to.equal(amount[0]);

    const balance2 = await this.ORBNFTToken.balanceOf(claimer.address, orbIds[1]);
    expect(balance2).to.equal(amount[1]);

    const balance3 = await this.ORBNFTToken.balanceOf(claimer.address, orbIds[2]);
    expect(balance3).to.equal(amount[2]);
  });

  it('should increment user nonce on successful token claim', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the datan
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Claim tokens
    await this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature);

    // Verify the updated nonce
    const newNonce = await this.tokenClaim.getNonce(claimer.address);
    expect(newNonce).to.equal(nonce.add(1));
  });

  it('should revert when claiming tokens with invalid nonce', async function () {
    const nonce = 2;

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the data
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Claim tokens
    await expect(this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature)).to.be.revertedWith('TokenClaim: invalid signature');
  });

  it('should emit TokensClaimed event', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the data
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Call the contract's claimTokens function
    await expect(this.tokenClaim.connect(claimer).claimTokens(claimer.address, orbIds, xpUsed, amount, signature))
      .to.emit(this.tokenClaim, 'TokensClaimed')
      .withArgs(claimer.address, orbIds, amount, xpUsed, nonce);
  });

  it('should grant and revoke MINTER_ROLE', async function () {
    // Grant MINTER_ROLE to an address
    await this.ORBNFTToken.grantRole(MINTER_ROLE, claimer.address);
    expect(await this.ORBNFTToken.hasRole(MINTER_ROLE, claimer.address)).to.be.true;

    // Revoke MINTER_ROLE from an address
    await this.ORBNFTToken.revokeRole(MINTER_ROLE, claimer.address);
    expect(await this.ORBNFTToken.hasRole(MINTER_ROLE, claimer.address)).to.be.false;
  });

  it('should revert when claiming tokens with incorrect xpUsed', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the datan
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Set incorrect xpUsed values
    const incorrectXpUsed = [99, 200, 300];

    // Claim tokens
    await expect(this.tokenClaim.claimTokens(claimer.address, orbIds, incorrectXpUsed, amount, signature)).to.be.revertedWith(
      'TokenClaim: invalid signature'
    );
  });

  it('should revert when claiming tokens with invalid orbId', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the datan
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Set incorrect xpUsed values
    const incorrectorbIds = [3, 2, 1];

    // Claim tokens
    await expect(this.tokenClaim.claimTokens(claimer.address, orbIds, incorrectorbIds, amount, signature)).to.be.revertedWith(
      'TokenClaim: invalid signature'
    );
  });

  it('should set the signer address correctly', async function () {
    // Call the setMessageSigner function and set the new signer address
    const signerAddress = await signer.getAddress();
    await this.tokenClaim.setMessageSigner(signerAddress);

    // Get the updated signer address from the contract
    const updatedSigner = await this.tokenClaim.messageSigner();

    // Assert that the updated signer address matches the new signer address
    expect(updatedSigner).to.equal(signerAddress);
  });

  it('should revert when setting the signer address to zero address', async function () {
    const zeroAddress = ethers.constants.AddressZero;
    await expect(this.tokenClaim.setMessageSigner(zeroAddress)).to.be.revertedWith('TokenClaim: invalid signer');
  });

  it('should emit MessageSignerUpdated event', async function () {
    const currentSigner = await this.tokenClaim.messageSigner();
    const signerAddress = '0xbEd6b9Eb1a051E45EF905a2d75618F7591600a18';

    await expect(this.tokenClaim.setMessageSigner(signerAddress))
      .to.emit(this.tokenClaim, 'MessageSignerUpdated')
      .withArgs(currentSigner, signerAddress);

    expect(currentSigner).to.not.equal(signerAddress);
  });

  it('should return the correct nonce value for a given user', async function () {
    // Get the initial nonce value for the claimer
    const initialNonce = await this.tokenClaim.getNonce(claimer.address);

    // Verify that the initial nonce is zero
    expect(initialNonce).to.equal(0);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the data
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, initialNonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Call the claimTokens function to increment the nonce
    await this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature);

    // Get the updated nonce value for the claimer
    const updatedNonce = await this.tokenClaim.getNonce(claimer.address);

    // Verify that the updated nonce is incremented by 1
    expect(updatedNonce).to.equal(initialNonce + 1);
  });

  it('should revert when claiming tokens with a used nonce', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);
    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);

    // Generate message hash
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [claimer.address, orbIds, xpUsed, nonce, amount, chainId]
    );
    const messageHash = ethers.utils.keccak256(message);

    // Sign the message hash with the claimer's signer
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // Claim tokens with the initial nonce
    await this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature);

    // Attempt to claim tokens again with the same nonce
    await expect(this.tokenClaim.claimTokens(claimer.address, orbIds, xpUsed, amount, signature)).to.be.revertedWith('TokenClaim: invalid signature');
  });
});

describe('ORBNFTClaimTest Constructor', function () {
  let deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other, MINTER_ROLE;
  beforeEach(async function () {
    [deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other] = await ethers.getSigners();
  });

  it('Constructor: When both Signer Address and Inventory Addresses are Non Zero Addresses', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    await expect(tokenClaimContract.deploy(this.ORBNFTToken.address, signer.address));
  });

  it('Constructor: When Inventory Address is Zero Address', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    await expect(tokenClaimContract.deploy(ethers.constants.AddressZero, signer.address)).to.be.revertedWith('TokenClaim: invalid inventory');
  });

  it('Constructor: When Signer Address is Zero Address', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    await expect(tokenClaimContract.deploy(this.ORBNFTToken.address, ethers.constants.AddressZero)).to.be.revertedWith('TokenClaim: invalid signer');
  });

  it('Constructor: When both Signer Address and Inventory Addresses are Zero Addresses', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    await expect(tokenClaimContract.deploy(ethers.constants.AddressZero, ethers.constants.AddressZero)).to.be.revertedWith(
      'TokenClaim: invalid inventory'
    );
  });

  it('Constructor: should emit SignerUpdated event', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContractFactory = await ethers.getContractFactory('TokenClaim');
    const tokenClaimContract = await tokenClaimContractFactory.deploy(this.ORBNFTToken.address, signer.address);

    const events = await tokenClaimContract.queryFilter('MessageSignerUpdated');
    const filtered = events.filter((el) => el.event === 'MessageSignerUpdated');
    expect(filtered.length).to.equal(1);
    expect(filtered[0].args['oldMessageSigner']).to.equal(ethers.constants.AddressZero);
    expect(filtered[0].args['newMessageSigner']).to.equal(signer.address);
  });

  it('Constructor: should inherit TokenRecovery contract', async function () {
    // Deploy the TokenClaim contract
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContractFactory = await ethers.getContractFactory('TokenClaim');
    const tokenClaimContract = await tokenClaimContractFactory.deploy(this.ORBNFTToken.address, signer.address);

    await expect(tokenClaimContract.recoverETH([other.address], [0])).not.to.be.revertedWith('');
  });
});

describe('Reentrancy Test', function () {
  let deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other, MINTER_ROLE;
  // Set up test data
  let orbIds = [1, 2, 3];
  let xpUsed = [100, 200, 300];
  let amount = [1, 1, 1];

  beforeEach(async function () {
    const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();

    [deployer, tokenHolder, payoutWallet, claimer, recipient, signer, other] = await ethers.getSigners();
    const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
    this.ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
    const tokenClaimContract = await ethers.getContractFactory('TokenClaim');
    this.tokenClaim = await tokenClaimContract.deploy(this.ORBNFTToken.address, signer.address);
    MINTER_ROLE = await this.ORBNFTToken.MINTER_ROLE();

    const Attack = await ethers.getContractFactory('NonReentrantAttack');
    this.attackContract = await Attack.deploy(this.tokenClaim.address);
  });

  it('should perform a reentrancy attack', async function () {
    const nonce = await this.tokenClaim.getNonce(claimer.address);

    await this.ORBNFTToken.grantRole(MINTER_ROLE, this.tokenClaim.address);
    const chainId = await ethers.provider.getNetwork().then((network) => network.chainId);

    // Sign the data
    const message = ethers.utils.solidityPack(
      ['address', 'uint256[]', 'uint256[]', 'uint256', 'uint256[]', 'uint256'],
      [this.attackContract.address, orbIds, xpUsed, nonce, amount, chainId]
    );

    const messageHash = ethers.utils.keccak256(message);
    const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));

    // TODO: update reentrancy test
    await expect(this.tokenClaim.claimTokens(this.attackContract.address, orbIds, xpUsed, amount, signature)).to.be.revertedWith(
      'ECDSA: invalid signature length'
    );
  });
});
