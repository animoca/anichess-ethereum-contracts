// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPointsV2} from "../../../points/interface/IPointsV2.sol";

/// @title LinearPool_PointsRewards
/// @notice This contract is used to handle the points rewards for linear pools.
// solhint-disable-next-line contract-name-capwords
abstract contract LinearPool_PointsRewards {
    IPointsV2 public immutable POINTS_CONTRACT;
    bytes32 public immutable DEPOSIT_REASON_CODE;

    error InvalidPointsContract();

    /// @dev Reverts with {InvalidPointsContract} if the points contract address is zero.
    /// @param pointsContract The address of the points contract.
    /// @param depositReasonCode The reason code for the deposit.
    constructor(IPointsV2 pointsContract, bytes32 depositReasonCode) {
        require(address(pointsContract) != address(0), InvalidPointsContract());
        POINTS_CONTRACT = pointsContract;
        DEPOSIT_REASON_CODE = depositReasonCode;
    }

    /// @notice Deposits `reward` points to the `sender`'s account.
    /// @param sender The address of the user receiving the points.
    /// @param reward The amount of points to be deposited.
    /// @return claimed The amount of points claimed.
    /// @return unclaimed The amount of points unclaimed (always 0).
    function _computeClaim(address sender, uint256 reward, bytes calldata) internal virtual returns (uint256 claimed, uint256 unclaimed) {
        claimed = reward;
        unclaimed = 0;
        POINTS_CONTRACT.deposit(sender, reward, DEPOSIT_REASON_CODE);
    }

    /// @notice Computes the reward for a staker.
    /// @dev This function is empty since the rewards do not need to be transferred to this contract.
    function _computeAddReward(address, uint256) internal virtual {}
}
