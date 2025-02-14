// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IPoints} from "../points/interface/IPoints.sol";
import {BitmapClaim} from "./BitmapClaim.sol";

contract PointsBitmapClaim is BitmapClaim, EIP712, ForwarderRegistryContext {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice Thrown when the given points address is zero address.
    error InvalidPointsContractAddress();

    /// @notice Thrown when the signature is invalid.
    error SignerAlreadySet(address signer);

    /// @notice Thrown when the signer address has already been set.
    error InvalidSignature();

    /// @notice Event emitted when signer is updated successfully.
    /// @param signer The signer of the ERC712 signature for claim validation.
    event SignerSet(address signer);

    /// @notice The type hash for ERC712 signature.
    bytes32 private constant CLAIM_TYPEHASH = keccak256("PointsBitmapClaim(address recipient,bytes32 claimBitPositionsHash)");

    /// @notice The Points contract for despoit.
    IPoints public immutable POINTS;

    /// @notice The deposit reason code for points despoit.
    bytes32 public immutable DEPOSIT_REASON_CODE;

    /// @notice The signer of the ERC712 signature for claim validation.
    address public signer;

    constructor(
        address pointsContractAddress,
        IForwarderRegistry _forwarderRegistry,
        bytes32 depositReasonCode,
        address _signer
    ) EIP712("PointsBitmapClaim", "1.0") ForwarderRegistryContext(_forwarderRegistry) {
        if (pointsContractAddress == address(0)) {
            revert InvalidPointsContractAddress();
        }

        POINTS = IPoints(pointsContractAddress);
        DEPOSIT_REASON_CODE = depositReasonCode;
        signer = _signer;
        emit SignerSet(_signer);
    }

    /// @notice Sets the signer of the ERC712 signature for claim validation.
    /// @dev Reverts with {SignerAlreadySet} if signer address has already been set.
    /// @dev Reverts with {NotContractOwner} if sender is not owner.
    /// @dev Emits a {SignerSet} event.
    /// @param newSigner New signer.
    function setSigner(address newSigner) external {
        if (newSigner == signer) {
            revert SignerAlreadySet(newSigner);
        }
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        signer = newSigner;

        emit SignerSet(newSigner);
    }

    /// @inheritdoc BitmapClaim
    /// @dev Reverts with {InvalidSignature} if validationData is not a valid ERC712 signature by the specified signer.
    /// @param recipient Recipient of the claim.
    /// @param claimBitPositions Bit position array for the claim.
    /// @param validationData Data for validation. Expects a valid ERC712 signature by contract owner.
    function _validateClaim(address recipient, uint256[] calldata claimBitPositions, bytes calldata validationData) internal view override {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, recipient, keccak256(abi.encode(claimBitPositions)))));
        bool isValid = SignatureChecker.isValidSignatureNow(signer, digest, validationData);
        if (!isValid) {
            revert InvalidSignature();
        }
    }

    /// @inheritdoc BitmapClaim
    function _deliver(address recipient, uint256 amount) internal override {
        if (amount > 0) {
            POINTS.deposit(recipient, amount, DEPOSIT_REASON_CODE);
        }
    }

    /// @inheritdoc ForwarderRegistryContextBase
    /// @notice retrieve original msg sender of the meta transaction
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    /// @notice retrieve original msg calldata of the meta transaction
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
