// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20Receiver.sol";
import {ERC20Storage} from "@animoca/ethereum-contracts/contracts/token/ERC20/libraries/ERC20Storage.sol";
import {ERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/ERC20Receiver.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {ArenaBase} from "./base/ArenaBase.sol";

/// @title ERC20Arena
/// @notice A contract to register game sessions and distribute rewards for arena-style game modes with ERC20 payments.
/// @notice The winner of a match will receive a reward that is twice the entry fee, minus a commission.
/// @notice The commission rate can be set by the contract owner.
contract ERC20Arena is ArenaBase, ERC20Receiver, PayoutWallet, ForwarderRegistryContext {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;

    /// @notice The ERC20 token contract.
    IERC20 public immutable ERC20;

    /// @notice The entry fee for each session.
    uint256 public immutable ENTRY_FEE;

    /// @notice The commission rate, expressed as a fraction of 10000.
    uint256 public commissionRate;

    /// @notice The commission amount.
    uint256 public commission;

    /// @notice The reward amount.
    uint256 public reward;

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

    /// @notice Thrown when the entry fee is not equal to the payment amount.
    /// @param amount The payment amount.
    error InvalidPaymentAmount(uint256 amount);

    /// @notice Constructor.
    /// @dev Reverts with {ZeroPrice} if the entry fee is zero.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param entryFee The entry fee for each session.
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

    /// @notice Sets the commission rate commission rate and update related values.
    /// @dev Calculates and sets the `commission` and `reward` based on the new commission rate.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param newCommissionRate The new commission rate.
    function setCommissionRate(uint256 newCommissionRate) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        _setCommissionRate(newCommissionRate);
    }

    /// @inheritdoc IERC20Receiver
    /// @notice Receives the target ERC20 payment and admits the `from` account to the session.
    /// @dev Reverts with {InvalidPaymentAmount} if the amount is not equal to the entry fee.
    /// @dev Reverts with {AlreadyAdmitted} if the session id is already admitted.
    /// @dev Emits an {Admission} event.
    /// @param from The account that sent the ERC20 payment.
    /// @param amount The amount of ERC20 tokens sent.
    /// @param data The encoded session id in uint256.
    /// @return The ERC20_RECEIVED selector.
    function onERC20Received(address, address from, uint256 amount, bytes calldata data) external returns (bytes4) {
        if (ENTRY_FEE != amount) {
            revert InvalidPaymentAmount(amount);
        }

        uint256 sessionId = abi.decode(data, (uint256));
        _admit(sessionId, from);
        return ERC20Storage.ERC20_RECEIVED;
    }

    /// @notice Completes a match, delivers the rewards to the winner, and the commission to the payout wallet.
    /// @dev Reverts with {SessionIdNotExists} if the winner or opponent session id is not found in the sessions mapping.
    /// @dev Reverts with {InvalidSignature} if the signature is invalid.
    /// @dev Emits a {MatchCompleted} event.
    /// @dev Emits a {PayoutDelivered} event.
    /// @param matchId The match id.
    /// @param player1SessionId The session id of the winner, or the session id of the player in case of a draw.
    /// @param player2SessionId The session id of the opponent.
    /// @param result The result of the match, either Draw, Player1Won or Player2Won.
    /// @param signature The signature of the match completion.
    function completeMatch(
        uint256 matchId,
        uint256 player1SessionId,
        uint256 player2SessionId,
        MatchResult result,
        bytes calldata signature
    ) external {
        (address player1, address player2) = _completeMatch(matchId, player1SessionId, player2SessionId, result, signature);

        uint256 commission_ = commission;
        uint256 reward_ = reward;
        if (commission_ > 0) {
            ERC20.transfer(PayoutWalletStorage.layout().payoutWallet(), commission_);
        }

        if (result == MatchResult.Draw) {
            uint256 refund = reward_ / 2;
            ERC20.transfer(player1, refund);
            ERC20.transfer(player2, refund);
            emit PayoutDelivered(player1, matchId, refund);
            emit PayoutDelivered(player2, matchId, refund);
        } else {
            address winner = result == MatchResult.Player1Won ? player1 : player2;
            ERC20.transfer(winner, reward_);
            emit PayoutDelivered(winner, matchId, reward_);
        }
    }

    /// @notice Internal helper to set the commission rate commission rate and update related values.
    /// @dev Calculates and sets the `commission` and `reward` based on the new commission rate.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param newCommissionRate The new commission rate.
    function _setCommissionRate(uint256 newCommissionRate) internal {
        uint256 reward_ = ENTRY_FEE * 2;
        uint256 commission_;

        if (newCommissionRate > 0) {
            commission_ = (reward_ * newCommissionRate) / _COMMISSION_RATE_PRECISION;
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
