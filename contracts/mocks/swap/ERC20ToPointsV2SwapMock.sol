// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20ToPointsV2Swap} from "../../swap/ERC20ToPointsV2Swap.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC20ToPointsV2SwapMock is ERC20ToPointsV2Swap {
    constructor(
        address token_,
        address pointsV2_,
        uint256 initialRate,
        address payable payoutWallet_,
        IForwarderRegistry forwarderRegistry_
    ) ERC20ToPointsV2Swap(token_, pointsV2_, initialRate, payoutWallet_, forwarderRegistry_) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
