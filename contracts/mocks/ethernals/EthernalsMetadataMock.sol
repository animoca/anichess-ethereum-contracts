// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Metadata} from "../../ethernals/EthernalsMetadata.sol";

contract EthernalsMetadataMock {
    event MetadataSet();

    function setMetadata(uint256[] calldata, Metadata[] calldata) external {
        emit MetadataSet();
    }
}
