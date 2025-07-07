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

abstract contract CheckmateClaimWindowMerkleClaim is ForwarderRegistryContext, ContractOwnership {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice The claim window struct.
    struct ClaimWindow {
        bytes32 merkleRoot;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice a reference to checkmate token contract
    IERC20SafeTransfers public immutable CHECKMATE_TOKEN;

    /// @notice a reference to staking pool contract
    address public immutable STAKING_POOL;

    /// @notice Mapping from the epoch ID to the claim window.
    mapping(bytes32 epochId => ClaimWindow) public claimWindows;

    /// @notice leaf hash to claimed state
    mapping(bytes32 leaf => bool claimed) public claimed;

    /// @notice Store the payout wallet address for transfering checkmate token
    address public payoutWallet;

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

    /// @notice Thrown when failed claim validation.
    error InvalidClaim(bytes32 epochId, address recipient, uint256 amount, bytes32[] proof, bytes data);

    /// @notice Thrown when the checkmate token contract address is zero.
    error InvalidCheckmateToken();

    /// @notice Thrown when the staking pool address is zero.
    error InvalidStakingPool();

    /// @notice Thrown when the payout wallet address is zero.
    error InvalidPayoutWallet();

    /// @notice Error thrown when the claim window is invalid.
    error InvalidClaimWindow(uint256 startTime, uint256 endTime, uint256 currentTime);

    /// @notice Error thrown when the epoch ID already exists.
    error EpochIdAlreadyExists(bytes32 epochId);

    /// @notice Thrown when a proof cannot be verified.
    /// @param epochId The epoch ID for the claim.
    /// @param recipient The recipient of the claim.
    /// @param amount The claim amount for recipient.
    error InvalidProof(bytes32 epochId, address recipient, uint256 amount);
    
    /// @notice Thrown when checkmate token transfer failed.
    /// @param payoutWallet The wallet sending out the checkmate token.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of the claim.
    error TransferFailed(address payoutWallet, address recipient, uint256 amount);

    /// @notice Error thrown when the leaf has already been claimed.
    error AlreadyClaimed(bytes32 epochId, bytes32 leaf);

    /**
     * 
     * @param checkmateToken_ The checkmate token contract address.
     * @param stakingPool_ The staking pool contract address.
     * @param payoutWallet_ The payout wallet address.
     * @dev Reverts with {InvalidCheckmateToken} if the checkmate token address is zero.
     * @dev Reverts with {InvalidStakingPool} if the staking pool address is zero.
     * @dev Reverts with {InvalidPayoutWallet} if the payout wallet address is zero.
     */
    constructor(address checkmateToken_, address stakingPool_, address payoutWallet_, IForwarderRegistry forwarderRegistry_) ForwarderRegistryContext(forwarderRegistry_) ContractOwnership(msg.sender) {
        if (checkmateToken_ == address(0)) {
            revert InvalidCheckmateToken();
        }
        if (stakingPool_ == address(0)) {
            revert InvalidStakingPool();
        }
        if (payoutWallet_ == address(0)) {
            revert InvalidPayoutWallet();
        }

        CHECKMATE_TOKEN = IERC20SafeTransfers(checkmateToken_);
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

    /**
     * @notice Executes the payout for a given recipient address (anyone can call this function) and stake the payout right away.
     * @dev Reverts with {InvalidProof} if the merkle proof has failed the verification.
     * @dev Emits a {PayoutClaimed} event.
     * @param epochId The epoch ID for the claim.
     * @param recipient The recipient for this claim.
     * @param amount The claim amount for recipient.
     * @param proof The Merkle proof of the user based on the merkle root.
     */
    function claimAndStake(bytes32 epochId, address recipient, uint256 amount, bytes32[] calldata proof, bytes calldata data) external {
        ClaimWindow storage claimWindow = claimWindows[epochId];
        bytes32 leaf = _calculateLeafHash(epochId, recipient, amount, data);
        
        if (! _canClaim(claimWindow, recipient, amount, data, leaf)) {
            revert InvalidClaim(epochId, recipient, amount, proof, data);
        }

        if (!proof.verifyCalldata(claimWindow.merkleRoot, leaf)) {
            revert InvalidProof(epochId, recipient, amount);
        }

        claimed[leaf] = true;

        address _payoutWallet = payoutWallet;
        bool success = CHECKMATE_TOKEN.safeTransferFrom(_payoutWallet, STAKING_POOL, amount, abi.encode(recipient));
        if (!success) {
            revert TransferFailed(_payoutWallet, recipient, amount);
        }
        emit PayoutClaimed(epochId, recipient, amount);
    }

    /**
     * @notice
     * Checks if a recipient can claim a reward for a given epoch id
     */
    function canClaim(bytes32 epochId, address recipient, uint256 amount, bytes calldata data) public view returns (bool) {
        return _canClaim(
            claimWindows[epochId], 
            recipient,
            amount,
            data,
            _calculateLeafHash(epochId, recipient, amount, data)
        );
    }

    function _canClaim(ClaimWindow storage claimWindow, address recipient, uint256 amount, bytes calldata data, bytes32 leaf) internal view virtual returns (bool);

    function _calculateLeafHash(bytes32 epochId, address recipient, uint256 amount, bytes calldata data) internal pure virtual returns (bytes32);

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
