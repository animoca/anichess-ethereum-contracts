// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {TokenEscrow} from "../../escrow/TokenEscrow.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ContextMock} from "../utils/ContextMock.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract TokenEscrowMock is TokenEscrow, ContextMock {
    /// @notice Creates a new escrow contract
    /// @dev Throws if the _inventory address is a zero address.
    /// @dev ContractOwnership is required to initiate TokenRecovery
    /// @param forwarderRegistry The forwarder registry contract information
    /// @param inventory_ The inventory contract address
    constructor(IForwarderRegistry forwarderRegistry, address inventory_) TokenEscrow(forwarderRegistry, inventory_) {}

    function _msgSender() internal view override(Context, TokenEscrow) returns (address) {
        return TokenEscrow._msgSender();
    }

    function _msgData() internal view override(Context, TokenEscrow) returns (bytes calldata) {
        return TokenEscrow._msgData();
    }
}
