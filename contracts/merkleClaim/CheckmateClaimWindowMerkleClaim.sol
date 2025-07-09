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
import {EthernalsMetadataSetter} from "../ethernals/EthernalsMetadataSetter.sol";
import {Metadata} from "../ethernals/EthernalsMetadata.sol";

contract CheckmateClaimWindowMerkleClaim is ForwarderRegistryContext, ContractOwnership {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice The return values of canClaim() function.
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

    /// @notice a reference to checkmate token contract
    IERC20SafeTransfers public immutable CHECKMATE_TOKEN;

    /// @notice a reference to ethernals contract
    IERC721 public immutable ETHERNALS;

    /// @notice a reference to ethernals metadata setter contract
    EthernalsMetadataSetter public immutable ETHERNALS_METADATA_SETTER;

    /// @notice a reference to staking pool contract
    address public immutable STAKING_POOL;

    /// @notice Store the payout wallet address for transfering checkmate token
    address public payoutWallet;

    /// @notice Mapping from the epoch ID to the claim window.
    mapping(bytes32 epochId => ClaimWindow) public claimWindows;

    /// @notice leaf hash to claimed state
    mapping(bytes32 leaf => bool claimed) public claimed;

    /// @notice Event emitted when a claim window is set.
    /// @param epochId The unique epoch ID associated with the specified claim window.
    /// @param merkleRoot The merkle root in the claim window.
    /// @param startTime The start time of the claim window.
    /// @param endTime The end time of the claim window.
    event EpochMerkleRootSet(bytes32 indexed epochId, bytes32 indexed merkleRoot, uint256 startTime, uint256 indexed endTime);

    /// @notice Emitted when a new payout wallet is set.
    /// @param newPayoutWallet The new payout wallet.
    event PayoutWalletSet(address indexed newPayoutWallet);

    /// @notice Emitted when a payout is claimed.
    /// @param epochId The unique epoch ID associated with the claim window.
    /// @param recipient The recipient of the checkmate token.
    /// @param amount The amount of checkmate token is claimed.
    event PayoutClaimed(bytes32 indexed epochId, address indexed recipient, uint256 indexed amount);

    /// @notice Thrown when the checkmate token contract address is zero.
    error InvalidCheckmateToken();

    /// @notice Thrown when the ethernals contract address is zero.
    error InvalidEthernals();

    /// @notice Thrown when the ethernals metadat setter contract address is zero.
    error InvalidEthernalsMetadataSetter();

    /// @notice Thrown when the staking pool address is zero.
    error InvalidStakingPool();

    /// @notice Thrown when the payout wallet address is zero.
    error InvalidPayoutWallet();

    /// @notice Thrown when the merkle root does not exist.
    /// @param root The root.
    error MerkleRootNotExists(bytes32 root);

    /// @notice Error thrown when the claim window is invalid.
    error InvalidClaimWindow(uint256 startTime, uint256 endTime, uint256 currentTime);

    /// @notice Error thrown when the epoch ID already exists.
    error EpochIdAlreadyExists(bytes32 epochId);

    error InvalidProof(bytes32 epochId, address recipient);

    /// @notice Thrown when checkmate token transfer failed.
    /// @param payoutWallet The wallet sending out the checkmate token.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of the claim.
    error TransferFailed(address payoutWallet, address recipient, uint256 amount);

    /// @notice Error thrown when the epoch ID does not exist.
    error EpochIdNotExists(bytes32 epochId);

    /// @notice Error thrown when the claim window is closed or has not yet opened.
    error OutOfClaimWindow(bytes32 epochId, uint256 currentTime);

    /// @notice Error thrown when the leaf has already been claimed.
    error AlreadyClaimed(bytes32 epochId, bytes32 leaf);

    constructor(
        address checkmateToken_,
        address ethernals_,
        address ethernalsMetadataSetter_,
        address stakingPool_,
        address payoutWallet_,
        IForwarderRegistry forwarderRegistry_
    ) ForwarderRegistryContext(forwarderRegistry_) ContractOwnership(msg.sender) {
        if (checkmateToken_ == address(0)) {
            revert InvalidCheckmateToken();
        }
        if (ethernals_ == address(0)) {
            revert InvalidEthernals();
        }
        if (ethernalsMetadataSetter_ == address(0)) {
            revert InvalidEthernalsMetadataSetter();
        }
        if (stakingPool_ == address(0)) {
            revert InvalidStakingPool();
        }
        if (payoutWallet_ == address(0)) {
            revert InvalidPayoutWallet();
        }

        CHECKMATE_TOKEN = IERC20SafeTransfers(checkmateToken_);
        ETHERNALS = IERC721(ethernals_);
        ETHERNALS_METADATA_SETTER = EthernalsMetadataSetter(ethernalsMetadataSetter_);
        STAKING_POOL = stakingPool_;
        payoutWallet = payoutWallet_;
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

    /// @notice Sets the new payout wallet.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {PayoutWalletSet} event.
    /// @param newPayoutWallet The payout wallet to be set.
    function setPayoutWallet(address newPayoutWallet) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        payoutWallet = newPayoutWallet;

        emit PayoutWalletSet(newPayoutWallet);
    }

    function claimAndStake(bytes32 epochId, address recipient, uint256 amount, bytes32[] calldata proof) external {
        _claimAndStake(epochId, recipient, amount, keccak256(abi.encodePacked(epochId, recipient, amount)), proof);
    }

    function claimAndStakeWithEthernals(
        bytes32 epochId,
        address recipient,
        uint256 amount,
        uint256[] calldata tokenIds,
        Metadata[] calldata metadata,
        bytes32[] calldata claimProof,
        bytes32[] calldata metadataProof,
        bool enableSetMetadata
    ) external {
        if (enableSetMetadata) {
            ETHERNALS_METADATA_SETTER.verifyAndSetMetadata(tokenIds, metadata, metadataProof);
        }

        _claimAndStake(
            epochId,
            recipient,
            amount + _calculateBonus(recipient, tokenIds, metadata),
            keccak256(abi.encodePacked(epochId, recipient, amount, tokenIds, abi.encode(metadata))),
            claimProof
        );
    }

    function _calculateBonus(address recipient, uint256[] calldata tokenIds, Metadata[] calldata metadata) internal view returns (uint256 bonus) {
        uint256 ownedCount;
        uint256 len = tokenIds.length;
        for (uint256 i; i < len; ++i) {
            if (ETHERNALS.ownerOf(tokenIds[i]) == recipient) {
                bonus += _calculateEthernalsRarityBonus(metadata[i]);
                ++ownedCount;
            }
        }
        bonus += _calculateEthernalsQuantityBonus(ownedCount);
    }

    function _calculateEthernalsRarityBonus(Metadata calldata metadata) internal pure returns (uint256) {
        //TODO: implement correct calculation logic for ethernals boost amount
        if (metadata.background > 0) { // legendary
            return 1000;
        }
        else if (metadata.backgroundElement > 0) { // rare
            return 300;
        }
        return 0;
    }

    function _calculateEthernalsQuantityBonus(uint256 ownedCount) internal pure returns (uint256) {
        // TODO: implement correct calculation logic for ethernals quantity bonus
        if (ownedCount >= 16) {
            return 1000;
        } else if (ownedCount >= 8) {
            return 500;
        } else if (ownedCount >= 4) {
            return 200;
        } else if (ownedCount >= 2) {
            return 100;
        }
        return 0;
    }

    function _validateClaim(bytes32 epochId, address recipient, bytes32 leaf, bytes32[] calldata claimProof) internal view {
        ClaimWindow storage claimWindow = claimWindows[epochId];

        ClaimError canClaimResult = _canClaim(claimWindow, leaf);
        if (canClaimResult == ClaimError.EpochIdNotExists) {
            revert EpochIdNotExists(epochId);
        } else if (canClaimResult == ClaimError.OutOfClaimWindow) {
            revert OutOfClaimWindow(epochId, block.timestamp);
        } else if (canClaimResult == ClaimError.AlreadyClaimed) {
            revert AlreadyClaimed(epochId, leaf);
        }

        if (!claimProof.verifyCalldata(claimWindow.merkleRoot, leaf)) {
            revert InvalidProof(epochId, recipient);
        }
    }

    function _claimAndStake(bytes32 epochId, address recipient, uint256 amount, bytes32 leaf, bytes32[] calldata claimProof) internal {
        _validateClaim(epochId, recipient, leaf, claimProof);

        claimed[leaf] = true;

        address _payoutWallet = payoutWallet;
        bool success = CHECKMATE_TOKEN.safeTransferFrom(_payoutWallet, STAKING_POOL, amount, abi.encode(recipient));
        if (!success) {
            revert TransferFailed(_payoutWallet, recipient, amount);
        }

        emit PayoutClaimed(epochId, recipient, amount);
    }

    function canClaim(bytes32 epochId, address recipient, uint256 amount) public view returns (ClaimError) {
        return _canClaim(claimWindows[epochId], keccak256(abi.encodePacked(epochId, recipient, amount)));
    }

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
