// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {PointsMerkleClaim} from "../../merkleClaim/PointsMerkleClaim.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract PointsMerkleClaimMock is PointsMerkleClaim {
    constructor(address pointsContractAddress, IForwarderRegistry forwarderRegistry_) PointsMerkleClaim(pointsContractAddress, forwarderRegistry_) {}

    /// @notice Internal function to access the current msg.sender.
    /// @return The current msg.sender value.
    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
