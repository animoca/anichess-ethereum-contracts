// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20StakingPointsRewardsLinearPool} from "./ERC20StakingPointsRewardsLinearPool.sol";
import {LinearPool} from "@animoca/ethereum-contracts/contracts/staking/linear/LinearPool.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {IPointsV2} from "../../points/interface/IPointsV2.sol";

/// @title ERC20StakingPointsRewardsLimitedLinearPool
/// @notice This contract is used to stake ERC20 tokens and obtain Points rewards.
/// @notice Staking can be done either from a claim contract or directly by the staker, but only if the staker is included in a merkle tree.
contract ERC20StakingPointsRewardsLimitedLinearPool is ERC20StakingPointsRewardsLinearPool {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    bytes32 public root;
    mapping(address staker => bool claimed) public claimed;

    event MerkleRootSet(bytes32 indexed newRoot);

    error InvalidProof(address staker, uint256 amount);
    error AlreadyClaimed(address staker);
    error InvalidMerkleRoot();
    error MerkleRootAlreadySet();
    error MerkleRootNotSet();

    /// @dev Reverts with {InvalidPointsContract} if the points contract address is zero.
    /// @param claimContract The address of the claim contract.
    /// @param stakingToken The ERC20 token used for staking.
    /// @param pointsContract The address of the points contract.
    /// @param depositReasonCode The reason code for the deposit.
    /// @param forwarderRegistry The address of the forwarder registry for meta-transactions.
    constructor(
        address claimContract,
        IERC20 stakingToken,
        IPointsV2 pointsContract,
        bytes32 depositReasonCode,
        IForwarderRegistry forwarderRegistry
    ) ERC20StakingPointsRewardsLinearPool(claimContract, stakingToken, pointsContract, depositReasonCode, forwarderRegistry) {}

    /// @inheritdoc ERC20StakingPointsRewardsLinearPool
    /// @dev Reverts with {InvalidToken} if the sender is not the staking token.
    /// @dev Reverts with {MerkleRootNotSet} if not called by the claim contract and the merkle root is not set.
    /// @dev Reverts with {InvalidProof} if not called by the claim contract and the merkle proof is invalid.
    /// @dev Reverts with {AlreadyClaimed} if not called by the claim contract and the staker has already claimed.
    /// @param operator The address of the operator who initiated the transfer.
    /// @param from The address of the sender.
    /// @param value The amount of tokens received.
    /// @param data Encoded as (address staker) if called by the claim contract, or (bytes32[] proof) if called by the staker.
    function onERC20Received(address operator, address from, uint256 value, bytes calldata data) external virtual override returns (bytes4) {
        require(msg.sender == address(STAKING_TOKEN), InvalidToken());
        bool requiresTransfer = false;
        bytes memory stakeData = abi.encode(requiresTransfer, abi.encode(value));
        if (operator == CLAIM_CONTRACT) {
            address staker = abi.decode(data, (address));
            _stake(staker, stakeData);
        } else {
            bytes32[] memory proof = abi.decode(data, (bytes32[]));
            _consumeLeaf(from, value, proof);
            _stake(from, stakeData);
        }
        return this.onERC20Received.selector;
    }

    /// @inheritdoc LinearPool
    /// @dev Reverts with {MerkleRootNotSet} if the merkle root is not set.
    /// @dev Reverts with {InvalidProof} if the merkle proof is invalid.
    /// @dev Reverts with {AlreadyClaimed} if the staker has already claimed.
    /// @param stakeData The data to be used for staking, encoded as (bytes32[] proof, bytes amountData) where amountData is (uint256 value).
    function stake(bytes calldata stakeData) public payable virtual override {
        bool requiresTransfer = true;
        (bytes32[] memory proof, bytes memory data) = abi.decode(stakeData, (bytes32[], bytes));
        uint256 amount = abi.decode(data, (uint256));
        address staker = _msgSender();
        _consumeLeaf(staker, amount, proof);
        _stake(_msgSender(), abi.encode(requiresTransfer, data));
    }

    /// @notice Sets the merkle root for staking. Can only be set once.
    /// @dev Reverts with {NotContractOwner} if the caller is not the contract owner.
    /// @dev Reverts with {MerkleRootAlreadySet} if the merkle root has already been set.
    /// @dev Reverts with {InvalidMerkleRoot} if the new merkle root is zero.
    /// @dev Emits a {MerkleRootSet} event.
    /// @param newRoot The new merkle root.
    function setMerkleRoot(bytes32 newRoot) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        require(root == bytes32(0), MerkleRootAlreadySet());
        require(newRoot != bytes32(0), InvalidMerkleRoot());
        root = newRoot;
        emit MerkleRootSet(newRoot);
    }

    /// @dev Consumes a leaf from the merkle tree.
    /// @dev Reverts with {MerkleRootNotSet} if the merkle root is not set.
    /// @dev Reverts with {InvalidProof} if the merkle proof is invalid.
    /// @dev Reverts with {AlreadyClaimed} if the staker has already claimed.
    /// @param staker The address of the staker.
    /// @param amount The amount of tokens to be staked.
    /// @param proof The merkle proof.
    function _consumeLeaf(address staker, uint256 amount, bytes32[] memory proof) internal {
        bytes32 merkleRoot = root;
        require(merkleRoot != bytes32(0), MerkleRootNotSet());
        bytes32 leaf = keccak256(abi.encodePacked(staker, amount));
        require(proof.verify(root, leaf), InvalidProof(staker, amount));
        require(!claimed[staker], AlreadyClaimed(staker));
        claimed[staker] = true;
    }
}
