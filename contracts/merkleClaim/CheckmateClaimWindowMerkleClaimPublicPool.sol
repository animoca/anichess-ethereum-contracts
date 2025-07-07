// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20SafeTransfers} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20SafeTransfers.sol";
import {IERC721} from "@animoca/ethereum-contracts/contracts/token/ERC721/interfaces/IERC721.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {CheckmateClaimWindowMerkleClaim} from "./CheckmateClaimWindowMerkleClaim.sol";

contract CheckmateClaimWindowMerkleClaimPublicPool is CheckmateClaimWindowMerkleClaim {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    constructor(address checkmateToken_, address stakingPool_, address payoutWallet_, IForwarderRegistry forwarderRegistry_) 
        CheckmateClaimWindowMerkleClaim(checkmateToken_, stakingPool_, payoutWallet_, forwarderRegistry_) {}


    function _canClaim(ClaimWindow storage claimWindow, address /* recipient */, uint256 /* amount */, bytes calldata /* data */, bytes32 leaf) internal view override returns (bool) {
        if (claimWindow.merkleRoot == bytes32(0)
            || block.timestamp < claimWindow.startTime
            || block.timestamp > claimWindow.endTime
            || claimed[leaf]
        ) {
            return false;
        }

        return true;
    }

    function _calculateLeafHash(bytes32 epochId, address recipient, uint256 amount, bytes calldata /* data */) internal pure override returns (bytes32) {
        return keccak256(abi.encodePacked(epochId, recipient, amount));
    }
}
