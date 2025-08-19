// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {AbstractGaslessPaymaster} from "../../paymaster/AbstractGaslessPaymaster.sol";

contract MockContractWithoutReceive {
    function withdrawFromPaymaster(address payable paymaster, uint256 amount) external {
        AbstractGaslessPaymaster(paymaster).withdraw(amount);
    }
}
