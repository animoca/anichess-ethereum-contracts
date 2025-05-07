// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoints} from "./../../points/interface/IPoints.sol";

/// @title LinearPool_PointsRewards
/// @notice This contract is used to handle the points rewards for linear pools.
// solhint-disable-next-line contract-name-capwords
abstract contract LinearPool_PointsRewards {
    IPoints public immutable POINTS_CONTRACT;
    bytes32 public immutable DEPOSIT_REASON_CODE;

    constructor(IPoints pointsContract, bytes32 depositReasonCode) {
        POINTS_CONTRACT = pointsContract;
        DEPOSIT_REASON_CODE = depositReasonCode;
    }

    function _computeClaim(address sender, uint256 reward) internal virtual returns (bytes memory claimData) {
        claimData = abi.encode(reward);
        POINTS_CONTRACT.deposit(sender, reward, DEPOSIT_REASON_CODE);
    }

    function _computeAddReward(address sender, uint256 reward, uint256 dust) internal virtual {}
}
