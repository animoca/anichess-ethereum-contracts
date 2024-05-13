// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ERC1155ClaimWindowMerkleClaim} from "../../merkleClaim/ERC1155ClaimWindowMerkleClaim.sol";
import {IERC1155Mintable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Mintable.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC1155ClaimWindowMerkleClaimMock is ERC1155ClaimWindowMerkleClaim {
    constructor(
        uint256 tokenId,
        uint256 mintSupply,
        IERC1155Mintable rewardContract,
        IForwarderRegistry forwarderRegistry
    ) ERC1155ClaimWindowMerkleClaim(tokenId, mintSupply, rewardContract, forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
