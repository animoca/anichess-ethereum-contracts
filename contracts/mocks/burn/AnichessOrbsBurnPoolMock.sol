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
        uint256[] memory tokenIds,
        uint256[] memory _tokenWeights,
        bytes32 merkleRoot,
        IERC1155Burnable missingOrb,
        uint256 tokenMultiplier,
        IForwarderRegistry forwarderRegistry
    )
        AnichessOrbsBurnPool(
            initialTime,
            cycleDuration,
            maxCycle,
            orbOfPower,
            tokenIds,
            _tokenWeights,
            merkleRoot,
            missingOrb,
            tokenMultiplier,
            forwarderRegistry
        )
    {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
