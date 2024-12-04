// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {BitmapClaim} from "../../bitmapClaim/BitmapClaim.sol";

contract BitmapClaimMock is BitmapClaim {
    event ValidateClaimCalled(address recipient, uint256[] claimBitPositions, bytes validationData);
    event DeliverCalled(address recipient, uint256 amount);

    function _validateClaim(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData) internal override {
        emit ValidateClaimCalled(recipient, claimBitPositions, validationData);
    }

    function _deliver(address recipient, uint256 amount) internal override {
        emit DeliverCalled(recipient, amount);
    }
}
