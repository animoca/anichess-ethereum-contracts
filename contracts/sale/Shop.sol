// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@animoca/ethereum-contracts/contracts/access/AccessControl.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {Pause} from "@animoca/ethereum-contracts/contracts/lifecycle/Pause.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {PauseStorage} from "@animoca/ethereum-contracts/contracts/lifecycle/libraries/PauseStorage.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPointsV2} from "../points/interface/IPointsV2.sol";

/// @title Shop
/// @notice A shop contract for selling items in exchange for Points and/or ERC20 tokens
contract Shop is PayoutWallet, AccessControl, Pause {
    using SafeERC20 for IERC20;
    using AccessControlStorage for AccessControlStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;
    using PauseStorage for PauseStorage.Layout;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Item {
        uint256 pointsPrice;
        uint256 erc20Price;
        IERC20 erc20Token;
        uint256 maxPerUser; // 0 means unlimited
        uint256 sold;
        bool active;
    }

    IPointsV2 public immutable POINTS;

    mapping(bytes32 sku => Item) public items;
    mapping(address user => mapping(bytes32 sku => uint256 purchased)) public userPurchases;

    /// @notice Emitted when an item is added or updated
    event ItemAdded(bytes32 indexed sku, uint256 pointsPrice, uint256 erc20Price, IERC20 erc20Token, uint256 maxPerUser, bool active);

    /// @notice Emitted when an item is purchased
    event ItemPurchased(bytes32 indexed sku, address indexed buyer, uint256 quantity, address receiver);

    /// @notice Emitted when an item's active status is set
    event ItemActiveStatusSet(bytes32 indexed sku, bool active);

    /// @notice Thrown when an invalid ERC20 token is provided
    error InvalidERC20Token();

    /// @notice Thrown when an item already exists
    error ItemAlreadyExists(bytes32 sku);

    /// @notice Thrown when an item does not exist
    error ItemDoesNotExist(bytes32 sku);

    /// @notice Thrown when an item is not active
    error ItemNotActive(bytes32 sku);

    /// @notice Thrown when a user exceeds their purchase limit
    error PurchaseLimitExceeded(bytes32 sku, uint256 limit, uint256 current, uint256 requested);

    /// @notice Thrown when the quantity is zero
    error InvalidQuantity();

    /// @notice Thrown when both prices are zero
    error InvalidPrice();

    /// @notice Thrown when the SKU is invalid
    error InvalidSKU();

    /// @param payoutWallet The address that receives payments
    constructor(IPointsV2 points, address payable payoutWallet) PayoutWallet(payoutWallet) ContractOwnership(msg.sender) Pause(true) {
        POINTS = points;
    }

    /// @notice Add an item in the shop
    /// @param sku The unique identifier for the item
    /// @param pointsPrice The price per unit in Points
    /// @param erc20Price The price per unit in ERC20 tokens
    /// @param maxPerUser The maximum purchase per user (0 for unlimited)
    /// @param active Whether the item is active for sale
    function addItem(bytes32 sku, uint256 pointsPrice, uint256 erc20Price, IERC20 erc20Token, uint256 maxPerUser, bool active) external {
        AccessControlStorage.layout().enforceHasRole(OPERATOR_ROLE, msg.sender);

        require(sku != bytes32(0), InvalidSKU());

        require(pointsPrice != 0 || erc20Price != 0, InvalidPrice());
        if (erc20Price != 0) {
            require(erc20Token != IERC20(address(0)), InvalidERC20Token());
        }

        Item storage item = items[sku];
        require(!_itemExists(sku), ItemAlreadyExists(sku));

        item.pointsPrice = pointsPrice;
        item.erc20Price = erc20Price;
        item.erc20Token = erc20Token;
        item.maxPerUser = maxPerUser;
        item.sold = 0;
        item.active = active;

        emit ItemAdded(sku, pointsPrice, erc20Price, item.erc20Token, maxPerUser, active);
    }

    function setItemActiveStatus(bytes32 sku, bool active) external {
        AccessControlStorage.layout().enforceHasRole(OPERATOR_ROLE, msg.sender);

        require(_itemExists(sku), ItemDoesNotExist(sku));

        items[sku].active = active;

        emit ItemActiveStatusSet(sku, active);
    }

    /// @notice Purchase an item from the shop
    /// @dev Reverts if `quantity` is zero
    /// @dev Reverts if the contract is paused
    /// @dev Reverts if the item is not active
    /// @dev Reverts if the user exceeds their purchase limit
    /// @param sku The unique identifier for the item
    /// @param quantity The quantity to purchase
    /// @param receiver The address receiving the purchased items
    function purchase(bytes32 sku, uint256 quantity, address receiver) external {
        require(quantity != 0, InvalidQuantity());
        PauseStorage.layout().enforceIsNotPaused();

        require(_itemExists(sku), ItemDoesNotExist(sku));

        Item storage item = items[sku];
        if (!item.active) revert ItemNotActive(sku);

        uint256 currentUserPurchases = userPurchases[msg.sender][sku];
        uint256 newUserPurchases = currentUserPurchases + quantity;

        if (item.maxPerUser != 0) {
            if (newUserPurchases > item.maxPerUser) {
                revert PurchaseLimitExceeded(sku, item.maxPerUser, currentUserPurchases, quantity);
            }
        }
        userPurchases[msg.sender][sku] = newUserPurchases;
        item.sold += quantity;

        uint256 pointsPrice = item.pointsPrice * quantity;
        if (pointsPrice != 0) {
            POINTS.spendFrom(msg.sender, pointsPrice);
        }

        uint256 erc20Price = item.erc20Price * quantity;
        if (erc20Price != 0) {
            item.erc20Token.safeTransferFrom(msg.sender, PayoutWalletStorage.layout().payoutWallet(), erc20Price);
        }

        emit ItemPurchased(sku, msg.sender, quantity, receiver);
    }

    /// @notice Get user's remaining purchase allowance for an item
    /// @dev Reverts if the item does not exist.
    /// @param user The user address
    /// @param sku The unique identifier for the item
    /// @return remaining The remaining purchase allowance (type(uint256).max if unlimited)
    function getUserRemainingAllowance(address user, bytes32 sku) external view returns (uint256 remaining) {
        require(_itemExists(sku), ItemDoesNotExist(sku));

        Item storage item = items[sku];
        if (item.maxPerUser == 0) {
            return type(uint256).max;
        }
        return item.maxPerUser - userPurchases[user][sku];
    }

    function _itemExists(bytes32 sku) internal view returns (bool) {
        Item storage item = items[sku];
        return item.pointsPrice != 0 || item.erc20Price != 0;
    }
}
