// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20SafeTransfers} from "@animoca/ethereum-contracts/contracts/token/ERC20/interfaces/IERC20SafeTransfers.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PauseBase} from "@animoca/ethereum-contracts/contracts/lifecycle/base/PauseBase.sol";
import {PauseStorage} from "@animoca/ethereum-contracts/contracts/lifecycle/libraries/PauseStorage.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

contract ERC20MerkleClaim is ContractOwnership, PauseBase, ForwarderRegistryContext {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PauseStorage for PauseStorage.Layout;

    /// @notice Fee precision
    uint256 public constant FEE_PRECISION = 10000;

    /// @notice a reference to reward token contract
    address public immutable REWARD_CONTRACT;

    /// @notice a reference to staking contract
    address public immutable STAKING_CONTRACT;

    /// @notice Store the merkle roots for claiming
    mapping(uint96 nonce => bytes32 root) public rootMap;

    /// @notice leaf hash to claimed state
    mapping(bytes32 leaf => bool claimed) public claimed;

    /// @notice Store the nonce
    uint96 public nonce;

    /// @notice Store the payout wallet address for transfering reward token
    address public payoutWallet;

    /// @notice Store the fee percentage
    uint96 public fee;

    /// @notice Store the treasury wallet address for collecting fee
    address public treasuryWallet;

    /// @notice Emitted when a new merkle root is set.
    /// @param nonce The nonce used for setting the root.
    /// @param root The new merkle root.
    event MerkleRootSet(uint256 indexed nonce, bytes32 indexed root);

    /// @notice Emitted when a new payout wallet is set.
    /// @param newPayoutWallet The new payout wallet.
    event PayoutWalletSet(address indexed newPayoutWallet);

    /// @notice Emitted when a new treasury wallet is set.
    /// @param newTreasuryWallet The new treasury wallet.
    event TreasuryWalletSet(address indexed newTreasuryWallet);

    /// @notice Emitted when a payout is claimed.
    /// @param nonce The nonce for the root.
    /// @param root The merkle root on which the claim was made.
    /// @param recipient The recipient of the reward token.
    /// @param payoutWallet The wallet sending out the reward token.
    /// @param netClaimedAmount The amount of reward token is claimed minus fee amount.
    /// @param feeAmount The fee amount taken from the claimed reward.
    event PayoutClaimed(
        uint256 indexed nonce,
        bytes32 indexed root,
        address indexed recipient,
        address payoutWallet,
        uint256 netClaimedAmount,
        uint256 feeAmount
    );

    /// @notice Thrown when the given forwarder registry address is zero address.
    error InvalidForwarderRegistry();

    /// @notice Thrown when the given payout wallet address is zero address.
    error InvalidPayoutWallet();

    /// @notice Thrown when the given treasury wallet address is zero address.
    error InvalidTreasuryWallet();

    /// @notice Thrown when the given fee is bigger than precision.
    error InvalidFee();

    /// @notice Thrown when the reward contract address is invalid.
    /// @param rewardContract The address of the invalid reward contract.
    error InvalidRewardContract(address rewardContract);

    /// @notice Thrown when the staking contract address is invalid.
    /// @param stakingContract The address of the invalid staking contract.
    error InvalidStakingContract(address stakingContract);

    /// @notice Thrown when trying to claim the same leaf more than once.
    /// @param recipient The recipient of the claim.
    /// @param amount The amount of reward token is claimed.
    /// @param nonce The nonce of the root.
    error AlreadyClaimed(address recipient, uint256 amount, uint256 nonce);

    /// @notice Thrown when a proof cannot be verified.
    /// @param recipient The recipient of the token reward.
    /// @param amount The amount of reward token is claimed.
    /// @param nonce The nonce of the root.
    error InvalidProof(address recipient, uint256 amount, uint256 nonce);

    /// @notice Throws when the merkle root does not exist.
    /// @param nonce The nonce of the root.
    error MerkleRootNotExists(uint256 nonce);

    /// @notice Throws when the claim amount is zero.
    /// @param amount The amount of the claim.
    error InvalidClaimAmount(uint256 amount);

    constructor(
        address rewardContract_,
        address stakingContract_,
        address payoutWallet_,
        address treasuryWallet_,
        uint96 fee_,
        IForwarderRegistry forwarderRegistry_
    ) ForwarderRegistryContext(forwarderRegistry_) ContractOwnership(msg.sender) {
        if (rewardContract_ == address(0)) {
            revert InvalidRewardContract(rewardContract_);
        }

        if (stakingContract_ == address(0)) {
            revert InvalidStakingContract(stakingContract_);
        }

        if (payoutWallet_ == address(0)) {
            revert InvalidPayoutWallet();
        }

        if (treasuryWallet_ == address(0)) {
            revert InvalidTreasuryWallet();
        }

        if (fee_ > FEE_PRECISION) {
            revert InvalidFee();
        }

        if (address(forwarderRegistry_) == address(0)) {
            revert InvalidForwarderRegistry();
        }

        REWARD_CONTRACT = rewardContract_;
        STAKING_CONTRACT = stakingContract_;
        payoutWallet = payoutWallet_;
        treasuryWallet = treasuryWallet_;
        fee = fee_;
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }

    /// @notice Sets the new merkle root with current nonce for claiming.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {MerkleRootSet} event.
    /// @param merkleRoot The merkle root to be set.
    function setMerkleRoot(bytes32 merkleRoot) public {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        uint96 _nonce = nonce;
        rootMap[_nonce] = merkleRoot;
        ++nonce;

        emit MerkleRootSet(_nonce, merkleRoot);
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

    /// @notice Sets the new treasury wallet.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {TreasuryWalletSet} event.
    /// @param newTreasuryWallet The treasury wallet to be set.
    function setTreasuryWallet(address newTreasuryWallet) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        treasuryWallet = newTreasuryWallet;

        emit TreasuryWalletSet(newTreasuryWallet);
    }

    /// @dev Reverts with {InvalidClaimAmount} if it is claiming a zero amount.
    /// @dev Reverts with {Paused} if contract is paused.
    /// @dev Reverts with {MerkleRootNotExists} if the merkle root does not exist.
    /// @dev Reverts with {InvalidProof} if the merkle proof has failed the verification
    /// @dev Reverts with {AlreadyClaimed} if this specific payout has already been claimed.
    /// @param recipient The recipient for this claim.
    /// @param amount The amount of reward token to be claimed.
    /// @param nonce_ The nonce of the root.PayoutClaimed
    /// @param proof The Merkle proof of the user based on the merkle root
    function _claim(address recipient, uint256 amount, uint96 nonce_, bytes32[] calldata proof) private returns (bytes32 root_) {
        if (amount == 0) {
            revert InvalidClaimAmount(amount);
        }

        PauseStorage.layout().enforceIsNotPaused();

        root_ = rootMap[nonce_];
        if (root_ == 0) {
            revert MerkleRootNotExists(nonce_);
        }

        bytes32 leaf = keccak256(abi.encodePacked(recipient, amount, nonce_));
        if (!proof.verifyCalldata(root_, leaf)) {
            revert InvalidProof(recipient, amount, nonce_);
        }

        if (claimed[leaf]) {
            revert AlreadyClaimed(recipient, amount, nonce_);
        }

        claimed[leaf] = true;
    }

    /// @notice Executes the payout for a given recipient address (anyone can call this function).
    /// @dev Emits a {PayoutClaimed} event.
    /// @param recipient The recipient for this claim.
    /// @param amount The amount of reward token to be claimed.
    /// @param nonce_ The nonce of the root.PayoutClaimed
    /// @param proof The Merkle proof of the user based on the merkle root
    function claimPayout(address recipient, uint256 amount, uint96 nonce_, bytes32[] calldata proof) external {
        bytes32 _root = _claim(recipient, amount, nonce_, proof);

        address _payoutWallet = payoutWallet;
        uint256 feeAmount = (amount * fee) / FEE_PRECISION;
        uint256 netAmount = amount - feeAmount;
        IERC20SafeTransfers(REWARD_CONTRACT).safeTransferFrom(_payoutWallet, recipient, netAmount, "");
        IERC20SafeTransfers(REWARD_CONTRACT).safeTransferFrom(_payoutWallet, treasuryWallet, feeAmount, "");

        emit PayoutClaimed(nonce_, _root, _payoutWallet, recipient, netAmount, feeAmount);
    }

    /// @notice Executes the payout for a given recipient address (anyone can call this function) and stake the payout right away.
    /// @dev Emits a {PayoutClaimed} event.
    /// @param recipient The recipient for this claim.
    /// @param amount The amount of reward token to be claimed.
    /// @param nonce_ The nonce of the root.PayoutClaimed
    /// @param proof The Merkle proof of the user based on the merkle root
    function claimPayoutAndStake(address recipient, uint256 amount, uint96 nonce_, bytes32[] calldata proof) external {
        bytes32 _root = _claim(recipient, amount, nonce_, proof);

        address _payoutWallet = payoutWallet;
        IERC20SafeTransfers(REWARD_CONTRACT).safeTransferFrom(_payoutWallet, STAKING_CONTRACT, amount, abi.encode(recipient));
        emit PayoutClaimed(nonce_, _root, _payoutWallet, recipient, amount, 0);
    }
}
