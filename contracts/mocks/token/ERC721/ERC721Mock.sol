// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC721} from "@animoca/ethereum-contracts/contracts/token/ERC721/interfaces/IERC721.sol";

contract ERC721Mock {
    mapping(uint256 => address) private _owners;

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }
}
