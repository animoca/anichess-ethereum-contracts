// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Shop} from "../../sale/Shop.sol";
import {IPointsV2} from "../../points/interface/IPointsV2.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ShopMock is Shop {
    constructor(IPointsV2 points, address payable payoutWallet, IForwarderRegistry forwarderRegistry) Shop(points, payoutWallet, forwarderRegistry) {}

    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
