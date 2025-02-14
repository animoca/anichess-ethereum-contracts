// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {BitmapClaim} from "../../bitmapClaim/BitmapClaim.sol";

contract BitmapClaimMockReentrancyRecipient {
    BitmapClaim private immutable BITMAP_CLAIM;

    constructor(BitmapClaim bitmapClaim) {
        BITMAP_CLAIM = bitmapClaim;
    }

    function attack(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData) external {
        BITMAP_CLAIM.claim(recipient, claimBitPositions, validationData);
    }
}
