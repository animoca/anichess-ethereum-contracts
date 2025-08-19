require('@matterlabs/hardhat-zksync');

module.exports = {
  networks: {
    //----------------------------//
    //        DEVELOPMENT         //
    //----------------------------//
    zksyncLocal: {
      url: 'http://127.0.0.1:8011',
      ethNetwork: 'sepolia',
      zksync: true,
    },
  },
};
