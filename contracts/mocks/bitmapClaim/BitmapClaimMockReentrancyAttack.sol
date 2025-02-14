// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {BitmapClaim} from "../../bitmapClaim/BitmapClaim.sol";

contract BitmapClaimMockReentrancyAttack is BitmapClaim {
    bool private enableValidateClaimReentrancy;

    function setEnableValidateClaimReentrancy(bool enabled) external {
        enableValidateClaimReentrancy = enabled;
    }

    function _validateClaim(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData) internal override {
        if (enableValidateClaimReentrancy) {
            this.claim(recipient, claimBitPositions, validationData);
        }
    }

    function _deliver(address recipient, uint256) internal override {
        uint256[] memory claimBitPositions = new uint256[](1);
        bytes memory validationData;
        this.claim(recipient, claimBitPositions, validationData);
    }
}
