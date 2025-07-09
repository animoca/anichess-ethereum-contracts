// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {EthernalsMetadata, Metadata} from "./EthernalsMetadata.sol";

contract EthernalsMetadataSetter {
    using MerkleProof for bytes32[];

    /// @notice The ethernals metadata contract address.
    EthernalsMetadata public immutable ETHERNALS_METADATA;

    /// @notice The merkle root.
    bytes32 public immutable ROOT;

    mapping(bytes32 leaf => bool) public metadataSet;

    /// @notice Thrown when the metadata registry address is zero.
    error InvalidEthernalsMetadata();

    /// @notice Thrown when the metadata merkle root is invalid.
    error InvalidMetadataMerkleRoot();

    /// @notice Thrown when the metadata merkle proof is invalid.
    error InvalidMetadataMerkleProof();

    event MetadataSet(uint256[] indexed tokenIds, Metadata[] metadata);

    constructor(address ethernalsMetadata_, bytes32 root_) {
        if (ethernalsMetadata_ == address(0)) {
            revert InvalidEthernalsMetadata();
        }
        if (root_ == bytes32(0)) {
            revert InvalidMetadataMerkleRoot();
        }

        ETHERNALS_METADATA = EthernalsMetadata(ethernalsMetadata_);
        ROOT = root_;
    }

    function verifyAndSetMetadata(uint256[] calldata tokenIds, Metadata[] calldata metadata, bytes32[] calldata metadataProof) external {
        bytes32 leaf = keccak256(abi.encode(tokenIds, metadata));
        if (metadataSet[leaf]) {
            return;
        }

        if (!metadataProof.verifyCalldata(ROOT, leaf)) {
            revert InvalidMetadataMerkleProof();
        }

        metadataSet[leaf] = true;

        ETHERNALS_METADATA.setMetadata(tokenIds, metadata);

        emit MetadataSet(tokenIds, metadata);
    }
}
