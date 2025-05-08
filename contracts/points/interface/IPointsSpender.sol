// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IPoints} from "./IPoints.sol";

interface IPointsSpender is IPoints {
    function consume(address holder, uint256 amount, bytes32 consumeReasonCode, uint256 deadline, bytes calldata signature) external;

    function consume(uint256 amount, bytes32 consumeReasonCode) external;

    function consume(address holder, uint256 amount, bytes32 consumeReasonCode) external;
}
