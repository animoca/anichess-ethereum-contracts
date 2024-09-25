// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {IPoints} from "./interface/IPoints.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PauseBase} from "@animoca/ethereum-contracts/contracts/lifecycle/base/PauseBase.sol";
import {PauseStorage} from "@animoca/ethereum-contracts/contracts/lifecycle/libraries/PauseStorage.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Paused, NotPaused} from "@animoca/ethereum-contracts/contracts/lifecycle/errors/PauseErrors.sol";

contract PointsMerkleClaim is ContractOwnership, PauseBase, ForwarderRegistryContext {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PauseStorage for PauseStorage.Layout;

    /// @notice a reference to anichess points contract
    IPoints public immutable POINTS_CONTRACT;

    /// @notice Store the merkle root for claiming
    bytes32 public root;

    /// @notice leaf hash to claimed state
    mapping(bytes32 => bool) public claimed;

    /// @notice Emitted when a new merkle root is set.
    /// @param root The new merkle root.
    event MerkleRootSet(bytes32 indexed root);

    /// @notice Emitted when a payout is claimed.]
    /// @param root The merkle root on which the claim was made.
    /// @param holder The holder of the points.
    /// @param amount The amount of points are claimed.
    /// @param depositReasonCode The deposit reason of the claim.
    event PayoutClaimed(bytes32 indexed root, address indexed holder, bytes32 indexed depositReasonCode, uint256 amount);

    /// @notice Thrown when the given forwarder registry address is zero address.
    error InvalidForwarderRegistry();

    /// @notice Emitted when the claim has expired.
    /// @param deadline The deadline of the claim.
    error ClaimExpired(uint256 deadline);

    /// @notice Thrown when the points contract address is invalid.
    /// @param pointsContractAddress The address of the invalid points contract.
    error InvalidPointsContractAddress(address pointsContractAddress);

    /// @notice Thrown when trying to claim the same leaf more than once.
    /// @param holder The holder of the claim.
    /// @param amount The amount of points is claimed.
    /// @param depositReasonCode The deposit reason of the claim.
    /// @param deadline The deadline of the claim.
    error AlreadyClaimed(address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline);

    /// @notice Thrown when a proof cannot be verified.
    /// @param holder The holder of the claim.
    /// @param amount The amount of points is claimed.
    /// @param depositReasonCode The deposit reason of the claim.
    /// @param deadline The deadline of the claim.
    error InvalidProof(address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline);

    /// @notice Throws when the merkle root does not exist.
    error MerkleRootNotExists();

    /// @notice Throws when the claim amount is zero.
    /// @param amount The amount of the claim.
    error InvalidClaimAmount(uint256 amount);

    constructor(
        address pointsContractAddress,
        IForwarderRegistry forwarderRegistry_
    ) ForwarderRegistryContext(forwarderRegistry_) ContractOwnership(msg.sender) {
        if (pointsContractAddress == address(0)) {
            revert InvalidPointsContractAddress(pointsContractAddress);
        }
        if (address(forwarderRegistry_) == address(0)) {
            revert InvalidForwarderRegistry();
        }
        POINTS_CONTRACT = IPoints(pointsContractAddress);
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }

    /// @notice Sets the new merkle root for claiming.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {MerkleRootSet} event.
    /// @param merkleRoot The merkle root to set.

    function setMerkleRoot(bytes32 merkleRoot) public {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        root = merkleRoot;

        emit MerkleRootSet(merkleRoot);
    }

    /// @notice Sets the new merkle root for claiming and unpause if already paused.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Reverts with {NotPaused} if it is not paused.
    /// @dev Emits a {MerkleRootSet} event.
    /// @dev Emits a {Unpause} event.
    /// @param merkleRoot The merkle root to set.

    function setMerkleRootAndUnpause(bytes32 merkleRoot) external {
        if (!PauseStorage.layout().paused()) {
            revert NotPaused();
        }

        setMerkleRoot(merkleRoot);
        PauseStorage.layout().unpause();
    }

    /// @notice Executes the payout for a given holder address (anyone can call this function).
    /// @dev Reverts with {InvalidClaimAmount} if it is claiming a zero amount.
    /// @dev Reverts with {ClaimExpired} if the block timestamp is larger than deadline.
    /// @dev Reverts with {Paused} if contract is paused.
    /// @dev Reverts with {MerkleRootNotExists} if the merkle root does not exist.
    /// @dev Reverts with {InvalidProof} if the merkle proof has failed the verification
    /// @dev Reverts with {AlreadyClaimed} if this specific payout has already been claimed.
    /// @dev Emits a {PayoutClaimed} event.
    /// @param holder The holder for this claim.
    /// @param amount The amount of points to be claimed.
    /// @param depositReasonCode The deposit reason code for this claim.
    /// @param deadline The expiration timestamp of the claim.
    /// @param proof The Merkle proof of the user based on the merkle root
    function claimPayout(address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline, bytes32[] calldata proof) external {
        if (amount == 0) {
            revert InvalidClaimAmount(amount);
        }
        if (block.timestamp > deadline) {
            revert ClaimExpired(deadline);
        }
        if (PauseStorage.layout().paused()) {
            revert Paused();
        }
        if (root == 0) {
            revert MerkleRootNotExists();
        }
        bytes32 leaf = keccak256(abi.encodePacked(holder, amount, depositReasonCode, deadline));
        if (!proof.verifyCalldata(root, leaf)) {
            revert InvalidProof(holder, amount, depositReasonCode, deadline);
        }

        if (claimed[leaf]) {
            revert AlreadyClaimed(holder, amount, depositReasonCode, deadline);
        }

        claimed[leaf] = true;

        POINTS_CONTRACT.deposit(holder, amount, depositReasonCode);

        emit PayoutClaimed(root, holder, depositReasonCode, amount);
    }
}
