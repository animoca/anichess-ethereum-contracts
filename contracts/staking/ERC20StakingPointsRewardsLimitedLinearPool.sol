// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20StakingPointsRewardsLinearPool} from "./ERC20StakingPointsRewardsLinearPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPoints} from "./../points/interface/IPoints.sol";

contract ERC20StakingPointsRewardsLimitedLinearPool is ERC20StakingPointsRewardsLinearPool {
    error InvalidTransferOperator(address operator);
    error OnlyReceiverInterface();

    constructor(
        address claimContract,
        IERC20 stakingToken,
        IPoints pointsContract,
        bytes32 depositReasonCode,
        IForwarderRegistry forwarderRegistry
    ) ERC20StakingPointsRewardsLinearPool(claimContract, stakingToken, pointsContract, depositReasonCode, forwarderRegistry) {}

    function onERC20Received(address operator, address, uint256 value, bytes calldata data) external virtual override returns (bytes4) {
        require(msg.sender == address(STAKING_TOKEN), InvalidToken());
        require(operator == CLAIM_CONTRACT, InvalidTransferOperator(operator));
        address staker = abi.decode(data, (address));
        _stake(staker, abi.encode(value));
        return this.onERC20Received.selector;
    }

    function stake(bytes calldata) public payable virtual override {
        revert OnlyReceiverInterface();
    }

    function _computeStake(address, bytes memory stakeData) internal virtual override returns (uint256 stakePoints) {
        // The tokens were received via the receiver interface, so we don't need to transfer them.
        stakePoints = abi.decode(stakeData, (uint256));
    }
}
