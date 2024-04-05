// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {TokenClaim} from "contracts/claim/TokenClaim.sol";

contract NonReentrantAttack {
    TokenClaim public tokenClaim;
    address public attackContractAddress;

    constructor(address _tokenClaimAddress) {
        tokenClaim = TokenClaim(_tokenClaimAddress);
    }

    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external {
        address to = address(this);
        uint256[] memory orbIds = new uint256[](3);
        orbIds[0] = 1;
        orbIds[1] = 2;
        orbIds[2] = 3;
        uint256[] memory xp = new uint256[](3);
        xp[0] = 100;
        xp[1] = 200;
        xp[2] = 300;
        uint256[] memory orbcount = new uint256[](3);
        orbcount[0] = 1;
        orbcount[1] = 1;
        orbcount[2] = 1;
        bytes memory signature = "0x";

        tokenClaim.claimTokens(to, orbIds, xp, orbcount, signature);
    }
}
