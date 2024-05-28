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
import "hardhat/console.sol";

/**
 * @title AnichessOrbsBurnPool Contract
 * @dev This contract allows users to burn tokens and calculate rewards based on the amount of tokens burned.
 * @dev The rewards are calculated based on the total amount of tokens burned in the previous cycle.
 */
contract AnichessOrbsBurnPool is ForwarderRegistryContext, ERC1155TokenReceiver, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using MerkleProof for bytes32[];

    uint256 public immutable DENOMINATOR = 10_000;

    /// @notice The IERC1155Burnable erc1155 contracts burn to generate ASH.
    IERC1155Burnable public immutable SOURCE_TOKEN;

    /// @notice The initial time of the contract.
    uint256 public immutable INITIAL_TIME;

    /// @notice The duration of each cycle.
    uint256 public immutable CYCLE_DURATION;

    /// @notice The maximum cycle.
    uint256 public immutable MAX_CYCLE;

    /// @notice The IERC1155 erc1155 contract for unlocking the token multiplier.
    IERC1155Burnable public immutable MISSING_ORB;

    /// @notice The token ID for unlocking the token multiplier.
    uint256 public immutable MISSING_ORB_TOKEN_ID = 1;

    /// @notice The Merkle root for setting the anichess game multiplier.
    bytes32 public immutable MERKLE_ROOT;

    /// @notice The token multiplier.
    uint256 public immutable MISSING_ORB_MULTIPLIER;

    /// @notice The total amount of ASH burned in each cycle.
    mapping(uint256 => uint256) totalAshByCycle;

    /// @notice The total amount of ASH burned by each user in each cycle.
    mapping(uint256 => mapping(address => uint256)) public userAshByCycle;

    /// @notice The merkle leaf consumption status for the anichess game multiplier.
    mapping(bytes32 => bool) public leafConsumptionStatus;

    /// @notice The multiplier info for each user, first 128 bits are the anichess game multiplier numerator, last 128 bits are the token multiplier.
    mapping(address => uint256) public multiplierInfos;

    /// @notice The token weights.
    mapping(uint256 => uint256) tokenWeights;

    /// @notice Event emitted when ASHes are generated.
    event AshGenerated(
        address indexed burner,
        uint256 indexed cycle,
        uint256 timestamp,
        uint256[] ids,
        uint256[] values,
        uint256 totalAsh,
        uint256 multiplier
    );

    /// @notice Event emitted when the multiplier info is updated.
    event UpdateMultiplierInfo(address indexed recipient, uint256 curr, uint256 updated);

    /// @notice Error thrown when the token ID is invalid.
    error InvalidTokenId(address token, uint256 tokenId);

    /// @notice Error thrown when the array lengths are inconsistent.
    error InconsistentArrays();

    /// @notice Error thrown when the token is not approved.
    error InvalidToken();

    /// @notice Error thrown when the cycle is invalid.
    error InvalidCycle(uint256 cycle);

    /// @notice Error thrown when the token amount is invalid.
    error InvalidTokenAmount(uint256 amount, uint256 expectedAmount);

    /// @notice Error thrown when the payout has already been claimed.
    error AlreadySetAnichessGameMultiplierNumerator(address recipient);

    /// @notice Error thrown when the wallet already has the token multiplier unlocked.
    error AlreadyUnlockedTokenMultiplier(address wallet);

    /// @notice Error thrown when the proof is invalid.
    error InvalidProof();

    /// @notice Error thrown when the token weight is already set.
    error AlreadySetTokenWeight(uint256 tokenId);

    /**
     * @notice Constructor for the AnichessOrbsBurnPool contract.
     * @param initialTime The initial time of the contract.
     * @param cycleDuration The duration of each cycle.
     * @param maxCycle The maximum cycle.
     * @param sourceToken The IERC1155Burnable erc1155 contract burn to generate ASH.
     * @param tokenIds The token IDs.
     * @param weights The weights for each token.
     * @param merkleRoot The Merkle root of the AnichessGame multiplier claim.
     * @param missingOrb The IERC1155Burnable erc1155 missing orb contract for unlocking the token multiplier.
     * @param tokenMultiplier The token multiplier.
     * @param forwarderRegistry The forwarder registry contract.
     */
    constructor(
        uint256 initialTime,
        uint256 cycleDuration,
        uint256 maxCycle,
        IERC1155Burnable sourceToken,
        uint256[] memory tokenIds,
        uint256[] memory weights,
        bytes32 merkleRoot,
        IERC1155Burnable missingOrb,
        uint256 tokenMultiplier,
        IForwarderRegistry forwarderRegistry
    ) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(msg.sender) {
        INITIAL_TIME = initialTime;
        CYCLE_DURATION = cycleDuration;
        MAX_CYCLE = maxCycle;
        MERKLE_ROOT = merkleRoot;
        MISSING_ORB = missingOrb;
        SOURCE_TOKEN = sourceToken;
        MISSING_ORB_MULTIPLIER = tokenMultiplier;

        _setTokenWeights(tokenIds, weights);
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
     * @notice Set the token weights.
     * @param tokenIds The token IDs.
     * @param weights The weights for each token.
     * @dev Throws if the _msgSender is not the contract owner.
     * @dev Throws if the lengths of token IDs and weights are inconsistent.
     * @dev Throws if the token weight is already set.
     */
    function _setTokenWeights(uint256[] memory tokenIds, uint256[] memory weights) internal {
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

    function _setAnichessGameMultiplierNumerator(
        bytes32[] memory proof,
        address recipient,
        uint256 currMultiplierInfo,
        uint256 newAnichessGameMultiplierNumerator
    ) internal returns (uint256 updatedMultiplierInfo) {
        bytes32 leaf = keccak256(abi.encodePacked(recipient, newAnichessGameMultiplierNumerator));
        if (leafConsumptionStatus[leaf]) {
            revert AlreadySetAnichessGameMultiplierNumerator(recipient);
        }

        if (!proof.verify(MERKLE_ROOT, leaf)) {
            revert InvalidProof();
        }
        uint128 anichessGameMultiplierNumerator = uint128(currMultiplierInfo >> 128);
        if (anichessGameMultiplierNumerator > 0) {
            revert AlreadySetAnichessGameMultiplierNumerator(recipient);
        }

        // mask the AnichessGame multiplier numerator to keep only the last 128 bits of the existing multiplier
        updatedMultiplierInfo = (currMultiplierInfo & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | (uint256(newAnichessGameMultiplierNumerator) << 128);
        multiplierInfos[recipient] = updatedMultiplierInfo;
        leafConsumptionStatus[leaf] = true;

        emit UpdateMultiplierInfo(recipient, currMultiplierInfo, updatedMultiplierInfo);
    }

    function getMultiplierInfo(
        address wallet
    ) public view returns (uint256 multiplierInfo, uint128 anichessGameMultiplierNumerator, uint128 tokenMultiplier) {
        multiplierInfo = multiplierInfos[wallet];
        return (multiplierInfo, uint128(multiplierInfo >> 128), uint128(multiplierInfo));
    }

    /**
     * @notice Get the current cycle.
     * @return cycle The current cycle.
     */
    function currentCycle() public view returns (uint256) {
        return (block.timestamp - INITIAL_TIME) / CYCLE_DURATION;
    }

    /**
     * @notice Set the AnichessGame multiplier
     * @param proof The Merkle proof for the claim.
     * @param recipient The recipient of the payout.
     * @param newAnichessGameMultiplierNumerator The AnichessGame multiplier numerator for the recipient.
     * @dev Throws if the payout has already been claimed.
     * @dev Throws if the proof is invalid.
     */
    function setAnichessGameMultiplierNumerator(bytes32[] calldata proof, address recipient, uint256 newAnichessGameMultiplierNumerator) external {
        _setAnichessGameMultiplierNumerator(proof, recipient, multiplierInfos[recipient], newAnichessGameMultiplierNumerator);
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
    function onERC1155Received(address, address from, uint256 id, uint256 value, bytes calldata data) external override returns (bytes4) {
        if (msg.sender != address(MISSING_ORB)) {
            revert InvalidToken();
        }
        if (id != MISSING_ORB_TOKEN_ID) {
            revert InvalidTokenId(msg.sender, id);
        }

        if (value != 1) {
            revert InvalidTokenAmount(value, 1);
        }

        uint256 currMultiplierInfo = multiplierInfos[from];

        // unlock the token multiplier if data is not empty
        if (data.length > 0) {
            // decode proof & newAnichessGameMultiplierNumerator from data
            (bytes32[] memory proof, uint256 anichessGameMultiplierNumerator) = abi.decode(data, (bytes32[], uint256));
            (currMultiplierInfo) = _setAnichessGameMultiplierNumerator(proof, from, currMultiplierInfo, anichessGameMultiplierNumerator);
        }

        if (uint128(currMultiplierInfo) > 0) {
            revert AlreadyUnlockedTokenMultiplier(from);
        }

        // mask the token multiplier to keep only the first 128 bits of the multiplier
        uint256 updatedMultiplierInfo = (currMultiplierInfo & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000000000000000000000000000) |
            MISSING_ORB_MULTIPLIER;
        multiplierInfos[from] = updatedMultiplierInfo;

        emit UpdateMultiplierInfo(from, currMultiplierInfo, updatedMultiplierInfo);

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
        if (msg.sender != address(SOURCE_TOKEN)) {
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

        // boost the total ash based on the multipliers
        (uint256 multiplier, uint128 anichessGameMultiplierNumerator, uint128 tokenMultiplier) = getMultiplierInfo(from);
        if (tokenMultiplier > 0) {
            totalAsh *= tokenMultiplier;
        }
        if (anichessGameMultiplierNumerator > 0) {
            totalAsh = (totalAsh * anichessGameMultiplierNumerator) / DENOMINATOR;
        }

        // update the user status
        userAshByCycle[cycle][from] += totalAsh;
        // update the pool status
        totalAshByCycle[cycle] += totalAsh;

        IERC1155Burnable(msg.sender).batchBurnFrom(from, ids, values);
        emit AshGenerated(from, cycle, block.timestamp, ids, values, totalAsh, multiplier);

        return this.onERC1155BatchReceived.selector;
    }
}
