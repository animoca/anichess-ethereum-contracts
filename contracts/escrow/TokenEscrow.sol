// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/ERC1155TokenReceiver.sol";
import {IERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155TokenReceiver.sol";
import {IERC1155} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";

/// @title TokenEscrow contract
/// @notice Contract that allows users to escrow tokens for use in the Anichess Game.
contract TokenEscrow is ForwarderRegistryContext, ContractOwnership, TokenRecovery, ERC1155TokenReceiver {
    /// @notice Emitted when tokens are deposited
    event DepositToken(address indexed user, uint256 indexed id);

    /// @notice Emitted when tokens are withdrawn
    event WithdrawToken(address indexed user, uint256 indexed id);

    // Custom errors
    error InvalidInventory();
    error InvalidInputParams();
    error InsufficientBalance();
    error InvalidAmount(uint256 tokenId, uint256 amount);

    bytes4 private constant EIP1271_MAGICVALUE = 0x1626ba7e;

    /// @notice An Orb contract reference
    IERC1155 public immutable TOKEN_INVENTORY;

    /// @notice Mapping from owner address to a mapping from token ID to escrowed token count.
    mapping(address => mapping(uint256 => uint256)) public escrowedNFTs;

    /// @notice Creates a new escrow contract
    /// @dev Throws if the _inventory address is a zero address.
    /// @dev ContractOwnership is required to initiate TokenRecovery
    /// @param forwarderRegistry The forwarder registry contract information
    /// @param inventory_ The inventory contract address
    constructor(
        IForwarderRegistry forwarderRegistry,
        address inventory_
    ) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(_msgSender()) {
        if (inventory_ == address(0)) {
            revert InvalidInventory();
        }
        TOKEN_INVENTORY = IERC1155(inventory_);
    }

    /// @notice Handles the deposit of tokens.
    /// @dev Batch transfer token from the operator to this contract
    /// @param ids An array containing ids of each token being transferred (corresponds to orbTypes)
    /// @param values An array containing amounts of each token being transferred (corresponds to quantities)
    function deposit(uint256[] calldata ids, uint256[] calldata values) external {
        TOKEN_INVENTORY.safeBatchTransferFrom(_msgSender(), address(this), ids, values, "");
    }

    /// @notice Handles token withdrawal
    /// @dev Reverts if the array length of ids & values does not match.
    /// @dev Reverts if the sender does not have enough balance.
    /// @dev Emits a {WithdrawToken} event.
    /// @dev Transfers the token from this contract to the sender's address
    /// @param ids An array containing ids of each token being transferred (corresponds to orbTypes)
    /// @param values An array containing amounts of each token being transferred (corresponds to quantities)
    function withdraw(uint256[] calldata ids, uint256[] calldata values) external {
        if (ids.length != values.length) {
            revert InvalidInputParams();
        }
        address operator = _msgSender();
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (escrowedNFTs[operator][id] < value) {
                revert InsufficientBalance();
            }
            escrowedNFTs[operator][id] -= value;
            emit WithdrawToken(operator, id);
        }
        TOKEN_INVENTORY.safeBatchTransferFrom(address(this), operator, ids, values, "");
    }

    /// @notice Handles the receipt of a single type of token.
    /// @dev Reverts if the sender is not the inventory.
    /// @dev Reverts if the value is > 1
    /// @dev Updates the escrowedNFTs mapping.
    /// @dev Emits a {DepositToken} event.
    /// @param from The address which previously owned the token
    /// @param id The ID of the token being transferred (corresponds to orbType)
    /// @param value The quantity of the token being transferred
    /// @return selector The function selector
    function onERC1155Received(address, address from, uint256 id, uint256 value, bytes calldata) external returns (bytes4) {
        if (_msgSender() != address(TOKEN_INVENTORY)) {
            revert InvalidInventory();
        }

        escrowedNFTs[from][id] += value;
        if (escrowedNFTs[from][id] > 1) {
            revert InvalidAmount(id, escrowedNFTs[from][id]);
        }

        emit DepositToken(from, id);
        return IERC1155TokenReceiver.onERC1155Received.selector;
    }

    /// @notice Handles the receipt of multiple types of tokens.
    /// @dev Reverts if the sender is not in the inventory.
    /// @dev Reverts if the updated is > 1
    /// @dev Updates the escrowedNFTs mapping.
    /// @dev Emits a {DepositToken} event for each token.
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
        if (_msgSender() != address(TOKEN_INVENTORY)) {
            revert InvalidInventory();
        }
        for (uint256 i = 0; i < ids.length; i++) {
            escrowedNFTs[from][ids[i]] += values[i];
            if (escrowedNFTs[from][ids[i]] > 1) {
                revert InvalidAmount(ids[i], escrowedNFTs[from][ids[i]]);
            }
            emit DepositToken(from, ids[i]);
        }
        return IERC1155TokenReceiver.onERC1155BatchReceived.selector;
    }

    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
