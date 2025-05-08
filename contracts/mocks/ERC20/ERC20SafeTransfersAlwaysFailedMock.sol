// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.28;

import {IERC20SafeTransfers} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20SafeTransfers.sol";
contract ERC20SafeTransfersAlwaysFailedMock is IERC20SafeTransfers {
    function safeTransfer(address, uint256, bytes calldata) external pure returns (bool) {
        return false;
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure returns (bool) {
        return false;
    }
}
