const {ethers} = require('hardhat');
const {getOperatorFilterRegistryAddress} = require('@animoca/ethereum-contracts-1.1.1/test/helpers/registries');

/**
 *
 * @param {string[]} minters the addresses of the minters
 * @returns
 */
const deployOrbMockFixture = async () => {
  const operatorFilterRegistryAddress = await getOperatorFilterRegistryAddress();
  const ORBNFTMockContract = await ethers.getContractFactory('ORBNFTMock');
  const ORBNFTToken = await ORBNFTMockContract.deploy(operatorFilterRegistryAddress, 'ORBNFT', 'ORB');
  await ORBNFTToken.deployed();
  return ORBNFTToken;
};

module.exports = {
  deployOrbMockFixture,
};
