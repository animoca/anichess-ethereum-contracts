module.exports = {
  zksolc: {
    version: '1.5.6',
    settings: {
      enableEraVMExtensions: true,
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 99999,
          },
          evmVersion: 'paris', // until PUSH0 opcode is widely supported
        },
      },
    ],
  },
};
