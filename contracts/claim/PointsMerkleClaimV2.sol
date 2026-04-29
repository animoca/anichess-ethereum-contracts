// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IPointsV2} from "../points/interface/IPointsV2.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

contract PointsMerkleClaimV2 is ContractOwnership {
    using MerkleProof for bytes32[];
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice a reference to anichess points contract
    IPointsV2 public immutable POINTS;

    /// @notice Stores all the merkle roots for claiming
    mapping(bytes32 => bool) public roots;

    /// @notice A state to determine the leaf has been claimed
    mapping(bytes32 => bool) public claimed;

    /// @notice Emitted when a new merkle root is activated
    /// @param root The activated merkle root
    event MerkleRootActivated(bytes32 indexed root);

    /// @notice Emitted when a merkle root is deactivated
    /// @param root The deactivated merkle root
    event MerkleRootDeactivated(bytes32 indexed root);

    /// @notice Emitted when a payout is claimed
    /// @param root The merkle root of the claim
    /// @param holder The holder of the points
    /// @param amount The amount of points are claimed
    /// @param depositReasonCode The deposit reason of the claim
    /// @param deadline The deadline of the claim
    /// @param distributionId The distribution ID of the claim
    event PayoutClaimed(
        bytes32 indexed root,
        address indexed holder,
        bytes32 indexed depositReasonCode,
        uint256 amount,
        uint256 deadline,
        bytes32 distributionId
    );

    /// @notice Emitted when the claim has expired
    /// @param deadline The deadline of the claim
    error ClaimExpired(uint256 deadline);

    /// @notice Thrown when the points contract address is invalid
    /// @param pointsContractAddress The address of the invalid points contract
    error InvalidPointsContractAddress(address pointsContractAddress);

    /// @notice Thrown when trying to claim the same leaf more than once
    /// @param root The merkle root of the claim
    /// @param holder The holder of the claim
    /// @param amount The amount of points is claimed
    /// @param depositReasonCode The deposit reason of the claim
    /// @param deadline The deadline of the claim
    error AlreadyClaimed(bytes32 root, address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline, bytes32 distributionId);

    /// @notice Thrown when a proof cannot be verified
    /// @param root The merkle root of the claim
    /// @param holder The holder of the claim
    /// @param amount The amount of points is claimed
    /// @param depositReasonCode The deposit reason of the claim
    /// @param deadline The deadline of the claim
    /// @param distributionId The distribution ID of the claim
    error InvalidProof(bytes32 root, address holder, uint256 amount, bytes32 depositReasonCode, uint256 deadline, bytes32 distributionId);

    /// @notice Throws when the merkle root is not activated
    /// @param root The merkle root
    error MerkleRootNotActivated(bytes32 root);

    /// @notice Throws when the merkle root already activated
    /// @param root The merkle root
    error MerkleRootAlreadyActivated(bytes32 root);

    /// @notice Throws when the claim amount is zero
    /// @param amount The amount of the claim
    error InvalidClaimAmount(uint256 amount);

    constructor(address points) ContractOwnership(msg.sender) {
        if (points == address(0)) {
            revert InvalidPointsContractAddress(points);
        }
        POINTS = IPointsV2(points);
    }

    /// @notice Activates a new merkle root for claiming
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner
    /// @dev Reverts with {MerkleRootAlreadyActivated} if the merkle root is already activated
    /// @dev Emits a {MerkleRootActivated} event
    /// @param newMerkleRoot The merkle root to activate
    function activateMerkleRoot(bytes32 newMerkleRoot) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        if (roots[newMerkleRoot]) {
            revert MerkleRootAlreadyActivated(newMerkleRoot);
        }
        roots[newMerkleRoot] = true;
        emit MerkleRootActivated(newMerkleRoot);
    }

    /// @notice Deactivates the merkle root for claiming
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner
    /// @dev Reverts with {MerkleRootNotActivated} if the merkle root is not activated
    /// @dev Emits a {MerkleRootDeactivated} event
    /// @param merkleRoot The merkle root to deactivate
    function deactivateMerkleRoot(bytes32 merkleRoot) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        if (!roots[merkleRoot]) {
            revert MerkleRootNotActivated(merkleRoot);
        }
        roots[merkleRoot] = false;
        emit MerkleRootDeactivated(merkleRoot);
    }

    /// @notice Executes the payout for a given holder address (anyone can call this function)
    /// @dev Reverts with {InvalidClaimAmount} if it is claiming a zero amount
    /// @dev Reverts with {ClaimExpired} if the block timestamp is larger than deadline
    /// @dev Reverts with {MerkleRootNotActivated} if the merkle root is not activated
    /// @dev Reverts with {InvalidProof} if the merkle proof has failed the verification
    /// @dev Reverts with {AlreadyClaimed} if this specific payout has already been claimed
    /// @dev Emits a {PayoutClaimed} event
    /// @param root The merkle root for this claim
    /// @param distributionId The distribution ID for this claim
    /// @param holder The holder for this claim
    /// @param amount The amount of points to be claimed
    /// @param depositReasonCode The deposit reason code for this claim
    /// @param deadline The expiration timestamp of the claim
    /// @param proof The Merkle proof of the user based on the merkle root
    function claim(
        bytes32 root,
        address holder,
        uint256 amount,
        bytes32 depositReasonCode,
        uint256 deadline,
        bytes32 distributionId,
        bytes32[] calldata proof
    ) external {
        if (amount == 0) {
            revert InvalidClaimAmount(amount);
        }
        if (block.timestamp > deadline) {
            revert ClaimExpired(deadline);
        }

        if (!roots[root]) {
            revert MerkleRootNotActivated(root);
        }

        bytes32 leaf = keccak256(abi.encodePacked(holder, amount, depositReasonCode, deadline, distributionId));
        if (!proof.verifyCalldata(root, leaf)) {
            revert InvalidProof(root, holder, amount, depositReasonCode, deadline, distributionId);
        }
        if (claimed[leaf]) {
            revert AlreadyClaimed(root, holder, amount, depositReasonCode, deadline, distributionId);
        }

        claimed[leaf] = true;
        POINTS.deposit(holder, amount, depositReasonCode);
        emit PayoutClaimed(root, holder, depositReasonCode, amount, deadline, distributionId);
    }
}
