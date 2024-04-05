// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IOperatorFilterRegistry} from "@animoca/ethereum-contracts-1.1.1/contracts/token/royalty/interfaces/IOperatorFilterRegistry.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts-1.1.1/contracts/access/ContractOwnership.sol";
import {ERC1155Mintable} from "@animoca/ethereum-contracts-1.1.1/contracts/token/ERC1155/ERC1155Mintable.sol";
import {ERC1155Burnable} from "@animoca/ethereum-contracts-1.1.1/contracts/token/ERC1155/ERC1155Burnable.sol";
import {ERC1155MetadataURIWithBaseURI} from "@animoca/ethereum-contracts-1.1.1/contracts/token/ERC1155/ERC1155MetadataURIWithBaseURI.sol";
import {ERC2981} from "@animoca/ethereum-contracts-1.1.1/contracts/token/royalty/ERC2981.sol";
import {ERC1155WithOperatorFilterer} from "@animoca/ethereum-contracts-1.1.1/contracts/token/ERC1155/ERC1155WithOperatorFilterer.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts-1.1.1/contracts/security/TokenRecovery.sol";

/// @title ORBNFT Contract
/// @notice Contract that extends ERC1155 standard with minting, burning, metadata, and royalty support.
contract ORBNFT is ERC1155Mintable, ERC1155Burnable, ERC1155MetadataURIWithBaseURI, ERC2981, ERC1155WithOperatorFilterer, TokenRecovery {
    /// @notice The name of the token.
    string public name;
    /// @notice The symbol of the token.
    string public symbol;

    /// @notice Contract constructor.
    /// @param filterRegistry The address of the operator filter registry.
    /// @param name_ The name of the token.
    /// @param symbol_ The symbol of the token.
    constructor(
        IOperatorFilterRegistry filterRegistry,
        string memory name_,
        string memory symbol_
    ) ContractOwnership(msg.sender) ERC1155WithOperatorFilterer(filterRegistry) ERC1155MetadataURIWithBaseURI() ERC1155Mintable() ERC1155Burnable() {
        name = name_;
        symbol = symbol_;
    }
}
