// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {TokenEscrow} from "../../escrow/TokenEscrow.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts-4.9.5/utils/Context.sol";
import {IERC1155} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract TokenEscrowMock is TokenEscrow {
    event Data(bytes data);

    /// @notice Creates a new escrow contract
    /// @dev Throws if the _inventory address is a zero address.
    /// @dev ContractOwnership is required to initiate TokenRecovery
    /// @param forwarderRegistry The forwarder registry contract information
    /// @param inventory_ The inventory contract address
    constructor(IForwarderRegistry forwarderRegistry, IERC1155 inventory_) TokenEscrow(forwarderRegistry, inventory_) {}

    function msgData() public {
        emit Data(_msgData());
    }
}
