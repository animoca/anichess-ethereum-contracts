// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistry.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract MockForwarderRegistry is ForwarderRegistry {
    constructor() ForwarderRegistry() {}
}
