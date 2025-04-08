// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {LinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/LinearPool.sol";
import {ERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/ERC20Receiver.sol";
import {IERC20} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPoints} from "./../points/interface/IPoints.sol";

contract CStakingPool is LinearPool, ERC20Receiver {
    IERC20 public immutable C_TOKEN;
    address public immutable CLAIM_CONTRACT;
    IPoints public immutable POINTS_CONTRACT;
    bytes32 public immutable DEPOSIT_REASON_CODE;

    error InvalidToken();
    error InvalidTransferOperator();
    error OnlyReceiverInterface();

    constructor(
        IERC20 cToken,
        address claimContract,
        IPoints pointsContract,
        bytes32 depositReasonCode,
        IForwarderRegistry forwarderRegistry
    ) LinearPool(forwarderRegistry) {
        C_TOKEN = cToken;
        CLAIM_CONTRACT = claimContract;
        POINTS_CONTRACT = pointsContract;
        DEPOSIT_REASON_CODE = depositReasonCode;
    }

    function onERC20Received(address operator, address, uint256 value, bytes calldata data) external override returns (bytes4) {
        require(msg.sender == address(C_TOKEN), InvalidToken());
        require(operator == CLAIM_CONTRACT, InvalidTransferOperator());
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

    function withdraw(bytes calldata withdrawData) public virtual override {
        // non-reentrancy check removed, since C_TOKEN implementation is known and transfer() is re-entrancy safe
        _withdraw(_msgSender(), withdrawData);
    }

    function _computeWithdraw(address staker, bytes memory withdrawData) internal virtual override returns (uint256 stakePoints) {
        stakePoints = abi.decode(withdrawData, (uint256));
        C_TOKEN.transfer(staker, stakePoints);
    }

    function _computeClaim(address sender, uint256 reward) internal virtual override returns (bytes memory claimData) {
        claimData = abi.encode(reward);
        POINTS_CONTRACT.deposit(sender, reward, DEPOSIT_REASON_CODE);
    }

    function _computeAddReward(address sender, uint256 reward, uint256 dust) internal virtual override {}
}
