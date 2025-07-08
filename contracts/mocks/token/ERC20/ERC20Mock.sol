// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract ERC20Mock {
    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowances;

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        // require(balances[msg.sender] >= amount, "Insufficient balance");
        // balances[msg.sender] -= amount;
        // balances[recipient] += amount;
        // emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function safeTransfer(address to, uint256 value, bytes calldata data) external returns (bool) {
        // require(to != address(0), "Transfer to the zero address");
        // require(balances[msg.sender] >= value, "Insufficient balance");
        // balances[msg.sender] -= value;
        // balances[to] += value;
        // emit Transfer(msg.sender, to, value);
        return true;
    }

    function safeTransferFrom(address from, address to, uint256 value, bytes calldata data) external returns (bool) {
        // require(to != address(0), "Transfer to the zero address");
        // require(balances[from] >= value, "Insufficient balance");
        // require(allowances[from][msg.sender] >= value, "Allowance exceeded");
        // balances[from] -= value;
        // balances[to] += value;
        // allowances[from][msg.sender] -= value;
        // emit Transfer(from, to, value);
        return true;
    }
}
