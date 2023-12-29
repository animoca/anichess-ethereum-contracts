// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/ERC1155TokenReceiver.sol";
import {IERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155TokenReceiver.sol";
import {IERC1155} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";

/// @title TokenEscrow contract
/// @notice Contract that allows users to escrow tokens for use in the Anichess Game.
contract TokenEscrow is ForwarderRegistryContext, TokenRecovery, ERC1155TokenReceiver {
    /// @notice Emitted when tokens are deposited
    event DepositTokens(address indexed user, uint256[] ids);

    /// @notice Emitted when tokens are withdrawn
    event WithdrawTokens(address indexed user, uint256[] ids);

    // Custom errors
    error InvalidInventory();
    error UnsupportedMethod();
    error InsufficientBalance(uint256 tokenId, uint256 balance);
    error BalanceExceeded(uint256 tokenId, uint256 balance);
    error InconsistentArrays();

    /// @notice An Orb contract reference
    IERC1155 public immutable TOKEN_INVENTORY;

    /// @notice Mapping from owner address to a mapping from token ID to escrowed token count.
    mapping(address => mapping(uint256 => uint256)) public escrowedNFTs;

    /// @notice Creates a new escrow contract
    /// @dev Throws if the _inventory address is a zero address.
    /// @dev ContractOwnership is required to initiate TokenRecovery
    /// @param forwarderRegistry The forwarder registry contract information
    /// @param inventory The inventory contract address
    constructor(IForwarderRegistry forwarderRegistry, IERC1155 inventory) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(msg.sender) {
        if (address(inventory) == address(0)) {
            revert InvalidInventory();
        }
        TOKEN_INVENTORY = inventory;
    }

    /// @notice Returns the escrowed token balance of a given token held by a given address
    /// @param account The address of the token holder
    /// @param id The ID of the token
    /// @return balance The amount of token escrowed held by the token holder correponding to the token ID
    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return escrowedNFTs[account][id];
    }

    /// @notice Handles the deposit of tokens.
    /// @dev Batch transfer tokens from the sender to this contract
    /// @param ids An array containing ids of each token being transferred (corresponds to orbTypes)
    /// @param values An array containing amounts of each token being transferred (corresponds to quantities)
    function deposit(uint256[] calldata ids, uint256[] calldata values) external {
        TOKEN_INVENTORY.safeBatchTransferFrom(_msgSender(), address(this), ids, values, "");
    }

    /// @notice Handles token withdrawal
    /// @dev Reverts if the array length of ids & values does not match.
    /// @dev Reverts if the sender does not have enough balance.
    /// @dev Updates the escrowedTokens mapping.
    /// @dev Emits {WithdrawTokens} events.
    /// @dev Transfers the token from this contract to the sender's address
    /// @param ids An array containing ids of each token being transferred (corresponds to orbTypes)
    /// @param values An array containing amounts of each token being transferred (corresponds to quantities)
    function withdraw(uint256[] calldata ids, uint256[] calldata values) external {
        if (ids.length != values.length) {
            revert InconsistentArrays();
        }
        address sender = _msgSender();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 value = values[i];
            uint256 senderBalance = escrowedNFTs[sender][id];
            if (senderBalance < value) {
                revert InsufficientBalance(id, senderBalance);
            }
            escrowedNFTs[sender][id] -= value;
        }

        emit WithdrawTokens(sender, ids);

        TOKEN_INVENTORY.safeBatchTransferFrom(address(this), sender, ids, values, "");
    }

    /// @notice Handles the receipt of a single type of token.
    /// @dev Reverts if this method has been triggered.
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert UnsupportedMethod();
    }

    /// @notice Handles the receipt of multiple types of tokens.
    /// @dev Reverts if the sender is not in the inventory.
    /// @dev Updates the escrowedTokens mapping.
    /// @dev Reverts if the updated token balance is greater than 1
    /// @dev Emits a {DepositTokens} event.
    /// @param from The address which previously owned the token
    /// @param ids An array containing ids of each token being transferred (corresponds to orbTypes)
    /// @param values An array containing amounts of each token being transferred (corresponds to quantities)
    /// @return selector The function selector
    function onERC1155BatchReceived(
        address,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata
    ) external returns (bytes4) {
        if (msg.sender != address(TOKEN_INVENTORY)) {
            revert InvalidInventory();
        }
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 newBalance = escrowedNFTs[from][id] + values[i];
            if (newBalance > 1) {
                revert BalanceExceeded(id, newBalance);
            }
            escrowedNFTs[from][id] = newBalance;
        }
        emit DepositTokens(from, ids);
        return IERC1155TokenReceiver.onERC1155BatchReceived.selector;
    }

    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
