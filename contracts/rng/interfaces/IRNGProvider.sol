// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRNGProvider {
    event RandomnessRequested(address consumer, uint256 requestId, uint32 numWords);
    event RandomnessFulfilled(address consumer, uint256 requestId, uint256[] randomWords);

    struct RequestDetails {
        address consumer;
        bool fulfilled;
        uint32 numWords;
        uint256[] randomWords;
    }

    /// @notice Returns the details of a randomness request.
    /// @param requestId the request ID of the randomness request.
    /// @return the details of the randomness request.
    function requestDetails(uint256 requestId) external view returns (RequestDetails memory);

    /// @notice Requests randomness from the RNGProvider.
    /// @dev Emits a {RandomnessRequested} event.
    /// @param numWords is the number of random words to request.
    /// @return requestId the request ID of the newly created randomness request.
    function requestRandomness(uint32 numWords) external returns (uint256 requestId);

    /// @notice Fulfills a randomness request.
    /// @dev Emits a {RandomnessFulfilled} event.
    /// @param requestId the request ID of the randomness request.
    /// @param randomWords the randomness result.
    /// @param signature the signature of the fulfillment.
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords, bytes calldata signature) external;
}
