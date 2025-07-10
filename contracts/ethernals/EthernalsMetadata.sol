// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

struct Metadata {
    uint256 hairStyle;
    uint256 facialHair;
    uint256 expression;
    uint256 tattoo;
    uint256 outfit;
    uint256 material;
    uint256 chessPiece;
    uint256 background;
    uint256 element;
}

contract EthernalsMetadata {
    address public immutable METADATA_SETTER;
    mapping(uint256 tokenId => Metadata) public tokenIdMetadata;

    error InvalidMetadataSetter();
    error MetadataSetterOnly();

    constructor(address metadataSetter_) {
        if (metadataSetter_ == address(0)) {
            revert InvalidMetadataSetter();
        }
        METADATA_SETTER = metadataSetter_;
    }

    function setMetadata(uint256[] calldata tokenIds, Metadata[] calldata metadata) external {
        if (msg.sender != METADATA_SETTER) {
            revert MetadataSetterOnly();
        }

        uint256 len = tokenIds.length;
        for (uint256 i; i < len; ++i) {
            tokenIdMetadata[tokenIds[i]] = metadata[i];
        }
    }
}
