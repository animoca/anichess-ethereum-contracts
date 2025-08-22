// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PointsV2} from "../../points/PointsV2.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract PointsV2Mock is PointsV2 {
    constructor(IForwarderRegistry forwarderRegistry_) PointsV2(forwarderRegistry_) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
