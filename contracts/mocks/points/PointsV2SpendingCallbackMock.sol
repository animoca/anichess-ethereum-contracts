// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPointsV2} from "./../../points/interface/IPointsV2.sol";
import {PointsV2SpendingCallback} from "./../../points/PointsV2SpendingCallback.sol";

/// @title PointsV2SpendingCallback
contract PointsV2SpendingCallbackMock is PointsV2SpendingCallback {
    event PointsSpent(address indexed spender, uint256 amount, bytes data);

    constructor(IPointsV2 points) PointsV2SpendingCallback(points) {}

    function _onPointsSpent(address spender, uint256 amount, bytes calldata data) internal override {
        emit PointsSpent(spender, amount, data);
    }
}
