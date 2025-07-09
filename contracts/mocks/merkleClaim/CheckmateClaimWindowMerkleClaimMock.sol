// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CheckmateClaimWindowMerkleClaim} from "../../merkleClaim/CheckmateClaimWindowMerkleClaim.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract CheckmateClaimWindowMerkleClaimMock is CheckmateClaimWindowMerkleClaim {
    constructor(
        address checkmateToken_,
        address ethernals_,
        address ethernalsMetadataSetter_,
        address stakingPool_,
        address payoutWallet_,
        IForwarderRegistry forwarderRegistry_
    ) CheckmateClaimWindowMerkleClaim(checkmateToken_, ethernals_, ethernalsMetadataSetter_, stakingPool_, payoutWallet_, forwarderRegistry_) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
