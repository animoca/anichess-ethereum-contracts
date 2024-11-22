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
        _validateAndDeliver(recipient, claimBits, validationData);
    }

    function _validateClaim(address recipient, uint256 claimBits, bytes calldata validationData) internal virtual;
    function _deliver(address recipient, uint256 amount) internal virtual;

    function _validateAndDeliver(address recipient, uint256 claimBits, bytes calldata validationData) internal {
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

    // //Anichess
    // //validateSiganture
    // //deliver()
    // function claim(signature)

    // function _validateSignatue()

    // function _deliver();

    // //Recho
    // function claim(merkleproof)

    // function _validateMerkleProof();

    // function _deliver()

    // //Base
    // function _deliverImmedate() virtual

    // //check _validate();
    // function deliver();
    // function _validate();

    // function _validateClaimBits(address recipient, uint256 claimBits) internal virtual {
    //     if (claimBits == 0 || claimBits >> maxBitCount > 0) {
    //         revert InvalidClaimBits(claimBits);
    //     }

    //     uint256 storedBitmap = claimed[recipient];
    //     if (storedBitmap & claimBits > 0) {
    //         revert BitsAlreadyClaimed(recipient, claimBits, storedBitmap);
    //     }
    // }

    // function _validateSignature(address recipient, uint256 claimBits, bytes calldata signature) internal virtual {
    //     bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, recipient, claimBits)));
    //     bool isValid = SignatureChecker.isValidSignatureNow(ContractOwnershipStorage.layout().owner(), digest, signature);
    //     if (!isValid) {
    //         revert InvalidSignature();
    //     }
    // }

    // function _updateBitmapAndDeliver(address recipient, uint256 claimBits) internal {
    //     uint256 bitPos;
    //     uint256 deliverAmount;

    //     uint256 count = maxBitCount;
    //     for (uint256 i; i<count; ++i) {
    //         if (claimBits & 1 > 0) {
    //             deliverAmount += bitPositionValueMap[bitPos++];
    //         }
    //         claimBits >>= 1;
    //     }

    //     uint256 newBitmap = storedBitmap | claimBits;
    //     claimed[recipient] = newBitmap;

    //     emit BitmapUpdated(recipient, storedBitmap, newBitmap);

    //     _deliver(recipient, deliverAmount);
    // }
}
