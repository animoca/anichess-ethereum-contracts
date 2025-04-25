// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/LinearPool.sol";
import {ERC20StakingLinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/stake/ERC20StakingLinearPool.sol";
import {LinearPool_PointsRewards} from "./reward/LinearPool_PointsRewards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPoints} from "./../points/interface/IPoints.sol";

contract ERC20StakingPointsRewardsLinearPool is ERC20StakingLinearPool, LinearPool_PointsRewards {
    constructor(
        IERC20 stakingToken,
        IPoints pointsContract,
        bytes32 depositReasonCode,
        IForwarderRegistry forwarderRegistry
    ) ERC20StakingLinearPool(stakingToken, forwarderRegistry) LinearPool_PointsRewards(pointsContract, depositReasonCode) {}

    function _computeClaim(
        address staker,
        uint256 reward
    ) internal virtual override(LinearPool, LinearPool_PointsRewards) returns (bytes memory claimData) {
        return LinearPool_PointsRewards._computeClaim(staker, reward);
    }

    function _computeAddReward(address rewarder, uint256 reward, uint256 dust) internal virtual override(LinearPool, LinearPool_PointsRewards) {
        LinearPool_PointsRewards._computeAddReward(rewarder, reward, dust);
    }
}
