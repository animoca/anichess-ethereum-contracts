// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

/// @title ArenaBase
/// @notice An abstract contract to register game sessions and verify match result for arena-style game modes.
/// @dev Intended to be inherited by concrete arena contracts that handle admission payments and reward distribution logic.
abstract contract ArenaBase is EIP712, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    enum MatchResult {
        Draw,
        Player1Won,
        Player2Won
    }

    bytes32 public constant COMPLETE_MATCH_TYPEHASH =
        keccak256("CompleteMatch(uint256 matchId,address player1,address player2,uint256 player1SessionId,uint256 player2SessionId,uint8 result)");

    /// @notice The address of the message signer.
    address public messageSigner;

    /// @notice The mapping of session ids to accounts.
    mapping(uint256 sessionId => address account) public sessions;

    /// @notice An event emitted when the message signer is set.
    /// @param signer The address of the message signer.
    event MessageSignerSet(address signer);

    /// @notice An event emitted when a new game session is admitted.
    /// @param account The account who paid the entry fee.
    /// @param sessionId The session id.
    event Admission(address indexed account, uint256 indexed sessionId);

    /// @notice An event emitted when a match is completed.
    /// @param matchId The match id.
    /// @param player1 The first player account.
    /// @param player2 The second player account.
    /// @param player1SessionId The session id of the first player.
    /// @param player2SessionId The session id of the second player.
    /// @param result The result of the match, either Draw, Player1Won or Player2Won.
    event MatchCompleted(
        uint256 indexed matchId,
        address indexed player1,
        address indexed player2,
        uint256 player1SessionId,
        uint256 player2SessionId,
        MatchResult result
    );

    /// @notice Thrown when the session id is already admitted.
    /// @param sessionId The session id.
    error AlreadyAdmitted(uint256 sessionId);

    /// @notice Thrown when the session id is not found in the sessions mapping.
    /// @param sessionId The invalid session id.
    error SessionNotExists(uint256 sessionId);

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

    /// @notice An internal helper function to admit a new game session.
    /// @dev Reverts with {AlreadyAdmitted} if the session id is already admitted.
    /// @dev Emits an {Admission} event.
    /// @param sessionId The session id to admit.
    /// @param account The account who paid the entry fee.
    function _admit(uint256 sessionId, address account) internal {
        if (sessions[sessionId] != address(0)) {
            revert AlreadyAdmitted(sessionId);
        }

        sessions[sessionId] = account;
        emit Admission(account, sessionId);
    }

    /// @notice An internal helper function to complete a match.
    /// @dev Reverts with {SessionNotExists} if the winner or opponent session id is not found in the sessions mapping.
    /// @dev Reverts with {InvalidSignature} if the signature is invalid.
    /// @dev Emits a {MatchCompleted} event.
    /// @param matchId The match id.
    /// @param player1SessionId The session id of the first player.
    /// @param player2SessionId The session id of the second player.
    /// @param result The result of the match, either Draw, Player1Won or Player2Won.
    /// @param signature The signature of the match completion.
    function _completeMatch(
        uint256 matchId,
        uint256 player1SessionId,
        uint256 player2SessionId,
        MatchResult result,
        bytes calldata signature
    ) internal returns (address player1, address player2) {
        player1 = sessions[player1SessionId];
        if (player1 == address(0)) {
            revert SessionNotExists(player1SessionId);
        }
        player2 = sessions[player2SessionId];
        if (player2 == address(0)) {
            revert SessionNotExists(player2SessionId);
        }

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(COMPLETE_MATCH_TYPEHASH, matchId, player1, player2, player1SessionId, player2SessionId, result))
        );
        bool isValid = SignatureChecker.isValidSignatureNow(messageSigner, digest, signature);
        if (!isValid) {
            revert InvalidSignature();
        }

        delete sessions[player1SessionId];
        delete sessions[player2SessionId];
        emit MatchCompleted(matchId, player1, player2, player1SessionId, player2SessionId, result);
    }
}
