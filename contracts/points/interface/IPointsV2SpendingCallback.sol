// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IPointsV2SpendingCallback {
    /// @notice Handles the callback after points have been spent.
    /// @dev This function is called by the PointsV2 contract after points have been spent.
    /// @param spender The address which initiated the spend.
    /// @param amount The amount of points spent.
    /// @param data Additional data with no specified format.
    /// @return A bytes4 value to confirm the callback was successful. Must return `this.onPointsSpent.selector`.
    function onPointsSpent(address spender, uint256 amount, bytes calldata data) external returns (bytes4);
}
