// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {PointsBitmapClaim} from "../../bitmapClaim/PointsBitmapClaim.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract PointsBitmapClaimMock is PointsBitmapClaim {
    constructor(
        address pointsContractAddress,
        IForwarderRegistry forwarderRegistry_,
        bytes32 depositReasonCode,
        address signer
    ) PointsBitmapClaim(pointsContractAddress, forwarderRegistry_, depositReasonCode, signer) {}

    function __validateClaim(address recipient, uint256 claimBits, bytes calldata validationData) external view {
        _validateClaim(recipient, claimBits, validationData);
    }

    function __deliver(address recipient, uint256 amount) external {
        _deliver(recipient, amount);
    }

    /// @notice Internal function to access the current msg.sender.
    /// @return The current msg.sender value.
    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
