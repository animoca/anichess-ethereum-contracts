// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRNGConsumer {
    /// @notice Callback function used by the RNGProvider to deliver randomness.
    /// @dev This function is called by the RNGProvider when the randomness request is fulfilled.
    /// @param requestId the request ID of the randomness request.
    /// @param randomWords the randomness result.
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) external;
}
