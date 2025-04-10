// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {PointsArena} from "../../arena/PointsArena.sol";

contract PointsArenaMock is PointsArena {
    constructor(
        uint256 price,
        uint256 commissionRate,
        address messageSigner,
        address payable payoutWallet,
        address points,
        bytes32 consumeReasonCode,
        bytes32 rewardReasonCode,
        bytes32 refundReasonCode,
        bytes32 commissionReasonCode,
        IForwarderRegistry forwarderRegistry
    )
        PointsArena(
            price,
            commissionRate,
            messageSigner,
            payoutWallet,
            points,
            consumeReasonCode,
            rewardReasonCode,
            refundReasonCode,
            commissionReasonCode,
            forwarderRegistry
        )
    {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
