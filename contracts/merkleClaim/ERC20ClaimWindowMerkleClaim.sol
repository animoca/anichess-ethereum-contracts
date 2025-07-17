// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20SafeTransfers} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20SafeTransfers.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";

contract ERC20ClaimWindowMerkleClaim is ForwarderRegistryContext, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    /// @notice The status of the claim
    enum ClaimError {
        NoError, // 0
        EpochIdNotExists, // 1
        OutOfClaimWindow, // 2
        AlreadyClaimed // 3
    }

    /// @notice The claim window struct.
    struct ClaimWindow {
        bytes32 merkleRoot;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice a reference to the reward token contract
    IERC20SafeTransfers public immutable REWARD_TOKEN;

    /// @notice a reference to the staking pool contract
    address public immutable STAKING_POOL;

    /// @notice The address of the token holder wallet.
    address public tokenHolderWallet;

    /// @notice Mapping of the epoch ID to the claim window.
    mapping(bytes32 epochId => ClaimWindow) public claimWindows;

    /// @notice Mapping of leaf hash to claimed state
    mapping(bytes32 leaf => bool claimed) public claimed;

    /// @notice Event emitted when the token holder wallet is set.
    /// @param newTokenHolderWallet The address of the new token holder wallet.
    event TokenHolderWalletSet(address indexed newTokenHolderWallet);

    /// @notice Event emitted when a claim window is set.
    /// @param epochId The unique epoch ID associated with the specified claim window.
    /// @param merkleRoot The merkle root in the claim window.
    /// @param startTime The start time of the claim window.
    /// @param endTime The end time of the claim window.
    event EpochMerkleRootSet(bytes32 indexed epochId, bytes32 indexed merkleRoot, uint256 startTime, uint256 indexed endTime);

    /// @notice Emitted when a payout is claimed.
    /// @param epochId The unique epoch ID associated with the claim window.
    /// @param root The merkle root of the claim window.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of token is claimed.
    event PayoutClaimed(bytes32 indexed epochId, bytes32 indexed root, address indexed recipient, uint256 amount);

    /// @notice Thrown when the reward token contract address is zero.
    error InvalidRewardToken();

    /// @notice Thrown when the staking pool address is zero.
    error InvalidStakingPool();

    /// @notice Thrown when the merkle root is zero.
    error InvalidMerkleRoot();

    /// @notice Error thrown when the claim window is invalid.
    error InvalidClaimWindow(uint256 startTime, uint256 endTime, uint256 currentTime);

    /// @notice Error thrown when the epoch ID already exists.
    error EpochIdAlreadyExists(bytes32 epochId);

    /// @notice Error thrown when the proof provided for the claim is invalid.
    error InvalidProof(bytes32 epochId, address recipient, uint256 amount);

    /// @notice Error thrown when the epoch ID does not exist.
    error EpochIdNotExists(bytes32 epochId);

    /// @notice Error thrown when the claim window is closed or has not yet opened.
    error OutOfClaimWindow(bytes32 epochId, uint256 currentTime);

    /// @notice Error thrown when the leaf has already been claimed.
    error AlreadyClaimed(bytes32 epochId, bytes32 leaf);

    constructor(
        address rewardToken_,
        address stakingPool_,
        address tokenHolderWallet_,
        IForwarderRegistry forwarderRegistry_
    ) ForwarderRegistryContext(forwarderRegistry_) ContractOwnership(msg.sender) {
        if (rewardToken_ == address(0)) {
            revert InvalidRewardToken();
        }
        REWARD_TOKEN = IERC20SafeTransfers(rewardToken_);

        if (stakingPool_ == address(0)) {
            revert InvalidStakingPool();
        }
        STAKING_POOL = stakingPool_;

        tokenHolderWallet = tokenHolderWallet_;
        emit TokenHolderWalletSet(tokenHolderWallet_);
    }

    /**
     * @notice Sets the merkle root for a specific epoch with start and end time.
     * @dev Reverts if _msgSender() is not the owner.
     * @dev Reverts if the merkle root is zero.
     * @dev Reverts if the claim window is invalid.
     * @dev Reverts if the epoch ID has already been set.
     * @dev Emits a {EpochMerkleRootSet} event.
     * @param epochId The epoch ID for the claim.
     * @param merkleRoot The Merkle root of the claim.
     * @param startTime The start time of the claim window.
     * @param endTime The end time of the claim window.
     */
    function setEpochMerkleRoot(bytes32 epochId, bytes32 merkleRoot, uint256 startTime, uint256 endTime) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        if (merkleRoot == bytes32(0)) {
            revert InvalidMerkleRoot();
        }

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
     * @notice Sets the token holder wallet address.
     * @dev Reverts if _msgSender() is not the owner.
     * @dev Emits a {TokenHolderWalletSet} event.
     * @param newTokenHolderWallet The address of the new token holder wallet.
     */
    function setTokenHolderWallet(address newTokenHolderWallet) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        tokenHolderWallet = newTokenHolderWallet;
        emit TokenHolderWalletSet(newTokenHolderWallet);
    }

    /**
     * @notice Claims the payout for a specific epoch and stake.
     * @dev Reverts with {EpochIdNotExists} if epoch id does not exist.
     * @dev Reverts with {OutOfClaimWindow} if current block time is beyond claim window.
     * @dev Reverts with {AlreadyClaimed} if the specified payout has already been claimed.
     * @dev Reverts with {InvalidProof} if the merkle proof has failed the verification.
     * @dev Emits a {PayoutClaimed} event.
     * @param epochId The unique epoch ID associated with the claim window.
     * @param recipient The recipient of the claim.
     * @param amount The amount of the token to be claimed.
     * @param proof The Merkle proof for the claim.
     */
    function claimAndStake(bytes32 epochId, address recipient, uint256 amount, bytes32[] calldata proof) external {
        bytes32 leaf = keccak256(abi.encodePacked(epochId, recipient, amount));
        ClaimWindow storage claimWindow = claimWindows[epochId];

        ClaimError canClaimResult = _canClaim(claimWindow, leaf);
        if (canClaimResult == ClaimError.EpochIdNotExists) {
            revert EpochIdNotExists(epochId);
        } else if (canClaimResult == ClaimError.OutOfClaimWindow) {
            revert OutOfClaimWindow(epochId, block.timestamp);
        } else if (canClaimResult == ClaimError.AlreadyClaimed) {
            revert AlreadyClaimed(epochId, leaf);
        }

        bytes32 root = claimWindow.merkleRoot;
        if (!proof.verifyCalldata(root, leaf)) {
            revert InvalidProof(epochId, recipient, amount);
        }

        claimed[leaf] = true;

        REWARD_TOKEN.safeTransferFrom(tokenHolderWallet, STAKING_POOL, amount, abi.encode(recipient));
        emit PayoutClaimed(epochId, root, recipient, amount);
    }

    /**
     * @notice Checks if a recipient can claim a reward for a given epoch id
     * @param epochId The unique epoch ID associated with the claim window.
     * @param recipient The recipient of the claim.
     * @param amount The amount of the token to be claimed.
     */
    function canClaim(bytes32 epochId, address recipient, uint256 amount) external view returns (ClaimError) {
        return _canClaim(claimWindows[epochId], keccak256(abi.encodePacked(epochId, recipient, amount)));
    }

    /**
     * @notice
     * 1) Returns ClaimError.EpochIdNotExists if merkle root of the claim window has not been set,
     * 2) Returns ClaimError.OutOfClaimWindow if current time is beyond start time and end time of the claim window,
     * 3) Returns ClaimError.AlreadyClaimed if recipient has already claimed,
     * 4) Returns ClaimError.ExceededMintSupply if number of token claimed equals to total supply, and
     * 5) Returns ClaimError.NoError otherwise.
     * @param claimWindow The claim window of the claim.
     * @param leaf The leaf of the claim.
     */

    function _canClaim(ClaimWindow storage claimWindow, bytes32 leaf) internal view returns (ClaimError) {
        if (claimWindow.merkleRoot == bytes32(0)) {
            return ClaimError.EpochIdNotExists;
        }
        if (block.timestamp < claimWindow.startTime || block.timestamp > claimWindow.endTime) {
            return ClaimError.OutOfClaimWindow;
        }
        if (claimed[leaf]) {
            return ClaimError.AlreadyClaimed;
        }

        return ClaimError.NoError;
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
