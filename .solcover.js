module.exports = {
  skipFiles: [
    'mocks/token/ERC1155/ORBNFTMock.sol',
    'mocks/token/ERC1155/Claim/NonReentrantAttack.sol',
    'mocks/TokenEscrow/ERC1155TokenReceiverMockCaller.sol',
    'mocks/TokenEscrow/TokenEscrowMock.sol',
    'mocks/utils/ContextMock.sol',
    'mocks/MockForwarder.sol',
    'mocks/MockForwarderRegistry.sol',
  ],
};
