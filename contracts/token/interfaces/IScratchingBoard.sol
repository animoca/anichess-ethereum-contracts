// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IScratchingBoard {
    function mint(address to) external returns (uint256 tokenId);
    function burn(uint256 tokenId) external;
}
