// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IGambitMatchCompleteCallback {
    /**
     * @notice Handles the callback after a Gambit match has been completed.
     * @dev This function is called by the Gambit contract after a match has been completed.
     * @param matchId The ID of the completed match.
     * @param winner The address of the winning player.
     * @param loser The address of the losing player.
     * @param reward The amount of reward distributed to the winner.
     * @param fee The amount of fee collected by the platform.
     */
    function onMatchCompleted(uint256 matchId, address winner, address loser, uint256 reward, uint256 fee) external returns (bytes4);
}
