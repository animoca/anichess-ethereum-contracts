// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721ClaimWindowMerkleClaim} from "../../pfp/ERC721ClaimWindowMerkleClaim.sol";
import {ERC721Full} from "@animoca/ethereum-contracts/contracts/token/ERC721/preset/ERC721Full.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC721ClaimWindowMerkleClaimMock is ERC721ClaimWindowMerkleClaim {
    constructor(
        uint256 mintSupply,
        ERC721Full rewardContract,
        IForwarderRegistry _forwarderRegistry
    ) ERC721ClaimWindowMerkleClaim(mintSupply, rewardContract, _forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
