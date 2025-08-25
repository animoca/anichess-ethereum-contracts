// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

interface IPointsV2 {
    function nonces(address holder) external view returns (uint256);
    function balances(address holder) external view returns (uint256);
    function allowances(address holder, address spender) external view returns (uint256);
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external;
    function consume(address holder, uint256 amount, uint256 deadline, bytes calldata signature) external;
    function consume(address holder, uint256 amount) external;
    function approve(address spender, uint256 amount) external;
    function permit(address holder, address spender, uint256 value, uint256 deadline, bytes calldata signature) external;
}
