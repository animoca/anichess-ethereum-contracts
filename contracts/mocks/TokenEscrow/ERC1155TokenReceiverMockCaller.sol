// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IOperatorFilterRegistry} from "@animoca/ethereum-contracts/contracts/token/royalty/interfaces/IOperatorFilterRegistry.sol";
import {IERC1155} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155.sol";
import {IERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155TokenReceiver.sol";

/// @title ORBNFTMock Contract
/// @notice Mock contract for testing purposes, extends the ORBNFT contract.

contract ERC1155TokenReceiverMockCaller {
    bytes4 public onERC1155ReceivedResult = "0x";
    bytes4 public onERC1155BatchReceivedResult = "0x";

    /// @notice Test function to call the onERC1155Received function of the Inventory contract.
    function testOnERC1155Received(address tokenReceiverAddress_, address from, uint256 id, uint256 value, bytes calldata) external {
        bytes4 receipt = IERC1155TokenReceiver(tokenReceiverAddress_).onERC1155Received(address(this), from, id, value, "0x");
        onERC1155ReceivedResult = receipt;
    }

    /// @notice Test function to call the onERC1155BatchReceived function of the Inventory contract.
    function testOnERC1155BatchReceived(
        address tokenReceiverAddress_,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata
    ) external {
        bytes4 receipt = IERC1155TokenReceiver(tokenReceiverAddress_).onERC1155BatchReceived(address(this), from, ids, values, "0x");
        onERC1155BatchReceivedResult = receipt;
    }
}
