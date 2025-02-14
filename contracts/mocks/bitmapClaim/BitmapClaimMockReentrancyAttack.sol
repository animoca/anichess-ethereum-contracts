// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {BitmapClaimMock} from "./BitmapClaimMock.sol";
import {BitmapClaimMockReentrancyRecipient} from "./BitmapClaimMockReentrancyRecipient.sol";

contract BitmapClaimMockReentrancyAttack is BitmapClaimMock {
    function _validateClaim(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData) internal override {
        BitmapClaimMockReentrancyRecipient(recipient).attack(recipient, claimBitPositions, validationData);
    }
}
