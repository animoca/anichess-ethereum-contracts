// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20Receiver.sol";
import {ERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/ERC20Receiver.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {TokenRecovery, TokenRecoveryBase} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";
import {ArenaBase} from "./base/ArenaBase.sol";

/// @title ERC20Arena
/// @notice A contract to register players, complete matches, and distribute rewards in an arena game by using an ERC20 token.
/// @notice The winner of a match will receive a reward that is twice the entry fee, minus a commission.
/// @notice In case of a draw, both players will receive back half of the entry fee, minus a commission.
/// @notice The commission rate can be set by the contract owner.
contract ERC20Arena is ArenaBase, ERC20Receiver, TokenRecovery, PayoutWallet, ForwarderRegistryContext {
    using SafeERC20 for IERC20;
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;

    /// @notice The ERC20 token contract.
    IERC20 public immutable ERC20;

    /// @notice The entry fee for each game per account.
    uint256 public immutable ENTRY_FEE;

    /// @notice The commission rate, expressed as a fraction of 10000.
    uint256 public commissionRate;

    /// @notice The commission amount applied to each match.
    uint256 public commission;

    /// @notice The total reward to be distributed after deducting the commission.
    /// @notice If the match has a winner, the full reward goes to the winner.
    /// @notice If the match ends in a draw, the reward is split equally between both players.
    uint256 public reward;

    /// @notice The total amount of entry fees locked in the contract.
    uint256 public feeLocked;

    uint256 internal constant _COMMISSION_RATE_PRECISION = 10000;

    /// @notice Emitted when the commission rate is set.
    /// @param rate The new commission rate.
    event CommissionRateSet(uint256 rate);

    /// @notice Emitted when a payout is delivered.
    /// @param account The account that received the payout.
    /// @param matchId The match id.
    /// @param amount The amount of the payout.
    event PayoutDelivered(address indexed account, uint256 indexed matchId, uint256 amount);

    /// @notice Thrown when the entry fee is zero.
    error ZeroPrice();

    /// @notice Thrown when the commission rate is greater than or equal to the precision.
    /// @param rate The commission rate.
    error InvalidCommissionRate(uint256 rate);

    /// @notice Thrown when the payment token is not the expected ERC20 token.
    /// @param token The address of the payment token.
    error InvalidPaymentToken(address token);

    /// @notice Thrown when the entry fee is not equal to the payment amount.
    /// @param amount The payment amount.
    error InvalidPaymentAmount(uint256 amount);

    /// @notice Thrown when trying to recover more payment token than accidentally sent to this contract.
    /// @param recoverableAmount The amount that can be recovered.
    /// @param amount The amount that is trying to be recovered.
    error Unrecoverable(uint256 recoverableAmount, uint256 amount);

    /// @notice Constructor.
    /// @dev Reverts with {ZeroPrice} if the entry fee is zero.
    /// @dev Reverts with {InvalidCommissionRate} if the commission rate is greater than or equal to the precision.
    /// @dev Reverts with {InvalidCommissionRate} if the `commission` is not even.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param entryFee The entry fee for each game.
    /// @param commissionRate_ The initial commission rate.
    /// @param messageSigner The address of the message signer.
    /// @param payoutWallet The address of the payout wallet.
    /// @param erc20 The address of the ERC20 token contract.
    /// @param forwarderRegistry The address of the forwarder registry contract.
    constructor(
        uint256 entryFee,
        uint256 commissionRate_,
        address messageSigner,
        address payable payoutWallet,
        address erc20,
        IForwarderRegistry forwarderRegistry
    ) ArenaBase(messageSigner) PayoutWallet(payoutWallet) ForwarderRegistryContext(forwarderRegistry) {
        if (entryFee == 0) {
            revert ZeroPrice();
        }
        ENTRY_FEE = entryFee;
        _setCommissionRate(commissionRate_);

        ERC20 = IERC20(erc20);
    }

    /// @notice Sets the commission rate, commission and reward.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Reverts with {InvalidCommissionRate} if the commission rate is greater than or equal to the precision.
    /// @dev Reverts with {InvalidCommissionRate} if the `commission` is not even.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param newCommissionRate The new commission rate.
    function setCommissionRate(uint256 newCommissionRate) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        _setCommissionRate(newCommissionRate);
    }

    /// @inheritdoc IERC20Receiver
    /// @notice Receives the target ERC20 payment and admits the `from` account to the game.
    /// @dev Reverts with {InvalidPaymentToken} if the payment token is not the expected ERC20 token.
    /// @dev Reverts with {InvalidPaymentAmount} if the amount is not equal to the entry fee.
    /// @dev Reverts with {AlreadyAdmitted} if the `from` account is already admitted.
    /// @dev Emits an {Admission} event.
    /// @param from The account that sent the ERC20 payment.
    /// @param amount The amount of ERC20 tokens sent.
    /// @return The ERC20_RECEIVED selector.
    function onERC20Received(address, address from, uint256 amount, bytes calldata) external returns (bytes4) {
        address sender = _msgSender();
        if (sender != address(ERC20)) {
            revert InvalidPaymentToken(sender);
        }
        if (ENTRY_FEE != amount) {
            revert InvalidPaymentAmount(amount);
        }

        _admit(from);
        feeLocked += ENTRY_FEE;
        return this.onERC20Received.selector;
    }

    /// @notice Completes a match, sends commission to the payout wallet, and distributes rewards to the winner, or both players if it's a draw.
    /// @dev Reverts with {PlayerNotAdmitted} if either player is not admitted.
    /// @dev Reverts with {InvalidSignature} if the signature is invalid.
    /// @dev Emits a {MatchCompleted} event.
    /// @dev Emits a {PayoutDelivered} event for winner account, or two {PayoutDelivered} events for both players in case of a draw.
    /// @param matchId The match id.
    /// @param player1 The first player account.
    /// @param player2 The second player account.
    /// @param result The result of the match, either Player1Won, Player2Won or Draw.
    /// @param signature The signature of the match completion.
    function completeMatch(uint256 matchId, address player1, address player2, MatchResult result, bytes calldata signature) external {
        _completeMatch(matchId, player1, player2, result, signature);

        uint256 commission_ = commission;
        uint256 reward_ = reward;
        feeLocked -= ENTRY_FEE * 2;
        if (commission_ > 0) {
            ERC20.safeTransfer(PayoutWalletStorage.layout().payoutWallet(), commission_);
        }

        if (result == MatchResult.Draw) {
            uint256 refund = reward_ / 2;
            ERC20.safeTransfer(player1, refund);
            ERC20.safeTransfer(player2, refund);
            emit PayoutDelivered(player1, matchId, refund);
            emit PayoutDelivered(player2, matchId, refund);
        } else {
            address winner = result == MatchResult.Player1Won ? player1 : player2;
            ERC20.safeTransfer(winner, reward_);
            emit PayoutDelivered(winner, matchId, reward_);
        }
    }

    /// @inheritdoc TokenRecoveryBase
    /// @notice Token deposited to this contract through onERC20Received cannot be extracted via this function.
    /// @dev Reverts with {Unrecoverable} if the payment token amount to extract is greater than those accidentally sent to this contract.
    function recoverERC20s(address[] calldata accounts, IERC20[] calldata tokens, uint256[] calldata amounts) public virtual override {
        uint256 recoverableAmount = ERC20.balanceOf(address(this)) - feeLocked;
        uint256 amount;
        address paymentToken = address(ERC20);
        for (uint256 i = 0; i < tokens.length; i++) {
            if (address(tokens[i]) == paymentToken) {
                amount += amounts[i];
            }
        }
        if (amount > recoverableAmount) {
            revert Unrecoverable(recoverableAmount, amount);
        }
        super.recoverERC20s(accounts, tokens, amounts);
    }

    /// @notice Internal helper to set the commission rate, commission and reward.
    /// @dev Reverts with {InvalidCommissionRate} if the commission rate is greater than or equal to the precision.
    /// @dev Reverts with {InvalidCommissionRate} if the `commission` is not even.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param newCommissionRate The new commission rate.
    function _setCommissionRate(uint256 newCommissionRate) internal {
        uint256 reward_ = ENTRY_FEE * 2;
        uint256 commission_;

        if (newCommissionRate > 0) {
            uint256 precision = _COMMISSION_RATE_PRECISION;
            if (newCommissionRate >= precision) revert InvalidCommissionRate(newCommissionRate);
            commission_ = (reward_ * newCommissionRate) / precision;
            if (commission_ % 2 != 0) revert InvalidCommissionRate(newCommissionRate);
            reward_ = reward_ - commission_;
        }

        commissionRate = newCommissionRate;
        commission = commission_;
        reward = reward_;
        emit CommissionRateSet(newCommissionRate);
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
