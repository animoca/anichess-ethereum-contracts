// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IORBNFT} from "./interface/IORBNFT.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {Pause, PauseStorage, ContractOwnership} from "@animoca/ethereum-contracts/contracts/lifecycle/Pause.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";

/// @title TokenClaim Contract
/// @notice Allows users to claim tokens based on a signature verification process.
contract TokenClaim is Pause, TokenRecovery {
    using ECDSA for bytes32;
    using PauseStorage for PauseStorage.Layout;
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    // underscore is added to prevent naming conflict with contract.signer (from hardhat)
    address public messageSigner;
    IORBNFT public immutable ORB_INVENTORY;

    mapping(address => uint256) private _nonces;

    event TokensClaimed(address to, uint256[] orbIds, uint256[] orbCount, uint256[] xp, uint256 nonce);
    event MessageSignerUpdated(address oldMessageSigner, address newMessageSigner);

    /// @notice Contract constructor.
    /// @param inventory_ The address of the OrbInventory contract.
    /// @param messageSigner_ The initial signer address.
    constructor(address inventory_, address messageSigner_) Pause(false) ContractOwnership(msg.sender) {
        require(inventory_ != address(0), "TokenClaim: invalid inventory");
        require(messageSigner_ != address(0), "TokenClaim: invalid signer");

        ORB_INVENTORY = IORBNFT(inventory_);
        messageSigner = messageSigner_;

        emit MessageSignerUpdated(address(0), messageSigner_);
    }

    /// @notice Updates the signer address.
    /// @dev Only the contract owner can call this function.
    /// @param newMessageSigner The new signer address.
    function setMessageSigner(address newMessageSigner) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        require(newMessageSigner != address(0), "TokenClaim: invalid signer");

        emit MessageSignerUpdated(messageSigner, newMessageSigner);

        messageSigner = newMessageSigner;
    }

    /// @notice Gets the nonce for the specified user.
    /// @param user The user's address.
    /// @return The nonce value.
    function getNonce(address user) public view returns (uint256) {
        return _nonces[user];
    }

    /// @notice Recovers the signer address from the provided parameters and signature.
    /// @param to The recipient address.
    /// @param orbIds The array of Orb IDs.
    /// @param xp The array of experience values.
    /// @param nonce The nonce value.
    /// @param orbCount The array of Orb count values.
    /// @param signature The signature to recover the signer from.
    /// @return The recovered signer address.
    function _recoverSigner(
        address to,
        uint256[] calldata orbIds,
        uint256[] calldata xp,
        uint256 nonce,
        uint256[] calldata orbCount,
        bytes calldata signature
    ) internal view returns (address) {
        bytes32 hash_ = keccak256(abi.encodePacked(to, orbIds, xp, nonce, orbCount, block.chainid));
        return hash_.toEthSignedMessageHash().recover(signature);
    }

    /// @notice Claims tokens for the specified user.
    /// @dev ReentrancyGuard is used to prevent reentrancy attacks.
    /// @param to The recipient address.
    /// @param orbIds The array of Orb IDs.
    /// @param xp The array of experience values.
    /// @param orbCount The array of Orb count values.
    /// @param signature The signature for verification.
    function claimTokens(address to, uint256[] calldata orbIds, uint256[] calldata xp, uint256[] calldata orbCount, bytes calldata signature) public {
        PauseStorage.layout().enforceIsNotPaused();
        uint256 nonce = _nonces[to];

        require(_recoverSigner(to, orbIds, xp, nonce, orbCount, signature) == messageSigner, "TokenClaim: invalid signature");

        _nonces[to]++;

        ORB_INVENTORY.safeBatchMint(to, orbIds, orbCount, "");

        emit TokensClaimed(to, orbIds, orbCount, xp, nonce);
    }
}
