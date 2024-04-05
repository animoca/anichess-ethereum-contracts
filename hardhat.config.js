const {mergeConfigs} = require('@animoca/ethereum-contract-helpers/src/config');

require('@animoca/ethereum-contract-helpers/hardhat-plugins');

module.exports = mergeConfigs(
  require('@animoca/ethereum-contract-helpers/hardhat-config'),
  require('@animoca/ethereum-contracts/hardhat-config'),
  require('@animoca/ethereum-contracts-1.1.1/hardhat-config'),
  require('./hardhat-config')
);
