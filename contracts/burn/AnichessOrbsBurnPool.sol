// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {ERC1155TokenReceiver} from "@animoca/ethereum-contracts/contracts/token/ERC1155/ERC1155TokenReceiver.sol";
import {IERC1155Burnable} from "@animoca/ethereum-contracts/contracts/token/ERC1155/interfaces/IERC1155Burnable.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title AnichessOrbsBurnPool Contract
 * @dev This contract allows users to burn tokens and calculate rewards based on the amount of tokens burned.
 * @dev The rewards are calculated based on the total amount of tokens burned in the previous cycle.
 */
contract AnichessOrbsBurnPool is ForwarderRegistryContext, ERC1155TokenReceiver, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    /// @notice The IERC1155Burnable erc1155 contracts.
    IERC1155Burnable public immutable TOKEN;

    /// @notice The initial time of the contract.
    uint256 public immutable INITIAL_TIME;

    /// @notice The duration of each cycle.
    uint256 public immutable CYCLE_DURATION;

    /// @notice The maximum cycle.
    uint256 public immutable MAX_CYCLE;

    /// @notice The IERC1155 erc1155 contract for unlocking the token multiplier.
    IERC1155Burnable public immutable MULTIPLIER_TOKEN;

    /// @notice The token ID for unlocking the token multiplier.
    uint256 public immutable MULTIPLIER_TOKEN_ID;

    /// @notice The Merkle root of the leaderboard multiplier claim.
    bytes32 public immutable MERKLE_ROOT;

    /// @notice The token multiplier.
    uint256 public immutable TOKEN_MULTIPLIER;

    /// @notice The list of tiers to decide the reward pool.
    uint256[] public tiers;

    /// @notice The list of rewards for each tier.
    uint256[] public tierRewards;

    /// @notice The total amount of ASH burned in each cycle.
    mapping(uint256 => uint256) totalAshByCycle;

    /// @notice The total amount of ASH burned by each user in each cycle.
    mapping(uint256 => mapping(address => uint256)) public userAshByCycle;

    /// @notice The claim status for the leaderboard multiplier.
    mapping(bytes32 => bool) public claimStatus;

    /// @notice The leaderboard multipliers for each user.
    mapping(address => uint256) public leaderboardMultiplers;

    /// @notice The token multiplier unlock status for each user.
    mapping(address => bool) public tokenMultiplerUnlockStatus;

    /// @notice The token weights.
    mapping(uint256 => uint256) tokenWeights;

    /// @notice Event emitted when tokens are burnt.
    event TokensBurnt(
        address indexed burner,
        uint256 indexed cycle,
        uint256 timestamp,
        uint256[] ids,
        uint256[] values,
        uint256 totalAsh,
        uint256 multiplier
    );

    /// @notice Event emitted when the leaderboard multiplier is claimed.
    event ClaimLeaderboardMultiplier(address indexed recipient, uint256 multiplier);

    /// @notice Event emitted when the token multiplier is unlocked.
    event UnlockTokenMultiplier(address wallet, uint256 timestamp);

    /// @notice Error thrown when the token ID is invalid.
    error InvalidTokenId(address token, uint256 tokenId);

    /// @notice Error thrown when the array lengths are inconsistent.
    error InconsistentArrays();

    /// @notice Error thrown when the tiers are incorrect.
    error IncorrectTiers();

    /// @notice Error thrown when the tiers are not set.
    error TiersNotSet();

    /// @notice Error thrown when the tier rewards are incorrect.
    error IncorrectTierRewards();

    /// @notice Error thrown when the token is not approved.
    error InvalidToken();

    /// @notice Error thrown when the cycle is invalid.
    error InvalidCycle(uint256 cycle);

    /// @notice Error thrown when the token amount is invalid.
    error InvalidTokenAmount(uint256 amount, uint256 expectedAmount);

    /// @notice Error thrown when the payout has already been claimed.
    error AlreadyClaimedLeaderboardMultiplier(address recipient);

    /// @notice Error thrown when the wallet already has the token multiplier unlocked.
    error AlreadyUnlockedTokenMultiplier(address wallet);

    /// @notice Error thrown when the proof is invalid.
    error InvalidProof();

    /// @notice Error thrown when the tiers are already set.
    error AlreadySetTiers();

    /// @notice Error thrown when the token weight is already set.
    error AlreadySetTokenWeight(uint256 tokenId);

    /**
     * @notice Constructor for the AnichessOrbsBurnPool contract.
     * @param initialTime The initial time of the contract.
     * @param cycleDuration The duration of each cycle.
     * @param maxCycle The maximum cycle.
     * @param token The IERC1155Burnable erc1155 contract.
     * @param merkleRoot The Merkle root of the leaderboard multiplier claim.
     * @param multiplierToken The IERC1155Burnable erc1155 contract for unlocking the token multiplier.
     * @param multiplierTokenId The token ID for unlocking the token multiplier.
     * @param tokenMultiplier The token multiplier.
     * @param forwarderRegistry The forwarder registry contract.
     */
    constructor(
        uint256 initialTime,
        uint256 cycleDuration,
        uint256 maxCycle,
        IERC1155Burnable token,
        bytes32 merkleRoot,
        IERC1155Burnable multiplierToken,
        uint256 multiplierTokenId,
        uint256 tokenMultiplier,
        IForwarderRegistry forwarderRegistry
    ) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(msg.sender) {
        INITIAL_TIME = initialTime;
        CYCLE_DURATION = cycleDuration;
        MAX_CYCLE = maxCycle;
        MERKLE_ROOT = merkleRoot;
        MULTIPLIER_TOKEN = multiplierToken;
        MULTIPLIER_TOKEN_ID = multiplierTokenId;
        TOKEN = token;
        TOKEN_MULTIPLIER = tokenMultiplier;
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
     * @notice Set the tiers and rewards.
     * @param _tiers The list of tiers.
     * @param _tierRewards The list of rewards for each tier.
     * @dev Throws if the _msgSender is not the contract owner.
     * @dev Throws if the lengths of tiers and rewards are inconsistent.
     * @dev Throws if the tiers are empty.
     * @dev Throws if the tiers are already set.
     * @dev Throws if the tiers are not in increasing order.
     * @dev Throws if the rewards are not in increasing order.
     */
    function setTiers(uint256[] calldata _tiers, uint256[] calldata _tierRewards) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        if (_tiers.length != _tierRewards.length) {
            revert InconsistentArrays();
        }

        if (_tiers.length == 0) {
            revert IncorrectTiers();
        }
        if (tiers.length > 0) {
            revert AlreadySetTiers();
        }

        // check if tiers are in increasing order
        for (uint256 i = 1; i < _tiers.length; i++) {
            if (_tiers[i] < _tiers[i - 1]) {
                revert IncorrectTiers();
            }
            if (_tierRewards[i] < _tierRewards[i - 1]) {
                revert IncorrectTierRewards();
            }
        }
        tiers = _tiers;
        tierRewards = _tierRewards;
    }

    /**
     * @notice Set the token weights.
     * @param tokenIds The token IDs.
     * @param weights The weights for each token.
     * @dev Throws if the _msgSender is not the contract owner.
     * @dev Throws if the lengths of token IDs and weights are inconsistent.
     * @dev Throws if the token weight is already set.
     */
    function setTokensWeight(uint256[] memory tokenIds, uint256[] memory weights) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        if (tokenIds.length != weights.length) {
            revert InconsistentArrays();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenWeights[i] > 0) {
                revert AlreadySetTokenWeight(tokenIds[i]);
            }
            tokenWeights[i] = weights[i];
        }
    }

    /**
     * @notice Get the multiplier for the user.
     * @param wallet The wallet address.
     * @return multiplier The multiplier for the user.
     */
    function getMultiplier(address wallet) public view returns (uint256 multiplier) {
        uint256 leaderboardMultiplier = leaderboardMultiplers[wallet];
        multiplier = leaderboardMultiplier == 0 ? 1 : leaderboardMultiplier;
        bool isTokenMultiplierUnlocked = tokenMultiplerUnlockStatus[wallet];
        if (isTokenMultiplierUnlocked) {
            multiplier *= TOKEN_MULTIPLIER;
        }
    }

    /**
     * @notice Get the current cycle.
     * @return cycle The current cycle.
     */
    function currentCycle() public view returns (uint256) {
        return (block.timestamp - INITIAL_TIME) / CYCLE_DURATION;
    }

    /**
     * @notice Get the reward for the cycle.
     * @param cycle The cycle number.
     * @return reward The reward for the cycle.
     * @dev Throws if the cycle is invalid.
     * @dev Throws if the tiers are not set.
     */
    function getCycleReward(uint256 cycle) public view returns (uint256) {
        if (cycle > currentCycle() || cycle > MAX_CYCLE) {
            revert InvalidCycle(cycle);
        }

        if (tiers.length == 0) {
            revert TiersNotSet();
        }

        uint256 prevTotalAsh = cycle == 0 ? 0 : totalAshByCycle[cycle - 1];

        for (uint256 i = 1; i <= tiers.length; i++) {
            if (prevTotalAsh < tiers[i]) {
                return tierRewards[i - 1];
            }
        }
        return tierRewards[tiers.length - 1];
    }

    /**
     * @notice Get the user reward for the cycle.
     * @param cycle The cycle number.
     * @param wallet The wallet address.
     * @return reward The reward for the user.
     * @dev Throws if the cycle is invalid.
     */
    function getUserReward(uint256 cycle, address wallet) external view returns (uint256) {
        if (cycle > currentCycle() || cycle > MAX_CYCLE) {
            revert InvalidCycle(cycle);
        }
        uint256 cycleReward = getCycleReward(cycle);
        uint256 userAsh = userAshByCycle[cycle][wallet];
        return (userAsh * cycleReward) / totalAshByCycle[cycle];
    }

    /**
     * @notice Claims the leaderboard multiplier
     * @param proof The Merkle proof for the claim.
     * @param recipient The recipient of the payout.
     * @param multiplier The multiplier for the recipient.
     * @dev Throws if the payout has already been claimed.
     * @dev Throws if the proof is invalid.
     */
    function claimLeaderboardMultiplier(bytes32[] calldata proof, address recipient, uint256 multiplier) external {
        bytes32 leaf = keccak256(abi.encodePacked(recipient, multiplier));
        if (claimStatus[leaf]) {
            revert AlreadyClaimedLeaderboardMultiplier(recipient);
        }
        if (!proof.verify(MERKLE_ROOT, leaf)) {
            revert InvalidProof();
        }

        leaderboardMultiplers[recipient] = multiplier;
        claimStatus[leaf] = true;

        emit ClaimLeaderboardMultiplier(recipient, multiplier);
    }

    /**
     * @notice Unlock the token multiplier by burning the multiplier token.
     * @param from The wallet address.
     * @param id The token ID.
     * @param value The token value.
     * @return The ERC1155Received selector.
     * @dev Throws if the token is invalid.
     * @dev Throws if the token ID is invalid.
     * @dev Throws if the token amount is invalid.
     * @dev Throws if the token multiplier is already unlocked.
     */
    function onERC1155Received(address, address from, uint256 id, uint256 value, bytes calldata) external override returns (bytes4) {
        if (msg.sender != address(MULTIPLIER_TOKEN)) {
            revert InvalidToken();
        }
        if (id != MULTIPLIER_TOKEN_ID) {
            revert InvalidTokenId(msg.sender, id);
        }

        if (value != 1) {
            revert InvalidTokenAmount(value, 1);
        }
        if (tokenMultiplerUnlockStatus[from]) {
            revert AlreadyUnlockedTokenMultiplier(from);
        }

        tokenMultiplerUnlockStatus[from] = true;
        emit UnlockTokenMultiplier(from, block.timestamp);

        return this.onERC1155Received.selector;
    }

    /**
     * @notice Burn the tokens and calculate the ash.
     * @param from The wallet address.
     * @param ids The token IDs to burn.
     * @param values The amount of tokens to burn.
     * @return The ERC1155Received selector.
     * @dev Throws if the token is invalid.
     * @dev Throws if the cycle is invalid.
     * @dev Throws if the token ID is invalid.
     */
    function onERC1155BatchReceived(
        address,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata
    ) external override returns (bytes4) {
        if (msg.sender != address(TOKEN)) {
            revert InvalidToken();
        }

        uint256 cycle = currentCycle();
        if (cycle > MAX_CYCLE) {
            revert InvalidCycle(cycle);
        }

        uint256 totalAsh = 0;
        // calculate total burned
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 weight = tokenWeights[ids[i]];
            if (weight == 0) {
                revert InvalidTokenId(msg.sender, ids[i]);
            }
            totalAsh += (values[i] * weight);
        }

        // get the multiplier
        uint256 multiplier = getMultiplier(from);
        totalAsh *= multiplier;

        // update the user status
        userAshByCycle[cycle][from] += totalAsh;
        // update the pool status
        totalAshByCycle[cycle] += totalAsh;

        IERC1155Burnable(msg.sender).batchBurnFrom(from, ids, values);
        emit TokensBurnt(from, cycle, block.timestamp, ids, values, totalAsh, multiplier);

        return this.onERC1155BatchReceived.selector;
    }
}
