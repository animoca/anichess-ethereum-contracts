// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/LinearPool.sol";
import {ERC20StakingLinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/stake/ERC20StakingLinearPool.sol";
import {LinearPool_PointsRewards} from "./reward/LinearPool_PointsRewards.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPoints} from "./../points/interface/IPoints.sol";

/// @title ERC20StakingPointsRewardsLinearPool
/// @notice This contract is used to stake ERC20 tokens and obtain Points rewards.
/// @notice Staking can be done by the user or via a claim contract.
contract ERC20StakingPointsRewardsLinearPool is ERC20StakingLinearPool, LinearPool_PointsRewards {
    address public immutable CLAIM_CONTRACT;

    /// @dev Reverts with {InvalidPointsContract} if the points contract address is zero.
    /// @param claimContract The address of the claim contract.
    /// @param stakingToken The ERC20 token used for staking.
    /// @param pointsContract The address of the points contract.
    /// @param depositReasonCode The reason code for the deposit.
    /// @param forwarderRegistry The address of the forwarder registry.
    constructor(
        address claimContract,
        IERC20 stakingToken,
        IPoints pointsContract,
        bytes32 depositReasonCode,
        IForwarderRegistry forwarderRegistry
    ) ERC20StakingLinearPool(stakingToken, forwarderRegistry) LinearPool_PointsRewards(pointsContract, depositReasonCode) {
        CLAIM_CONTRACT = claimContract;
    }

    /// @inheritdoc ERC20StakingLinearPool
    function onERC20Received(address operator, address from, uint256 value, bytes calldata data) external virtual override returns (bytes4) {
        require(msg.sender == address(STAKING_TOKEN), InvalidToken());
        bool requiresTransfer = false;
        if (operator == CLAIM_CONTRACT) {
            address staker = abi.decode(data, (address));
            _stake(staker, abi.encode(requiresTransfer, abi.encode(value)));
        } else {
            _stake(from, abi.encode(requiresTransfer, abi.encode(value)));
        }
        return this.onERC20Received.selector;
    }

    /// @inheritdoc LinearPool_PointsRewards
    function _computeClaim(
        address staker,
        uint256 reward
    ) internal virtual override(LinearPool, LinearPool_PointsRewards) returns (bytes memory claimData) {
        return LinearPool_PointsRewards._computeClaim(staker, reward);
    }

    /// @inheritdoc LinearPool_PointsRewards
    function _computeAddReward(address rewarder, uint256 reward, uint256 dust) internal virtual override(LinearPool, LinearPool_PointsRewards) {
        LinearPool_PointsRewards._computeAddReward(rewarder, reward, dust);
    }
}
