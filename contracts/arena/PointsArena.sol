// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {ArenaBase} from "./base/ArenaBase.sol";
import {Points} from "../points/Points.sol";

/// @title PointsArena
/// @notice A contract to register game sessions and distribute rewards for arena-style game modes with M8Points payments.
/// @notice The winner of a match will receive a reward that is twice the entry fee, minus a commission.
/// @notice The commission rate can be set by the contract owner.
contract PointsArena is ArenaBase, PayoutWallet, ForwarderRegistryContext {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;

    /// @notice The reason code for consuming the entry fee.
    bytes32 public immutable CONSUME_REASON_CODE;

    /// @notice The reason code for the reward deposit.
    bytes32 public immutable REWARD_REASON_CODE;

    /// @notice The reason code for the refund deposit, when a match ends in a draw.
    bytes32 public immutable REFUND_REASON_CODE;

    /// @notice The reason code for the commission deposit.
    bytes32 public immutable COMMISSION_REASON_CODE;

    /// @notice The M8Points contract.
    Points public immutable POINTS;

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

    /// @notice Constructor.
    /// @dev Reverts with {ZeroPrice} if the entry fee is zero.
    /// @dev Emits a {CommissionRateSet} event.
    /// @param entryFee The entry fee for each session.
    /// @param commissionRate_ The initial commission rate.
    /// @param messageSigner The address of the message signer.
    /// @param payoutWallet The address of the payout wallet.
    /// @param points The address of the M8Points contract.
    /// @param consumeReasonCode The reason code for consuming the entry fee.
    /// @param rewardReasonCode The reason code for the reward deposit.
    /// @param refundReasonCode The reason code for the refund deposit, when a match ends in a draw.
    /// @param commissionReasonCode The reason code for the commission deposit.
    /// @param forwarderRegistry The address of the forwarder registry contract.
    constructor(
        uint256 entryFee,
        uint256 commissionRate_,
        address messageSigner,
        address payable payoutWallet,
        address points,
        bytes32 consumeReasonCode,
        bytes32 rewardReasonCode,
        bytes32 refundReasonCode,
        bytes32 commissionReasonCode,
        IForwarderRegistry forwarderRegistry
    ) ArenaBase(messageSigner) PayoutWallet(payoutWallet) ForwarderRegistryContext(forwarderRegistry) {
        if (entryFee == 0) {
            revert ZeroPrice();
        }
        ENTRY_FEE = entryFee;
        _setCommissionRate(commissionRate_);

        POINTS = Points(points);

        CONSUME_REASON_CODE = consumeReasonCode;
        REWARD_REASON_CODE = rewardReasonCode;
        REFUND_REASON_CODE = refundReasonCode;
        COMMISSION_REASON_CODE = commissionReasonCode;
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

    /// @notice Admits an account to a game session and consumes the entry fee.
    /// @dev Reverts with {AlreadyAdmitted} if the account is already admitted to the session.
    /// @dev Emits an {Admission} event.
    /// @param sessionId The session id.
    function admit(uint256 sessionId) external {
        address account = _msgSender();
        _admit(sessionId, account);
        POINTS.consume(account, ENTRY_FEE, CONSUME_REASON_CODE);
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
            POINTS.deposit(PayoutWalletStorage.layout().payoutWallet(), commission_, COMMISSION_REASON_CODE);
        }

        if (result == MatchResult.Draw) {
            uint256 refund = reward_ / 2;
            if (refund > 0) {
                POINTS.deposit(player1, refund, REFUND_REASON_CODE);
                POINTS.deposit(player2, refund, REFUND_REASON_CODE);
            }
            emit PayoutDelivered(player1, matchId, refund);
            emit PayoutDelivered(player2, matchId, refund);
        } else {
            address winner = result == MatchResult.Player1Won ? player1 : player2;
            if (reward_ > 0) {
                POINTS.deposit(winner, reward_, REWARD_REASON_CODE);
            }
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
