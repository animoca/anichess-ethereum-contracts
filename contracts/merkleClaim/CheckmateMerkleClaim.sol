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
    address public immutable CHECKMATE_TOKEN_CONTRACT;

    /// @notice a reference to staking contract
    address public immutable STAKING_CONTRACT;

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
    /// @param nonce The nonce used for setting the root.
    event MerkleRootSet(bytes32 indexed root, uint256 indexed nonce);

    /// @notice Emitted when a new payout wallet is set.
    /// @param newPayoutWallet The new payout wallet.
    event PayoutWalletSet(address indexed newPayoutWallet);

    /// @notice Emitted when a new treasury wallet is set.
    /// @param newTreasuryWallet The new treasury wallet.
    event TreasuryWalletSet(address indexed newTreasuryWallet);

    /// @notice Emitted when a payout is claimed.
    /// @param root The merkle root on which the claim was made.
    /// @param payoutWallet The wallet sending out the checkmate token.
    /// @param recipient The recipient of the checkmate token.
    /// @param amount The amount of checkmate token is claimed.
    event PayoutClaimed(bytes32 indexed root, address indexed payoutWallet, address indexed recipient, uint256 amount);

    /// @notice Thrown when the given forwarder registry address is zero address.
    error InvalidForwarderRegistry();

    /// @notice Thrown when the given root is zero.
    error InvalidRoot();

    /// @notice Thrown when the given payout wallet address is zero address.
    error InvalidPayoutWallet();

    /// @notice Thrown when the checkmate token contract address is invalid.
    error InvalidCheckmateTokenContract();

    /// @notice Thrown when the staking contract address is invalid.
    error InvalidStakingContract();

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

    /// @notice Throws when the merkle root does not exist.
    /// @param root The root.
    error MerkleRootNotExists(bytes32 root);

    /// @notice Throws when the claim amount is zero.
    /// @param amount The amount of the claim.
    error InvalidClaimAmount(uint256 amount);

    constructor(address checkmateTokenContract_, address stakingContract_, address payoutWallet_) ContractOwnership(msg.sender) {
        if (checkmateTokenContract_ == address(0)) {
            revert InvalidCheckmateTokenContract();
        }
        if (stakingContract_ == address(0)) {
            revert InvalidStakingContract();
        }
        if (payoutWallet_ == address(0)) {
            revert InvalidPayoutWallet();
        }

        CHECKMATE_TOKEN_CONTRACT = checkmateTokenContract_;
        STAKING_CONTRACT = stakingContract_;
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
        rootToNonceMap[merkleRoot] = _nonce;
        nonce = _nonce;

        emit MerkleRootSet(merkleRoot, _nonce);
    }

    /// @notice Sets the new payout wallet.
    /// @dev Reverts with {InvalidPayoutWallet} if the payout wallet is zero address.
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
        IERC20SafeTransfers(CHECKMATE_TOKEN_CONTRACT).safeTransferFrom(_payoutWallet, STAKING_CONTRACT, amount, abi.encode(recipient));
        emit PayoutClaimed(root, _payoutWallet, recipient, amount);
    }
}
