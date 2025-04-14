// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20MerkleClaim} from "../../merkleClaim/ERC20MerkleClaim.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC20MerkleClaimMock is ERC20MerkleClaim {
    constructor(
        address rewardContract_,
        address stakingContract_,
        address payoutWallet_,
        address treasuryWallet_,
        uint96 fee_,
        IForwarderRegistry forwarderRegistry_
    ) ERC20MerkleClaim(rewardContract_, stakingContract_, payoutWallet_, treasuryWallet_, fee_, forwarderRegistry_) {}

    /// @notice Internal function to access the current msg.sender.
    /// @return The current msg.sender value.
    function __msgSender() external view returns (address) {
        return _msgSender();
    }

    /// @notice Internal function to access the current msg.data.
    /// @return The current msg.data value.
    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
