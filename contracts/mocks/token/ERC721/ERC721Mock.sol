// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract ERC721Mock {
    address public tokenOwner;

    function setTokenOwner(address _tokenOwner) external {
        tokenOwner = _tokenOwner;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        if (tokenId < 100) {
            return tokenOwner;
        }

        return address(0);
    }
}
