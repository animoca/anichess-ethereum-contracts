// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

/// @title ArenaBase
/// @notice An abstract contract to admit players and verify match results for arena games.
/// @dev Intended to be inherited by concrete arena contracts that handle admission payments and reward distribution logic.
abstract contract ArenaBase is EIP712, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    enum MatchResult {
        Player1Won,
        Player2Won,
        Draw
    }

    bytes32 public constant COMPLETE_MATCH_TYPEHASH = keccak256("CompleteMatch(uint256 matchId,address player1,address player2,uint8 result)");

    /// @notice The address of the message signer.
    address public messageSigner;

    /// @notice The mapping to indicate if an account is admitted.
    mapping(address account => bool admitted) public admitted;

    /// @notice An event emitted when the message signer is set.
    /// @param signer The address of the message signer.
    event MessageSignerSet(address signer);

    /// @notice An event emitted when a player is admitted.
    /// @param account The account who paid the entry fee.
    event Admission(address indexed account);

    /// @notice An event emitted when a match is completed.
    /// @param matchId The match id.
    /// @param player1 The first player account.
    /// @param player2 The second player account.
    /// @param result The result of the match, either Draw, Player1Won or Player2Won.
    event MatchCompleted(uint256 indexed matchId, address indexed player1, address indexed player2, MatchResult result);

    /// @notice Thrown when the account is already admitted during the admission process.
    /// @param account The player account.
    error AlreadyAdmitted(address account);

    /// @notice Thrown when the account is not admitted during the match completion process.
    /// @param account The player account.
    error PlayerNotAdmitted(address account);

    /// @notice Thrown when the signature is invalid for the match completion.
    error InvalidSignature();

    /// @notice Constructor.
    /// @dev Emits a {MessageSignerSet} event.
    /// @param messageSigner_ The address of the message signer.
    constructor(address messageSigner_) EIP712("Arena", "1.0") ContractOwnership(msg.sender) {
        messageSigner = messageSigner_;
        emit MessageSignerSet(messageSigner);
    }

    /// @notice Sets the message signer.
    /// @dev Reverts with {NotContractOwner} if the sender is not the contract owner.
    /// @dev Emits a {MessageSignerSet} event.
    /// @param signer The address of the message signer.
    function setMessageSigner(address signer) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        messageSigner = signer;
        emit MessageSignerSet(signer);
    }

    /// @notice An internal helper function to admit a new game play.
    /// @dev Reverts with {AlreadyAdmitted} if the account is already admitted.
    /// @dev Emits an {Admission} event.
    /// @param account The account who paid the entry fee.
    function _admit(address account) internal {
        if (admitted[account] == true) {
            revert AlreadyAdmitted(account);
        }

        admitted[account] = true;
        emit Admission(account);
    }

    /// @notice An internal helper function to verify a match result and complete the match.
    /// @dev Reverts with {PlayerNotAdmitted} if either player is not admitted.
    /// @dev Reverts with {InvalidSignature} if the signature is invalid.
    /// @dev Emits a {MatchCompleted} event.
    /// @param matchId The match id.
    /// @param player1 The first player account.
    /// @param player2 The second player account.
    /// @param result The result of the match, either Player1Won, Player2Won or Draw.
    /// @param signature The signature of the match completion.
    function _completeMatch(uint256 matchId, address player1, address player2, MatchResult result, bytes calldata signature) internal {
        if (!admitted[player1]) {
            revert PlayerNotAdmitted(player1);
        }
        if (!admitted[player2]) {
            revert PlayerNotAdmitted(player2);
        }

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(COMPLETE_MATCH_TYPEHASH, matchId, player1, player2, result)));
        bool isValid = SignatureChecker.isValidSignatureNow(messageSigner, digest, signature);
        if (!isValid) {
            revert InvalidSignature();
        }

        admitted[player1] = false;
        admitted[player2] = false;
        emit MatchCompleted(matchId, player1, player2, result);
    }
}
