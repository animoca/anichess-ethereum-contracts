// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IScratching {
    /// @notice Returns the pending scratch request ID for a given token ID.
    /// @param tokenId the token ID.
    /// @return requestId the pending scratch request ID (0 if no pending request).
    function pendingScratchRequest(uint256 tokenId) external view returns (uint256 requestId);
}
