// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IGambitMatchCompleteCallback} from "./interfaces/IGambitMatchCompleteCallback.sol";

/// @title GambitMatchCompleteCallback
abstract contract GambitMatchCompleteCallback is IGambitMatchCompleteCallback {
    address public immutable GAMBIT;

    error IncorrectCallbackCaller(address caller);

    constructor(address gambit) {
        GAMBIT = gambit;
    }

    function onMatchCompleted(uint256 matchId, address winner, address loser, uint256 prize, uint256 fee) external returns (bytes4) {
        require(msg.sender == GAMBIT, IncorrectCallbackCaller(msg.sender));
        _onMatchCompleted(matchId, winner, loser, prize, fee);
        return IGambitMatchCompleteCallback.onMatchCompleted.selector;
    }

    function _onMatchCompleted(uint256 matchId, address winner, address loser, uint256 prize, uint256 fee) internal virtual;
}
