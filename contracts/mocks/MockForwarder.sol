// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {MinimalForwarder} from "@openzeppelin/contracts/metatx/MinimalForwarder.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract MockForwarder is MinimalForwarder {
    constructor() MinimalForwarder() {}
}
