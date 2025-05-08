// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoints} from "../../points/interface/IPoints.sol";

contract PointsSpenderMock is IPoints {
    mapping(address holder => uint256 balance) public balances;

    /// @notice Emitted when an amount is deposited to a balance.
    /// @param sender The sender of the deposit.
    /// @param reasonCode The reason code of the deposit.
    /// @param holder The holder of the balance deposited to.
    /// @param amount The amount deposited.
    event Deposited(address indexed sender, bytes32 indexed reasonCode, address indexed holder, uint256 amount);

    /// @notice Emitted when an amount is consumed from a balance.
    /// @param holder The holder address of the balance consumed from.
    /// @param reasonCode The reason code of the consumption.
    /// @param operator The sender of the consumption.
    /// @param amount The amount consumed.
    event Consumed(address indexed operator, bytes32 indexed reasonCode, address indexed holder, uint256 amount);

    /// @notice Thrown when the holder does not have enough balance
    /// @param holder The given holder address.
    /// @param requiredBalance The required balance.
    error InsufficientBalance(address holder, uint256 requiredBalance);

    /// @notice Called by a depositor to increase the balance of a holder.
    /// @dev Emits a {Deposited} event if amount has been successfully added to the holder's balance
    /// @param holder The holder of the balance to deposit to.
    /// @param amount The amount to deposit.
    /// @param depositReasonCode The reason code of the deposit.
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external {
        balances[holder] += amount;
        emit Deposited(msg.sender, depositReasonCode, holder, amount);
    }

    /// @notice Called by other public functions to consume a given amount from the balance of the specified holder.
    /// @dev Reverts if balance is insufficient.
    /// @dev Emits a {Consumed} event if the consumption is successful.
    /// @param operator The operator address.
    /// @param holder The balance holder address to deposit to.
    /// @param amount The amount to consume.
    /// @param consumeReasonCode The reason code of the consumption.
    function _consume(address operator, address holder, uint256 amount, bytes32 consumeReasonCode) internal {
        uint256 balance = balances[holder];
        if (balance < amount) {
            revert InsufficientBalance(holder, amount);
        }

        balances[holder] = balance - amount;

        emit Consumed(operator, consumeReasonCode, holder, amount);
    }

    /// @notice Called by the spender to consume a given amount from a holder's balance.
    /// @dev Reverts if sender does not have Spender role.
    /// @dev Reverts if holder does not have enough balance
    /// @dev Reverts if the consumeReasonCode value is false in the mapping.
    /// @dev Emits a {Consumed} event if the consumption is successful.
    /// @param holder The holder to consume from.
    /// @param amount The amount to consume.
    /// @param consumeReasonCode The reason code of the consumption.
    function consume(address holder, uint256 amount, bytes32 consumeReasonCode) external {
        _consume(msg.sender, holder, amount, consumeReasonCode);
    }
}
