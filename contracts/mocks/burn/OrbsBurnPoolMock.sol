// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {OrbsBurnPool} from "../../burn/OrbsBurnPool.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IERC1155Burnable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Burnable.sol";

contract OrbsBurnPoolMock is OrbsBurnPool {
    constructor(
        uint256 initialTime,
        uint256 cycleDuration,
        uint256 maxCycle,
        bytes32 merkleRoot,
        IERC1155Burnable orbOfPower,
        IERC1155Burnable missingOrb,
        IForwarderRegistry forwarderRegistry
    ) OrbsBurnPool(initialTime, cycleDuration, maxCycle, merkleRoot, orbOfPower, missingOrb, forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
