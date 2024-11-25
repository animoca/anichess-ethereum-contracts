// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

abstract contract BitmapClaim is ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice Thrown when the bit position is bigger than maxBitCount.
    error BitPositionTooBig(uint256 bitPosition, uint256 maxBitCount);

    /// @notice Thrown when the claim bits is invalid.
    error InvalidClaimBits(uint256 claimBits);

    /// @notice Thrown when the bits are conflicting stored bitmap.
    error AlreadyClaimed(address recipient, uint256 claimBits, uint256 claimedBitmap);

    event BitmapUpdated(address recipient, uint256 oldBitMap, uint256 newBitmap);

    event BitPositionValueSet(uint256 bitPosition, uint256 value);

    event Claimed(address recipient, uint256 claimBits);

    uint256 public maxBitCount;
    mapping(address recipient => uint256 bitmap) public claimed;
    mapping(uint256 bitPosition => uint256 value) public bitPositionValueMap;

    constructor() ContractOwnership(msg.sender) {}

    /// @dev Reverts with {BitPositionTooBig} if bitPosition is larger than maxBitCount.
    function setBitValue(uint256 bitPosition, uint256 value) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        uint256 _maxBitCount = maxBitCount;
        if (bitPosition > _maxBitCount) {
            revert BitPositionTooBig(bitPosition, _maxBitCount);
        }

        bitPositionValueMap[bitPosition] = value;
        emit BitPositionValueSet(bitPosition, value);

        maxBitCount = _maxBitCount + 1;
    }

    /// @notice Executes the claim for a given recipient address (anyone can call this function).
    /// @dev Reverts with {InvalidClaimBits} if claimBits is zero.
    /// @dev Reverts with {AlreadyClaimed} if one of the the given claimBits has been claimed.
    /// @dev Emits a {Claimed} event.
    /// @param recipient The recipient for this claim.
    /// @param claimBits Indicate which flags it is claiming for.
    /// @param validationData validationData for validating the claim.
    function claim(address recipient, uint256 claimBits, bytes calldata validationData) external virtual {
        if (claimBits == 0 || claimBits >> maxBitCount > 0) {
            revert InvalidClaimBits(claimBits);
        }

        uint256 storedBitmap = claimed[recipient];
        if (storedBitmap & claimBits > 0) {
            revert AlreadyClaimed(recipient, claimBits, storedBitmap);
        }

        _validateClaim(recipient, claimBits, validationData);

        uint256 newBitmap = storedBitmap | claimBits;
        claimed[recipient] = newBitmap;
        emit BitmapUpdated(recipient, storedBitmap, newBitmap);

        emit Claimed(recipient, claimBits);
        uint256 deliverAmount;
        uint256 count = maxBitCount;
        for (uint256 bitPos; bitPos < count; ++bitPos) {
            if (claimBits & 1 > 0) {
                deliverAmount += bitPositionValueMap[bitPos];
            }
            claimBits >>= 1;
        }

        _deliver(recipient, deliverAmount);
    }

    /// @notice Called by claim(). Inheriting contract must implement this function to validate the claim with given validationData. 
    /// @param recipient Recipient of the claim.
    /// @param claimBits Bits for the claim.
    /// @param validationData Data for validation. Implementation specific.
    function _validateClaim(address recipient, uint256 claimBits, bytes calldata validationData) internal virtual;

    /// @notice Called by claim(). Inheriting contract must implement this function to complete the actual claim. 
    /// @param recipient Recipient of the claim.
    /// @param amount Amount of the claim.
    function _deliver(address recipient, uint256 amount) internal virtual;

}
