// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {AnichessOrbsBurnPool} from "../../burn/AnichessOrbsBurnPool.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IERC1155Burnable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Burnable.sol";

contract AnichessOrbsBurnPoolMock is AnichessOrbsBurnPool {
    constructor(
        uint256 initialTime,
        uint256 cycleDuration,
        uint256 maxCycle,
        IERC1155Burnable orbOfPower,
        TokenConfig[] memory tokenConfigs,
        bytes32 merkleRoot,
        IERC1155Burnable missingOrb,
        IForwarderRegistry forwarderRegistry
    ) AnichessOrbsBurnPool(initialTime, cycleDuration, maxCycle, orbOfPower, tokenConfigs, merkleRoot, missingOrb, forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
