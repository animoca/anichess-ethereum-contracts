// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC1155Mintable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Mintable.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

/**
 * @title Anichess The Missing Orbs Claim Contract
 * @dev This contract allows users to claim rewards based on a Merkle proof, which verifies that they are
 * @dev entitled to the rewards without revealing the entire list of recipients.
 * @notice This contract uses a Merkle Tree to allow users to claim tokens if they possess a valid proof.
 */
contract AnichessERC1155MerkleClaim is ForwarderRegistryContext {
    using MerkleProof for bytes32[];

    /// @notice Mapping to store claim status to prevent double claiming.
    mapping(bytes32 => bool) public claimStatus;

    /// @notice The Merkle root of the claim.
    bytes32 public immutable MERKLE_ROOT;
    /// @notice The ERC1155Mintable reward contract interface.
    IERC1155Mintable public immutable REWARD_CONTRACT;

    /// @notice Event emitted when a payout is claimed.
    event PayoutClaimed(bytes32 indexed epochId, address indexed recipient, uint256[] ids, uint256[] values);

    /// @notice Error thrown when the payout has already been claimed.
    error AlreadyClaimed(address recipient, uint256[] ids, uint256[] values, bytes32 epochId);

    /// @notice Error thrown when the proof provided for the claim is invalid.
    error InvalidProof(address recipient, uint256[] ids, uint256[] values, bytes32 epochId);

    /**
     * @dev Initializes the contract by setting the reward token contract and the forwarder registry.
     * @param merkleRoot The Merkle root to use for the claims.
     * @param rewardContract The ERC1155Mintable token contract address.
     * @param forwarderRegistry The address of the forwarder registry contract.
     */
    constructor(
        bytes32 merkleRoot,
        IERC1155Mintable rewardContract,
        IForwarderRegistry forwarderRegistry
    ) ForwarderRegistryContext(forwarderRegistry) {
        MERKLE_ROOT = merkleRoot;
        REWARD_CONTRACT = rewardContract;
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }

    /**
     * @notice Allows eligible users to claim their rewards using a Merkle proof.
     * @dev Claims the payout based on the proof provided, marks it as claimed, and mints the tokens.
     * @param epochId The epoch ID for the claim.
     * @param proof The Merkle proof for the claim.
     * @param recipient The address of the recipient.
     * @param ids The array of token IDs to claim.
     * @param values The array of token values to claim.
     * @dev Throws if the claim has already been claimed.
     * @dev Throws if the proof is invalid.
     */
    function claim(bytes32 epochId, bytes32[] memory proof, address recipient, uint256[] memory ids, uint256[] memory values) external {
        bytes32 leaf = keccak256(abi.encodePacked(recipient, ids, values, epochId));

        if (claimStatus[leaf]) revert AlreadyClaimed(recipient, ids, values, epochId);
        if (!proof.verify(MERKLE_ROOT, leaf)) revert InvalidProof(recipient, ids, values, epochId);

        claimStatus[leaf] = true;
        REWARD_CONTRACT.safeBatchMint(recipient, ids, values, "");

        emit PayoutClaimed(epochId, recipient, ids, values);
    }
}
