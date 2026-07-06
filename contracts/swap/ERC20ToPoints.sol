// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IPointsV2} from "../points/interface/IPointsV2.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC20ToPoints is ForwarderRegistryContext, PayoutWallet {
    using SafeERC20 for IERC20;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;

    IERC20 public immutable TOKEN;
    IPointsV2 public immutable POINTS;
    uint256 public immutable TOKEN_TO_POINTS_RATE;
    uint256 public immutable POINTS_MULTIPLIER;
    bytes32 public immutable DEPOSIT_REASON;

    event Exchanged(address indexed user, uint256 tokenAmount, uint256 pointsAmount);

    error InvalidPointsAmount();

    constructor(
        IERC20 token,
        IPointsV2 points,
        uint256 tokenToPointsRate,
        string memory depositReason,
        address payable payoutAddress,
        IForwarderRegistry forwarderRegistry
    ) ContractOwnership(msg.sender) PayoutWallet(payoutAddress) ForwarderRegistryContext(forwarderRegistry) {
        TOKEN = token;
        POINTS = points;
        TOKEN_TO_POINTS_RATE = tokenToPointsRate;
        POINTS_MULTIPLIER = 10 ** IERC20Metadata(address(token)).decimals() / TOKEN_TO_POINTS_RATE;
        DEPOSIT_REASON = keccak256(bytes(depositReason));
    }

    /// @notice Exchanges tokens for Points.
    /// @dev Reverts with {InvalidPointsAmount} if pointsAmount is zero.
    /// @param pointsAmount the amount of Points to receive.
    function exchange(uint256 pointsAmount) external {
        require(pointsAmount != 0, InvalidPointsAmount());

        uint256 tokenAmount = pointsAmount * POINTS_MULTIPLIER;

        address sender = _msgSender();

        TOKEN.safeTransferFrom(sender, PayoutWalletStorage.layout().payoutWallet(), tokenAmount);
        POINTS.deposit(sender, pointsAmount, DEPOSIT_REASON);

        emit Exchanged(sender, tokenAmount, pointsAmount);
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
