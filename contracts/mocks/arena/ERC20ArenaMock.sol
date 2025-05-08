// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ERC20Arena} from "../../arena/ERC20Arena.sol";

contract ERC20ArenaMock is ERC20Arena {
    constructor(
        uint256 price,
        uint256 commissionRate,
        address messageSigner,
        address payable payoutWallet,
        address erc20,
        IForwarderRegistry forwarderRegistry
    ) ERC20Arena(price, commissionRate, messageSigner, payoutWallet, erc20, forwarderRegistry) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
