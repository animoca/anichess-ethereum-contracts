// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20Receiver.sol";

contract ERC20Mock {
    event TransferMock(address indexed from, address indexed to, uint256 indexed value);
    // mapping(address => uint256) private balances;
    // mapping(address => mapping(address => uint256)) private allowances;
    // function balanceOf(address account) external view returns (uint256) {
    //     return balances[account];
    // }
    // function transfer(address recipient, uint256 amount) external returns (bool) {
    //     // require(balances[msg.sender] >= amount, "Insufficient balance");
    //     // balances[msg.sender] -= amount;
    //     // balances[recipient] += amount;
    //     // emit Transfer(msg.sender, recipient, amount);
    //     return true;
    // }
    // function safeTransfer(address to, uint256 value, bytes calldata data) external returns (bool) {
    //     // require(to != address(0), "Transfer to the zero address");
    //     // require(balances[msg.sender] >= value, "Insufficient balance");
    //     // balances[msg.sender] -= value;
    //     // balances[to] += value;
    //     // emit Transfer(msg.sender, to, value);
    //     return true;
    // }
    function safeTransferFrom(address from, address to, uint256 value, bytes calldata data) external returns (bool) {
        if (from == address(0)) {
            return false;
        }

        IERC20Receiver(to).onERC20Received(address(this), from, value, data);

        emit TransferMock(from, to, value);
        return true;
    }
}
