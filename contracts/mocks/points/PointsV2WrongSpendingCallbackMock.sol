// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPointsV2} from "./../../points/interface/IPointsV2.sol";
import {IPointsV2SpendingCallback} from "./../../points/interface/IPointsV2SpendingCallback.sol";

/// @title PointsV2SpendingCallback
contract PointsV2WrongSpendingCallbackMock is IPointsV2SpendingCallback {
    IPointsV2 public immutable POINTS;

    event PointsSpent(address indexed spender, uint256 amount, bytes data);

    constructor(IPointsV2 points) {
        POINTS = points;
    }

    function onPointsSpent(address, uint256, bytes calldata) external virtual returns (bytes4) {
        return 0;
    }
}
