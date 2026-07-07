// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Gambit} from "../../game/Gambit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract GambitMock is Gambit {
    constructor(
        address payable payoutAddress,
        IERC20 buyInToken,
        uint256 buyIn_,
        uint256 platformFee_,
        IForwarderRegistry forwarderRegistry
    ) Gambit(payoutAddress, buyInToken, buyIn_, platformFee_, forwarderRegistry) {}

    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
