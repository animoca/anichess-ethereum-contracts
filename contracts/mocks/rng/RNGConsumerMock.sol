// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RNGConsumer} from "./../../rng/RNGConsumer.sol";
import {IRNGProvider} from "./../../rng/interfaces/IRNGProvider.sol";

contract RNGConsumerMock is RNGConsumer {
    IRNGProvider public rngProvider;

    event FulfillRandomnessCalled(uint256 requestId, uint256[] randomWords);

    constructor(IRNGProvider _rngProvider) RNGConsumer(_rngProvider) {
        rngProvider = _rngProvider;
    }

    function requestRandomness(uint32 numWords) external returns (uint256 requestId) {
        return rngProvider.requestRandomness(numWords);
    }

    function _fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) internal override {
        emit FulfillRandomnessCalled(requestId, randomWords);
    }
}
