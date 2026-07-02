// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IRNGConsumer} from "./interfaces/IRNGConsumer.sol";
import {IRNGProvider} from "./interfaces/IRNGProvider.sol";

abstract contract RNGConsumer is IRNGConsumer {
    IRNGProvider public immutable RNG_PROVIDER;

    error OnlyRNGProviderCanFulfill(address wrongCaller);

    /// @param rngProvider the address of the RNGProvider contract
    constructor(IRNGProvider rngProvider) {
        RNG_PROVIDER = rngProvider;
    }

    /// @inheritdoc IRNGConsumer
    /// @dev Reverts with {OnlyRNGProviderCanFulfill} if called by a non-RNGProvider address.
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == address(RNG_PROVIDER), OnlyRNGProviderCanFulfill(msg.sender));
        _fulfillRandomness(requestId, randomWords);
    }

    /// @notice Requests randomness from the RNGProvider.
    /// @param numWords is the number of random words to request.
    /// @return requestId the request ID of the newly created randomness request.
    function _requestRandomness(uint32 numWords) internal returns (uint256 requestId) {
        return RNG_PROVIDER.requestRandomness(numWords);
    }

    /// @notice Handles the RNGProvider response.
    /// @param requestId the request ID of the randomness request.
    /// @param randomWords the randomness result.
    function _fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) internal virtual;
}
