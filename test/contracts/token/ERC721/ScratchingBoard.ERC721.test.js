// const {deployContract} = require('@animoca/ethereum-contract-helpers/src/test/deploy');
// const {getTokenMetadataResolverWithBaseURIAddress} = require('@animoca/ethereum-contracts/test/helpers/registries');
// const {behavesLikeERC721} = require('@animoca/ethereum-contracts/test/contracts/token/ERC721/behaviors/ERC721.behavior');

// const name = 'Pengu Board';
// const symbol = 'PgB';

// describe('PenguBoard (ERC721)', function () {
//   const implementation = {
//     name,
//     symbol,
//     errors: {
//       // ERC721
//       SelfApproval: {custom: true, error: 'ERC721SelfApproval', args: ['account']},
//       SelfApprovalForAll: {custom: true, error: 'ERC721SelfApprovalForAll', args: ['account']},
//       NonApprovedForApproval: {custom: true, error: 'ERC721NonApprovedForApproval', args: ['sender', 'owner', 'tokenId']},
//       TransferToAddressZero: {custom: true, error: 'ERC721TransferToAddressZero'},
//       NonExistingToken: {custom: true, error: 'ERC721NonExistingToken', args: ['tokenId']},
//       NonApprovedForTransfer: {custom: true, error: 'ERC721NonApprovedForTransfer', args: ['sender', 'owner', 'tokenId']},
//       NonOwnedToken: {custom: true, error: 'ERC721NonOwnedToken', args: ['account', 'tokenId']},
//       SafeTransferRejected: {custom: true, error: 'ERC721SafeTransferRejected', args: ['recipient', 'tokenId']},
//       BalanceOfAddressZero: {custom: true, error: 'ERC721BalanceOfAddressZero'},

//       // ERC2981
//       IncorrectRoyaltyReceiver: {custom: true, error: 'ERC2981IncorrectRoyaltyReceiver'},
//       IncorrectRoyaltyPercentage: {custom: true, error: 'ERC2981IncorrectRoyaltyPercentage', args: ['percentage']},

//       // Misc
//       NotContractOwner: {custom: true, error: 'NotContractOwner', args: ['account']},
//     },
//     features: {
//       MetadataResolver: true,
//     },
//     interfaces: {
//       ERC721: true,
//       ERC721Metadata: true,
//       ERC2981: true,
//     },
//     methods: {},
//     deploy: async function (deployer) {
//       const resolver = await getTokenMetadataResolverWithBaseURIAddress();
//       const contract = await deployContract('PenguBoard', name, symbol, resolver);
//       await contract.grantRole(await contract.MINTER_ROLE(), deployer.address);
//       return contract;
//     },
//     mint: async function (contract, to, id, _value) {
//       let nextTokenId = await contract.nextTokenId();
//       while (nextTokenId < id) {
//         await contract.mint(to);
//         await contract.burn(nextTokenId);
//         nextTokenId++;
//       }
//       return contract.mint(to);
//     },
//     tokenMetadata: async function (contract, id) {
//       return contract.tokenURI(id);
//     },
//   };

//   behavesLikeERC721(implementation);
// });
