// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20SafeTransfers} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20SafeTransfers.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PauseBase} from "@animoca/ethereum-contracts/contracts/lifecycle/base/PauseBase.sol";
import {PauseStorage} from "@animoca/ethereum-contracts/contracts/lifecycle/libraries/PauseStorage.sol";

contract CheckmateMerkleClaim is ContractOwnership, PauseBase {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PauseStorage for PauseStorage.Layout;

    /// @notice a reference to checkmate token contract
    IERC20SafeTransfers public immutable CHECKMATE_TOKEN;

    /// @notice a reference to staking pool contract
    address public immutable STAKING_POOL;

    /// @notice Store the merkle root to nonce mapping
    mapping(bytes32 root => uint16 nonce) public rootToNonceMap;

    /// @notice leaf hash to claimed state
    mapping(bytes32 leaf => bool claimed) public claimed;

    /// @notice Store the payout wallet address for transfering checkmate token
    address public payoutWallet;

    /// @notice Store the nonce
    uint16 public nonce;

    /// @notice Emitted when a new merkle root is set.
    /// @param root The new merkle root.
    /// @param nonce The nonce assigned to the root.
    event MerkleRootSet(bytes32 indexed root, uint16 indexed nonce);

    /// @notice Emitted when a new payout wallet is set.
    /// @param newPayoutWallet The new payout wallet.
    event PayoutWalletSet(address indexed newPayoutWallet);

    /// @notice Emitted when a payout is claimed.
    /// @param root The merkle root on which the claim was made.
    /// @param payoutWallet The wallet sending out the checkmate token.
    /// @param recipient The recipient of the checkmate token.
    /// @param amount The amount of checkmate token is claimed.
    event PayoutClaimed(bytes32 indexed root, address indexed payoutWallet, address indexed recipient, uint256 amount);

    /// @notice Thrown when the given forwarder registry address is zero.
    error InvalidForwarderRegistry();

    /// @notice Thrown when the given root is zero.
    error InvalidRoot();

    /// @notice Thrown when the given payout wallet address is zero.
    error InvalidPayoutWallet();

    /// @notice Thrown when the checkmate token contract address is zero.
    error InvalidCheckmateTokenAddress();

    /// @notice Thrown when the staking pool address is zero.
    error InvalidStakingPoolAddress();

    /// @notice Thrown when trying to claim the same leaf more than once.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of checkmate token is claimed.
    /// @param root The root.
    error AlreadyClaimed(address recipient, uint256 amount, bytes32 root);

    /// @notice Thrown when a proof cannot be verified.
    /// @param recipient The recipient of the checkmate token.
    /// @param amount The amount of checkmate token is claimed.
    /// @param nonce The nonce of the root.
    error InvalidProof(address recipient, uint256 amount, uint16 nonce);

    /// @notice Thrown when the merkle root does not exist.
    /// @param root The root.
    error MerkleRootNotExists(bytes32 root);

    /// @notice Thrown when the claim amount is zero.
    /// @param amount The amount of the claim.
    error InvalidClaimAmount(uint256 amount);

    /// @notice Thrown when checkmate token transfer failed.
    /// @param payoutWallet The wallet sending out the checkmate token.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of the claim.
    error TransferFailed(address payoutWallet, address recipient, uint256 amount);

    constructor(IERC20SafeTransfers checkmateToken_, address stakingPool_, address payoutWallet_) ContractOwnership(msg.sender) {
        if (address(checkmateToken_) == address(0)) {
            revert InvalidCheckmateTokenAddress();
        }
        if (stakingPool_ == address(0)) {
            revert InvalidStakingPoolAddress();
        }
        if (payoutWallet_ == address(0)) {
            revert InvalidPayoutWallet();
        }

        CHECKMATE_TOKEN = checkmateToken_;
        STAKING_POOL = stakingPool_;
        payoutWallet = payoutWallet_;
    }

    /// @notice Sets the new merkle root with current nonce for claiming.
    /// @dev Reverts with {InvalidRoot} if the merkle root is zero.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {MerkleRootSet} event.
    /// @param merkleRoot The merkle root to be set.
    function setMerkleRoot(bytes32 merkleRoot) external {
        if (merkleRoot == 0) {
            revert InvalidRoot();
        }

        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        uint16 _nonce = nonce + 1;
        nonce = _nonce;
        rootToNonceMap[merkleRoot] = _nonce;

        emit MerkleRootSet(merkleRoot, _nonce);
    }

    /// @notice Sets the new payout wallet.
    /// @dev Reverts with {InvalidPayoutWallet} if the new payout wallet is zero address.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {PayoutWalletSet} event.
    /// @param newPayoutWallet The payout wallet to be set.
    function setPayoutWallet(address newPayoutWallet) external {
        if (newPayoutWallet == address(0)) {
            revert InvalidPayoutWallet();
        }

        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        payoutWallet = newPayoutWallet;

        emit PayoutWalletSet(newPayoutWallet);
    }

    /// @notice Executes the payout for a given recipient address (anyone can call this function) and stake the payout right away.
    /// @dev Reverts with {InvalidClaimAmount} if it is claiming a zero amount.
    /// @dev Reverts with {Paused} if contract is paused.
    /// @dev Reverts with {MerkleRootNotExists} if the merkle root does not exist.
    /// @dev Reverts with {InvalidProof} if the merkle proof has failed the verification
    /// @dev Reverts with {AlreadyClaimed} if this specific payout has already been claimed.
    /// @dev Emits a {PayoutClaimed} event.
    /// @param recipient The recipient for this claim.
    /// @param amount The amount of checkmate token to be claimed.
    /// @param root The root for this claim.
    /// @param proof The Merkle proof of the user based on the merkle root.
    function claimAndStake(address recipient, uint256 amount, bytes32 root, bytes32[] calldata proof) external {
        if (amount == 0) {
            revert InvalidClaimAmount(amount);
        }

        PauseStorage.layout().enforceIsNotPaused();

        uint16 _nonce = rootToNonceMap[root];
        if (_nonce == 0) {
            revert MerkleRootNotExists(root);
        }

        bytes32 leaf = keccak256(abi.encodePacked(recipient, amount, _nonce));
        if (!proof.verifyCalldata(root, leaf)) {
            revert InvalidProof(recipient, amount, _nonce);
        }

        if (claimed[leaf]) {
            revert AlreadyClaimed(recipient, amount, root);
        }

        claimed[leaf] = true;

        address _payoutWallet = payoutWallet;
        bool success = CHECKMATE_TOKEN.safeTransferFrom(_payoutWallet, STAKING_POOL, amount, abi.encode(recipient));
        if (!success) {
            revert TransferFailed(_payoutWallet, recipient, amount);
        }
        emit PayoutClaimed(root, _payoutWallet, recipient, amount);
    }
}
