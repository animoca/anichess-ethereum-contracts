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

    /// @notice Thrown when the given forwarder registry address is zero address.
    error InvalidForwarderRegistry();

    /// @notice Thrown when the signature is invalid.
    error InvalidSignature();

    bytes32 private constant CLAIM_TYPEHASH = keccak256("PointsBitmapClaim(address recipient,uint256 claimBits)");
    IPoints public immutable POINTS;
    bytes32 public immutable DEPOSIT_REASON_CODE;

    constructor(
        address pointsContractAddress,
        IForwarderRegistry _forwarderRegistry,
        bytes32 depositReasonCode
    ) EIP712("PointsBitmapClaim", "1.0") ForwarderRegistryContext(_forwarderRegistry) {
        if (pointsContractAddress == address(0)) {
            revert InvalidPointsContractAddress();
        }

        if (address(_forwarderRegistry) == address(0)) {
            revert InvalidForwarderRegistry();
        }

        POINTS = IPoints(pointsContractAddress);
        DEPOSIT_REASON_CODE = depositReasonCode;
    }

    function _validateClaim(address recipient, uint256 claimBits, bytes calldata validationData) internal view override {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, recipient, claimBits)));
        bool isValid = SignatureChecker.isValidSignatureNow(ContractOwnershipStorage.layout().owner(), digest, validationData);
        if (!isValid) {
            revert InvalidSignature();
        }
    }

    function _deliver(address recipient, uint256 amount) internal override {
        POINTS.deposit(recipient, amount, DEPOSIT_REASON_CODE);
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
