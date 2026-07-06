// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IPointsV2 {
    /// @notice Emitted when an amount is deposited to a balance.
    /// @param depositor The depositor.
    /// @param reasonCode The reason code of the deposit.
    /// @param holder The holder of the balance deposited to.
    /// @param amount The amount deposited.
    event Deposited(address indexed depositor, bytes32 indexed reasonCode, address indexed holder, uint256 amount);

    /// @notice Emitted when an approval is made.
    /// @param holder The holder of the balance.
    /// @param spender The spender allowed to spend the balance.
    /// @param amount The amount approved.
    event Approval(address indexed holder, address indexed spender, uint256 amount);

    /// @notice Emitted when an amount is spent from a balance.
    /// @param spender The spender of the balance.
    /// @param holder The holder of the balance spent from.
    /// @param amount The amount spent.
    event Spent(address indexed spender, address indexed holder, uint256 amount);

    /// @notice Deposits an amount to a holder's balance for a given reason code.
    /// @dev Emits a {Deposited} event.
    /// @param holder The holder of the balance to deposit to.
    /// @param amount The amount to deposit.
    /// @param depositReasonCode The reason code for the deposit.
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external;

    /// @notice Approves a spender to spend an amount from the caller's balance.
    /// @dev Emits an {Approval} event.
    /// @param spender The spender allowed to spend the balance.
    /// @param amount The amount approved.
    function approve(address spender, uint256 amount) external;

    /// @notice Approves a spender to spend an amount from a holder's balance using a signature.
    /// @dev Emits an {Approval} event.
    /// @param holder The holder of the balance.
    /// @param spender The spender allowed to spend the balance.
    /// @param amount The amount approved.
    /// @param deadline The deadline timestamp by which the signature must be submitted.
    /// @param signature The signature of the approval.
    function approveWithSignature(address holder, address spender, uint256 amount, uint256 deadline, bytes calldata signature) external;

    /// @notice Spends an amount from a holder's balance.
    /// @dev Emits an {Approval} event if the caller is not the holder.
    /// @dev Emits a {Spent} event.
    /// @param holder The holder of the balance to spend from.
    /// @param amount The amount to spend.
    function spendFrom(address holder, uint256 amount) external;

    /// @notice Spends an amount and calls a target contract with data.
    /// @dev Emits a {Spent} event.
    /// @param amount The amount to spend.
    /// @param target The target contract to call.
    /// @param data The data to call the target contract with.
    function spendAndCall(uint256 amount, address target, bytes calldata data) external;
}
