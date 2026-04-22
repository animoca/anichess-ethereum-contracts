// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IGambitMatchCompleteCallback} from "../../game/interfaces/IGambitMatchCompleteCallback.sol";

contract InvalidGambitMatchCompleteCallbackMock is IGambitMatchCompleteCallback {
    address public immutable GAMBIT;

    constructor(address gambit) {
        GAMBIT = gambit;
    }

    function onMatchCompleted(uint256, address, address, uint256, uint256) external pure returns (bytes4) {
        return 0;
    }
}
