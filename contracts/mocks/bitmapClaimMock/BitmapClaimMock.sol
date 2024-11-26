// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {BitmapClaim} from "../../bitmapClaim/BitmapClaim.sol";

contract BitmapClaimMock is BitmapClaim {
    event ValidateClaimCalled(address recipient, uint256 claimBits, bytes validationData);
    event DeliverCalled(address recipient, uint256 amount);

    function _validateClaim(address recipient, uint256 claimBits, bytes calldata validationData) internal override {
        emit ValidateClaimCalled(recipient, claimBits, validationData);
    }

    function _deliver(address recipient, uint256 amount) internal override {
        emit DeliverCalled(recipient, amount);
    }
}
