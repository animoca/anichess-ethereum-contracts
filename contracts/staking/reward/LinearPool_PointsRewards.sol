// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoints} from "./../../points/interface/IPoints.sol";

/// @title LinearPool_PointsRewards
/// @notice This contract is used to handle the points rewards for linear pools.
// solhint-disable-next-line contract-name-capwords
abstract contract LinearPool_PointsRewards {
    IPoints public immutable POINTS_CONTRACT;
    bytes32 public immutable DEPOSIT_REASON_CODE;

    error InvalidPointsContract();

    /// @dev Reverts with {InvalidPointsContract} if the points contract address is zero.
    /// @param pointsContract The address of the points contract.
    /// @param depositReasonCode The reason code for the deposit.
    constructor(IPoints pointsContract, bytes32 depositReasonCode) {
        require(address(pointsContract) != address(0), InvalidPointsContract());
        POINTS_CONTRACT = pointsContract;
        DEPOSIT_REASON_CODE = depositReasonCode;
    }

    /// @notice Deposits `reward` points to the `sender`'s account.
    /// @param sender The address of the user receiving the points.
    /// @param reward The amount of points to be deposited.
    /// @return claimData The data to be used for claiming the reward, encoded as (uint256 reward).
    function _computeClaim(address sender, uint256 reward) internal virtual returns (bytes memory claimData) {
        claimData = abi.encode(reward);
        POINTS_CONTRACT.deposit(sender, reward, DEPOSIT_REASON_CODE);
    }

    /// @notice Computes the reward for a staker.
    /// @dev This function is empty since the rewards do not need to be transferred to this contract.
    function _computeAddReward(address, uint256, uint256) internal virtual {}
}
