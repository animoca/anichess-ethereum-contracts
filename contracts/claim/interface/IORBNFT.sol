// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IORBNFT {
    function safeBatchMint(address to, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external;
}
