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

    /// @notice Thrown when the claim has been done before.
    error AlreadyClaimed(address recipient, uint256 claimBits, uint256 claimedBitmap);

    /// @notice Event emitted when value of the bitPosition is set successfully.
    /// @param bitPosition The bit position to be set.
    /// @param value The value of the bit position.
    event BitValueSet(uint256 bitPosition, uint256 value);

    /// @notice Event emitted when claim is done successfully.
    /// @param recipient The recipient of the points.
    /// @param oldBitmap The original bitmap value before setting to new value.
    /// @param newBitmap The new bitmap value.
    event Claimed(address recipient, uint256 oldBitmap, uint256 newBitmap);

    /// @notice Max number of bits in claimBits for validating claims.
    uint256 public maxBitCount;

    /// @notice Mapping for each recipient to claimed bitmap.
    mapping(address recipient => uint256 bitmap) public claimed;

    /// @notice Mapping for each bit position to value for claiming.
    mapping(uint256 bitPosition => uint256 value) public bitPositionValueMap;

    constructor() ContractOwnership(msg.sender) {}

    /// @param value The value to be assigned to a new bit.
    function addBitValue(uint256 value) external {
        uint256 bitPosition = maxBitCount;
        _setBitValue(bitPosition, value);
        maxBitCount = bitPosition + 1;
    }

    /// @dev Reverts with {BitPositionTooBig} if bitPosition is larger than or equal to maxBitCount.
    /// @param bitPosition The bit position of the update.
    /// @param value The value to be updated to.
    function updateBitValue(uint256 bitPosition, uint256 value) external {
        uint256 _maxBitCount = maxBitCount;
        if (bitPosition >= maxBitCount) {
            revert BitPositionTooBig(bitPosition, _maxBitCount);
        }
        _setBitValue(bitPosition, value);
    }

    /// @notice Called by addBitValue() and updateBitValue().
    /// @dev Reverts with {NotContractOwner} if sender is not owner.
    /// @dev Emits a {BitValueSet} event.
    /// @param bitPosition The bit position of the update.
    /// @param value The value to be updated to.
    function _setBitValue(uint256 bitPosition, uint256 value) internal {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        bitPositionValueMap[bitPosition] = value;
        emit BitValueSet(bitPosition, value);
    }

    /// @notice Executes the claim for a given recipient address (anyone can call this function).
    /// @dev Reverts with {InvalidClaimBits} if claimBits is zero or exceeding maxBitCount.
    /// @dev Reverts with {AlreadyClaimed} if one of the the given claimBits has been claimed.
    /// @dev Emits a {Claimed} event.
    /// @param recipient The recipient for this claim.
    /// @param claimBits Indicate which bits it is claiming for.
    /// @param validationData validationData for validating the claim.
    function claim(address recipient, uint256 claimBits, bytes calldata validationData) external {
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

        emit Claimed(recipient, storedBitmap, newBitmap);

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
