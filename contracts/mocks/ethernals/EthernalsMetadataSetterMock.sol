// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Metadata} from "../../ethernals/EthernalsMetadata.sol";

contract EthernalsMetadataSetterMock {
    event MetadataSet();

    function verifyAndSetMetadata(uint256[] calldata, Metadata[] calldata, bytes32[] calldata) external {
        emit MetadataSet();
    }
}
