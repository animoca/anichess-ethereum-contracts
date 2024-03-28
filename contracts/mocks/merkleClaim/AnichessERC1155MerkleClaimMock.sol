// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AnichessERC1155MerkleClaim} from "../../merkleClaim/AnichessERC1155MerkleClaim.sol";
import {IERC1155Mintable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Mintable.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract AnichessERC1155MerkleClaimMock is AnichessERC1155MerkleClaim {
    constructor(
        uint256 mintSupply,
        IERC1155Mintable rewardContract,
        IForwarderRegistry forwarderRegistry
    ) AnichessERC1155MerkleClaim(mintSupply, rewardContract, forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
