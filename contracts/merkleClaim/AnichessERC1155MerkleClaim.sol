// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC1155Mintable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Mintable.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title Anichess The Missing Orbs Claim Contract
 * @dev This contract allows users to claim rewards based on a Merkle proof, which verifies that they are
 * @dev entitled to the rewards without revealing the entire list of recipients.
 * @notice This contract uses a Merkle Tree to allow users to claim tokens if they possess a valid proof.
 */
contract AnichessERC1155MerkleClaim is ForwarderRegistryContext, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    /// @notice The claim window struct.
    struct ClaimWindow {
        bytes32 merkleRoot;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice The ERC1155Mintable reward contract interface.
    IERC1155Mintable public immutable REWARD_CONTRACT;

    /// @notice The total number of tokens that can be minted in this contract.
    uint256 public immutable MINT_SUPPLY;

    /// @notice The total number of tokens that have been claimed.
    uint256 public noOfTokensClaimed;

    /// @notice The claimInfos , mapping from the epoch ID to the claim window.
    mapping(bytes32 => ClaimWindow) public claimWindows;

    /// @notice Mapping from leafhash to store claim status to prevent double claiming.
    mapping(bytes32 => bool) public claimStatus;

    /// @notice Event emitted when a payout is claimed.
    event PayoutClaimed(bytes32 indexed epochId, address indexed recipient, uint256 id, uint256 value);

    /// @notice Event emitted when a claim window is set.
    event SetEpochMerkleRoot(bytes32 indexed epochId, bytes32 indexed merkleRoot, uint256 startTime, uint256 endTime);

    /// @notice Error thrown when the payout has already been claimed.
    error AlreadyClaimed(bytes32 epochId, address recipient, uint256 id, uint256 value);

    /// @notice Error thrown when the proof provided for the claim is invalid.
    error InvalidProof(bytes32 epochId, address recipient, uint256 id, uint256 value);

    /// @notice Error thrown when the claim window is closed or has not yet opened.
    error OutOfClaimWindow(bytes32 epochId, uint256 currentTime);

    /// @notice Error thrown when the number of tokens claimed exceeds the mint supply.
    error ExceededMintSupply(bytes32 epochId, address recipient, uint256 amount, uint256 totalClaimed);

    /// @notice Error thrown when the claim window has already been set.
    error EpochIdAlreadySet(bytes32 epochId);

    /// @notice Error thrown when the epoch ID is invalid.
    error EpochIdNotSet(bytes32 epochId);

    /**
     * @notice Constructor for the AnichessERC1155MerkleClaim contract.
     * @param mintSupply The total number of tokens that can be minted in this contract.
     * @param rewardContract The ERC1155Mintable reward contract interface.
     * @param forwarderRegistry The forwarder registry contract.
     */
    constructor(
        uint256 mintSupply,
        IERC1155Mintable rewardContract,
        IForwarderRegistry forwarderRegistry
    ) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(msg.sender) {
        REWARD_CONTRACT = rewardContract;
        MINT_SUPPLY = mintSupply;
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }

    /**
     * @notice Sets the merkle root for a specific epoch.
     * @dev Only the contract owner can set the claim window.
     * @param epochId The epoch ID for the claim.
     * @param startTime The start time of the claim window.
     * @param endTime The end time of the claim window.
     * @param merkleRoot The Merkle root of the claim.
     * @dev Throws if the claim window has already been set.
     */
    function setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        // Ensure the epochId has not been set before.
        if (claimWindows[epochId].merkleRoot != bytes32(0)) {
            revert EpochIdAlreadySet(epochId);
        }

        claimWindows[epochId] = ClaimWindow(merkleRoot, startTime, endTime);

        emit SetEpochMerkleRoot(epochId, merkleRoot, startTime, endTime);
    }

    /**
     * @notice Claims the payout for a specific epoch.
     * @param epochId The epoch ID for the claim.
     * @param proof The Merkle proof for the claim.
     * @param recipient The recipient of the payout.
     * @param id The ID of the token to claim.
     * @param value The value of the token to claim.
     * @dev Throws if the claim window has not been set.
     * @dev Throws if the claim window is closed or has not yet opened.
     * @dev Throws if the proof provided for the claim is invalid.
     * @dev Throws if the payout has already been claimed.
     * @dev Throws if the number of tokens claimed exceeds the mint supply.
     */
    function claim(bytes32 epochId, bytes32[] calldata proof, address recipient, uint256 id, uint256 value) external {
        ClaimWindow storage claimWindow = claimWindows[epochId];
        if (claimWindow.merkleRoot == bytes32(0)) {
            revert EpochIdNotSet(epochId);
        }

        if (block.timestamp < claimWindow.startTime || block.timestamp > claimWindow.endTime) {
            revert OutOfClaimWindow(epochId, block.timestamp);
        }

        bytes32 leaf = keccak256(abi.encodePacked(epochId, recipient, id, value));
        if (!proof.verify(claimWindow.merkleRoot, leaf)) revert InvalidProof(epochId, recipient, id, value);

        if (claimStatus[leaf]) revert AlreadyClaimed(epochId, recipient, id, value);

        uint256 prevNoOfTokensClaimed = noOfTokensClaimed;
        if (prevNoOfTokensClaimed + value > MINT_SUPPLY) {
            revert ExceededMintSupply(epochId, recipient, value, prevNoOfTokensClaimed + value);
        }

        noOfTokensClaimed = prevNoOfTokensClaimed + value;
        claimStatus[leaf] = true;

        REWARD_CONTRACT.safeMint(recipient, id, value, "");

        emit PayoutClaimed(epochId, recipient, id, value);
    }
}
