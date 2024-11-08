// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ERC721ClaimWindowMerkleClaim} from "../../profilePic/ERC721ClaimWindowMerkleClaim.sol";
import {ERC721FullBurn} from "@animoca/ethereum-contracts/contracts/token/ERC721/preset/ERC721FullBurn.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC721ClaimWindowMerkleClaimMock is ERC721ClaimWindowMerkleClaim {
    constructor(
        uint256 tokenId,
        uint256 mintSupply,
        ERC721FullBurn rewardContract,
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
