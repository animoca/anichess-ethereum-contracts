// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GambitMatchCompleteCallback} from "../../game/GambitMatchCompleteCallback.sol";

contract GambitMatchCompleteCallbackMock is GambitMatchCompleteCallback {
    event OnMatchCompletedCalled(uint256 indexed matchId, address indexed winner, address indexed loser, uint256 prize, uint256 fee);

    constructor(address gambit) GambitMatchCompleteCallback(gambit) {}

    function _onMatchCompleted(uint256 matchId, address winner, address loser, uint256 prize, uint256 fee) internal override {
        emit OnMatchCompletedCalled(matchId, winner, loser, prize, fee);
    }
}
