// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPointsV2} from "./interface/IPointsV2.sol";
import {IPointsV2SpendingCallback} from "./interface/IPointsV2SpendingCallback.sol";

/// @title PointsV2SpendingCallback
abstract contract PointsV2SpendingCallback is IPointsV2SpendingCallback {
    IPointsV2 public immutable POINTS;

    error IncorrectCallbackCaller(address caller);

    constructor(IPointsV2 points) {
        POINTS = points;
    }

    function onPointsSpent(address spender, uint256 amount, bytes calldata data) external virtual returns (bytes4) {
        require(msg.sender == address(POINTS), IncorrectCallbackCaller(msg.sender));
        _onPointsSpent(spender, amount, data);
        return IPointsV2SpendingCallback.onPointsSpent.selector;
    }

    function _onPointsSpent(address spender, uint256 amount, bytes calldata data) internal virtual;
}
