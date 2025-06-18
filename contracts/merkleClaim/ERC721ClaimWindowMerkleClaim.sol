// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IERC721Mintable} from "@animoca/ethereum-contracts/contracts/token/ERC721/interfaces/IERC721Mintable.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";

/**
 * @title ERC721 Claim Window Merkle Claim Contract
 * @dev This contract allows users to claim rewards by claim window based on a Merkle proof, which verifies that they are
 * @dev entitled to the rewards without revealing the entire list of recipients.
 */
contract ERC721ClaimWindowMerkleClaim is ForwarderRegistryContext, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    /// @notice The return values of canClaim() function.
    enum ClaimError {
        NoError,
        EpochIdNotExists,
        OutOfClaimWindow,
        AlreadyClaimed,
        ExceededMintSupply
    }

    /// @notice The claim window struct.
    struct ClaimWindow {
        bytes32 merkleRoot;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice The IERC721Mintable reward contract.
    IERC721Mintable public immutable REWARD_CONTRACT;

    /// @notice The max number of tokens to be minted.
    uint256 public immutable MINT_SUPPLY;

    /// @notice The total number of tokens that have been claimed.
    uint256 public noOfTokensClaimed;

    /// @notice Mapping from the epoch ID to the claim window.
    mapping(bytes32 epochId => ClaimWindow) public claimWindows;

    /// @notice Mapping from receipient address to the claim state.
    mapping(address recipient => bool claimed) public claimed;

    /// @notice Event emitted when a claim window is set.
    /// @param epochId The unique epoch ID associated with the specified claim window.
    /// @param merkleRoot The merkle root in the claim window.
    /// @param startTime The start time of the claim window.
    /// @param endTime The end time of the claim window.
    event EpochMerkleRootSet(bytes32 indexed epochId, bytes32 indexed merkleRoot, uint256 startTime, uint256 indexed endTime);

    /// @notice Event emitted when a reward is claimed.
    /// @param epochId The unique epoch ID associated with the claim window.
    /// @param recipient The recipient of the reward.
    /// @param tokenId The claimed tokenId.
    event RewardClaimed(bytes32 indexed epochId, address indexed recipient, uint256 indexed tokenId);

    /// @notice Error thrown when the reward has already been claimed.
    error AlreadyClaimed(bytes32 epochId, address recipient);

    /// @notice Error thrown when the proof provided for the claim is invalid.
    error InvalidProof(bytes32 epochId, address recipient);

    /// @notice Error thrown when the claim window is closed or has not yet opened.
    error OutOfClaimWindow(bytes32 epochId, uint256 currentTime);

    /// @notice Error thrown when the number of tokens claimed exceeds the mint supply.
    error ExceededMintSupply();

    /// @notice Error thrown when the epoch ID already exists.
    error EpochIdAlreadyExists(bytes32 epochId);

    /// @notice Error thrown when the epoch ID does not exist.
    error EpochIdNotExists(bytes32 epochId);

    /// @notice Error thrown when the claim window is invalid.
    error InvalidClaimWindow(uint256 startTime, uint256 endTime, uint256 currentTime);

    /**
     * @notice Constructor for the ERC721ClaimWindowMerkleClaim contract.
     * @param rewardContract The IERC721Mintable reward contract.
     * @param _forwarderRegistry The forwarder registry contract.
     */
    constructor(
        uint256 mintSupply,
        IERC721Mintable rewardContract,
        IForwarderRegistry _forwarderRegistry
    ) ForwarderRegistryContext(_forwarderRegistry) ContractOwnership(msg.sender) {
        MINT_SUPPLY = mintSupply;
        REWARD_CONTRACT = rewardContract;
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
     * @notice Sets the merkle root for a specific epoch with start and end time.
     * @dev Reverts if _msgSender() is not the owner.
     * @dev Reverts if the epoch ID has already been set.
     * @dev Emits a {EpochMerkleRootSet} event.
     * @param epochId The epoch ID for the claim.
     * @param merkleRoot The Merkle root of the claim.
     * @param startTime The start time of the claim window.
     * @param endTime The end time of the claim window.
     */
    function setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        if (startTime >= endTime || endTime <= block.timestamp) {
            revert InvalidClaimWindow(startTime, endTime, block.timestamp);
        }

        if (claimWindows[epochId].merkleRoot != bytes32(0)) {
            revert EpochIdAlreadyExists(epochId);
        }

        claimWindows[epochId] = ClaimWindow(merkleRoot, startTime, endTime);

        emit EpochMerkleRootSet(epochId, merkleRoot, startTime, endTime);
    }

    /**
     * @notice Claims the reward for a specific epoch.
     * @dev Reverts if the claim window has not been set.
     * @dev Reverts if the claim window is closed or has not yet opened.
     * @dev Reverts if the reward has already been claimed.
     * @dev Reverts if the proof provided for the claim is invalid.
     * @dev Reverts if the total number of claims exceeds the mint supply.
     * @dev Emits a {RewardClaimed} event.
     * @param epochId The epoch ID for the claim.
     * @param proof The Merkle proof for the claim.
     * @param recipient The recipient of the reward.
     */
    function claim(bytes32 epochId, bytes32[] calldata proof, address recipient) external {
        uint256 tokensClaimed = noOfTokensClaimed;
        ClaimWindow storage claimWindow = claimWindows[epochId];
        ClaimError canClaimResult = _canClaim(claimWindow, recipient, tokensClaimed);

        if (canClaimResult == ClaimError.EpochIdNotExists) {
            revert EpochIdNotExists(epochId);
        } else if (canClaimResult == ClaimError.OutOfClaimWindow) {
            revert OutOfClaimWindow(epochId, block.timestamp);
        } else if (canClaimResult == ClaimError.AlreadyClaimed) {
            revert AlreadyClaimed(epochId, recipient);
        } else if (canClaimResult == ClaimError.ExceededMintSupply) {
            revert ExceededMintSupply();
        }

        bytes32 leaf = keccak256(abi.encodePacked(epochId, recipient));
        if (!proof.verify(claimWindow.merkleRoot, leaf)) {
            revert InvalidProof(epochId, recipient);
        }

        uint256 tokenId = tokensClaimed + 1;
        noOfTokensClaimed = tokenId;
        claimed[recipient] = true;
        REWARD_CONTRACT.safeMint(recipient, tokenId, "");

        emit RewardClaimed(epochId, recipient, tokenId);
    }

    /**
     * @notice
     * Checks if a recipient can claim a reward for a given epoch id
     */
    function canClaim(bytes32 epochId, address recipient) public view returns (ClaimError) {
        return _canClaim(claimWindows[epochId], recipient, noOfTokensClaimed);
    }

    /**
     * @notice Checks if a recipient can claim a reward for a given ClaimWindow and number of tokens claimed.
     * 1) Returns ClaimError.EpochIdNotExists if merkle root of the claim window has not been set,
     * 2) Returns ClaimError.OutOfClaimWindow if current time is beyond start time and end time of the claim window,
     * 3) Returns ClaimError.AlreadyClaimed if recipent has already claimed,
     * 4) Returns ClaimError.ExceededMintSupply if number of token claimed equals to total supply, and
     * 5) Returns ClaimError.NoError otherwise.
     */
    function _canClaim(ClaimWindow storage claimWindow, address recipient, uint256 tokensClaimed) internal view returns (ClaimError) {
        if (claimWindow.merkleRoot == bytes32(0)) {
            return ClaimError.EpochIdNotExists;
        }
        if (block.timestamp < claimWindow.startTime || block.timestamp > claimWindow.endTime) {
            return ClaimError.OutOfClaimWindow;
        }
        if (claimed[recipient]) {
            return ClaimError.AlreadyClaimed;
        }
        if (tokensClaimed == MINT_SUPPLY) {
            return ClaimError.ExceededMintSupply;
        }

        return ClaimError.NoError;
    }
}
