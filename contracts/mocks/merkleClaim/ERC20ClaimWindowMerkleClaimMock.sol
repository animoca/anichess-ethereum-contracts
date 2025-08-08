// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20ClaimWindowMerkleClaim} from "../../merkleClaim/ERC20ClaimWindowMerkleClaim.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC20ClaimWindowMerkleClaimMock is ERC20ClaimWindowMerkleClaim {
    constructor(
        address rewardToken_,
        address stakingPool_,
        address tokenHolderWallet_,
        IForwarderRegistry forwarderRegistry_
    ) ERC20ClaimWindowMerkleClaim(rewardToken_, stakingPool_, tokenHolderWallet_, forwarderRegistry_) {}

    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
