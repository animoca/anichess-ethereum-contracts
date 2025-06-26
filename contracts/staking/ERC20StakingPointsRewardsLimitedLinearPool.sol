// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20StakingPointsRewardsLinearPool} from "./ERC20StakingPointsRewardsLinearPool.sol";
import {ERC20StakingLinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/stake/ERC20StakingLinearPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPoints} from "./../points/interface/IPoints.sol";

/// @title ERC20StakingPointsRewardsLimitedLinearPool
/// @notice This contract is used to stake ERC20 tokens and obtain Points rewards.
/// @notice Staking can only be done via a claim contract and the `stake` function is not available.
contract ERC20StakingPointsRewardsLimitedLinearPool is ERC20StakingPointsRewardsLinearPool {
    error InvalidTransferOperator(address operator);
    error OnlyReceiverInterface();

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
    ) ERC20StakingPointsRewardsLinearPool(claimContract, stakingToken, pointsContract, depositReasonCode, forwarderRegistry) {}

    /// @inheritdoc ERC20StakingPointsRewardsLinearPool
    /// @dev Reverts with {InvalidTransferOperator} if the operator is not the claim contract.
    function onERC20Received(address operator, address, uint256 value, bytes calldata data) external virtual override returns (bytes4) {
        require(msg.sender == address(STAKING_TOKEN), InvalidToken());
        require(operator == CLAIM_CONTRACT, InvalidTransferOperator(operator));
        address staker = abi.decode(data, (address));
        _stake(staker, abi.encode(value));
        return this.onERC20Received.selector;
    }

    /// @dev Reverts with {OnlyReceiverInterface}.
    function stake(bytes calldata) public payable virtual override {
        revert OnlyReceiverInterface();
    }

    /// @inheritdoc ERC20StakingLinearPool
    /// @param stakeData The data to be used for staking, encoded as (uint256 stakePoints).
    function _computeStake(address, bytes memory stakeData) internal virtual override returns (uint256 stakePoints) {
        // The tokens were received via the receiver interface, so we don't need to transfer them.
        stakePoints = abi.decode(stakeData, (uint256));
    }
}
