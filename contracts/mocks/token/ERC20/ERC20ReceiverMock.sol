// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20Receiver.sol";

contract ERC20ReceiverMock is IERC20Receiver {
    event ERC20ReceivedMock(address operator, address from, uint256 value, bytes data);
    function onERC20Received(address operator, address from, uint256 value, bytes calldata data) external returns (bytes4) {
        emit ERC20ReceivedMock(operator, from, value, data);
        return 0x4fc35859;
    }
}
