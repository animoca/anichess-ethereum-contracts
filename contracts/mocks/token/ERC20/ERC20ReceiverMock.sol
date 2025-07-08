// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IERC20Receiver} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20Receiver.sol";

contract ERC20ReceiverMock is IERC20Receiver {
    function onERC20Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return 0x4fc35859;
    }
}
