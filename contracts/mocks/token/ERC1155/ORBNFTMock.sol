// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IOperatorFilterRegistry} from "@animoca/ethereum-contracts-1.1.1/contracts/token/royalty/interfaces/IOperatorFilterRegistry.sol";
import {ORBNFT} from "../../../token/ERC1155/ORBNFT.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract ORBNFTMock is ORBNFT {
    /// @notice Contract constructor.
    /// @param filterRegistry The address of the operator filter registry.
    /// @param tokenName The name of the token.
    /// @param tokenSymbol The symbol of the token.
    constructor(
        IOperatorFilterRegistry filterRegistry,
        string memory tokenName,
        string memory tokenSymbol
    ) ORBNFT(filterRegistry, tokenName, tokenSymbol) {}

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
