// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoints} from "../../points/interface/IPoints.sol";

contract PointsMock is IPoints {
    /// @notice Emitted when an amount is deposited to a balance.
    /// @param sender The sender of the deposit.
    /// @param reasonCode The reason code of the deposit.
    /// @param holder The holder of the balance deposited to.
    /// @param amount The amount deposited.
    event Deposited(address indexed sender, bytes32 indexed reasonCode, address indexed holder, uint256 amount);

    /// @notice Called by a depositor to increase the balance of a holder.
    /// @param holder The holder of the balance to deposit to.
    /// @param amount The amount to deposit.
    /// @param depositReasonCode The reason code of the deposit.
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external {
        emit Deposited(msg.sender, depositReasonCode, holder, amount);
    }
}
