// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {AccessControl} from "@animoca/ethereum-contracts/contracts/access/AccessControl.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";
import {Pause} from "@animoca/ethereum-contracts/contracts/lifecycle/Pause.sol";
import {PauseStorage} from "@animoca/ethereum-contracts/contracts/lifecycle/libraries/PauseStorage.sol";
import {IGambitMatchCompleteCallback} from "./interfaces/IGambitMatchCompleteCallback.sol";

contract Gambit is AccessControl, PayoutWallet, EIP712, Pause {
    using SafeERC20 for IERC20;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using AccessControlStorage for AccessControlStorage.Layout;
    using PauseStorage for PauseStorage.Layout;

    struct Match {
        address p1;
        address p2;
        address p1MoveKey;
        address p2MoveKey;
        uint256 p1Balance;
        uint256 p2Balance;
        uint256 platformFee;
    }

    bytes32 public constant JOIN_MATCH_TYPEHASH = keccak256("JoinMatch(uint256 matchId,address player,address playerMoveKey,uint256 matchDeadline)");
    bytes32 public constant COMPLETE_MATCH_TYPEHASH = keccak256("CompleteMatch(uint256 matchId,address winner)");
    bytes32 public constant DRAW_MATCH_TYPEHASH = keccak256("DrawMatch(uint256 matchId,address player)");
    bytes32 public constant REFUND_MATCH_TYPEHASH = keccak256("RefundMatch(uint256 matchId,address player)");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant REFEREE_ROLE = keccak256("REFEREE_ROLE");

    IGambitMatchCompleteCallback public matchCompleteCallback;
    IERC20 public immutable BUYIN_TOKEN;
    uint256 public buyIn;
    uint256 public platformFee;

    mapping(uint256 matchId => Match matchInfo) public matches;

    /// @notice Emitted when the match complete callback is updated.
    /// @param newCallback The address of the new match complete callback.
    event MatchCompleteCallbackUpdated(address indexed newCallback);

    /// @notice Emitted when the platform fee is updated.
    /// @param oldPlatformFee The previous platform fee.
    /// @param newPlatformFee The new platform fee.
    event PlatformFeeUpdated(uint256 indexed oldPlatformFee, uint256 indexed newPlatformFee);

    /// @notice Emitted when the buy-in amount is updated.
    /// @param oldBuyIn The previous buy-in amount.
    /// @param newBuyIn The new buy-in amount.
    event BuyInUpdated(uint256 indexed oldBuyIn, uint256 indexed newBuyIn);

    /// @notice Emitted when a player joins a match.
    /// @param matchId The ID of the match.
    /// @param player The address of the player joining the match.
    /// @param playerMoveKey The address of the move key for the player.
    /// @param isPlayer1 A boolean indicating if the player is Player 1.
    /// @param buyIn The buy-in amount for the match.
    /// @param platformFee The platform fee for the match.
    event PlayerJoined(
        uint256 indexed matchId,
        address indexed player,
        address indexed playerMoveKey,
        bool isPlayer1,
        uint256 buyIn,
        uint256 platformFee
    );

    /// @notice Emitted when a match is completed.
    /// @param matchId The ID of the match.
    /// @param winner The address of the winning player.
    /// @param prizeAmount The amount awarded to the winner
    event MatchCompleted(uint256 indexed matchId, address indexed winner, uint256 prizeAmount);

    /// @notice Emitted when a match is refunded.
    /// @param matchId The ID of the match.
    /// @param player The address of the player being refunded.
    /// @param refundAmount The amount refunded to the player.
    event MatchRefunded(uint256 indexed matchId, address indexed player, uint256 refundAmount);

    //@notice Thrown when the platform fee exceeds the buy-in amount.
    error PlatformFeeExceedsBuyIn(uint256 buyInAmount, uint256 newPlatformFee);

    //@notice Thrown when the signature is expired.
    error ExpiredSignature();

    //@notice Thrown when the player is zero address.
    error InvalidPlayer();

    /// @notice Thrown when the player move key is zero address.
    error InvalidPlayerMoveKey();

    /// @notice Thrown when the player is not part of the match.
    /// @param matchId The ID of the match.
    /// @param player The address of the player.
    error NotMatchPlayer(uint256 matchId, address player);

    /// @notice Thrown when the player has already joined the match.
    /// @param matchId The ID of the match.
    /// @param player The address of the player.
    error PlayerAlreadyJoined(uint256 matchId, address player);

    /// @notice Thrown when the match has already refunded a player.
    /// @param matchId The ID of the match.
    /// @param player The address of the player.
    error PlayerAlreadyRefunded(uint256 matchId, address player);

    /// @notice Thrown when the match is full.
    /// @param matchId The ID of the match.
    error MatchIsFull(uint256 matchId);

    /// @notice Thrown when the match does not have sufficient players to complete.
    /// @param matchId The ID of the match.
    error InsufficientPlayers(uint256 matchId);

    /// @notice Thrown when the match funds are insufficient to complete.
    /// @param matchId The ID of the match.
    error InsufficientMatchBalance(uint256 matchId);

    /// @notice Thrown when the match has already concluded.
    /// @param matchId The ID of the match.
    error MatchAlreadyConcluded(uint256 matchId);

    /// @notice Thrown when a callback call fails.
    /// @param target The address of the callback contract.
    /// @param matchId The ID of the match.
    /// @param winner The address of the winning player.
    /// @param loser The address of the losing player.
    /// @param prize The amount awarded to the winner.
    /// @param totalFee The total platform fee for the match.
    error CallbackRejected(address target, uint256 matchId, address winner, address loser, uint256 prize, uint256 totalFee);

    constructor(
        address payable payoutAddress,
        IERC20 buyInToken,
        uint256 buyIn_,
        uint256 platformFee_
    ) ContractOwnership(msg.sender) EIP712("Gambit", "1") PayoutWallet(payoutAddress) Pause(true) {
        BUYIN_TOKEN = buyInToken;
        _setBuyIn(buyIn_);
        if (platformFee_ > 0) {
            _setPlatformFee(platformFee_);
        }
    }

    /// @notice Sets the match complete callback.
    /// @dev Reverts if caller is not the contract owner.
    /// @dev Emits a {MatchCompleteCallbackUpdated} event.
    /// @param newCallback  The address of the new match complete callback.
    function setMatchCompleteCallback(address newCallback) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        matchCompleteCallback = IGambitMatchCompleteCallback(newCallback);
        emit MatchCompleteCallbackUpdated(newCallback);
    }

    function _setPlatformFee(uint256 newPlatformFee) internal {
        require(newPlatformFee < buyIn, PlatformFeeExceedsBuyIn(buyIn, newPlatformFee));

        uint256 oldPlatformFee = platformFee;
        platformFee = newPlatformFee;
        emit PlatformFeeUpdated(oldPlatformFee, newPlatformFee);
    }

    /// @notice Sets the platform fee.
    /// @dev Reverts with {NotRoleHolder} if sender does not have ADMIN_ROLE.
    /// @dev Emits a {PlatformFeeUpdated} event.
    /// @param newPlatformFee The new platform fee.
    function setPlatformFee(uint256 newPlatformFee) external {
        AccessControlStorage.layout().enforceHasRole(ADMIN_ROLE, _msgSender());
        _setPlatformFee(newPlatformFee);
    }

    function _setBuyIn(uint256 newBuyIn) internal {
        require(platformFee < newBuyIn, PlatformFeeExceedsBuyIn(newBuyIn, platformFee));

        uint256 oldBuyIn = buyIn;
        buyIn = newBuyIn;
        emit BuyInUpdated(oldBuyIn, newBuyIn);
    }

    /// @notice Sets the buy-in amount for matches.
    /// @dev Reverts with {NotRoleHolder} if sender does not have ADMIN_ROLE.
    /// @dev Emits a {BuyInUpdated} event.
    /// @param newBuyIn The new buy-in amount.
    function setBuyIn(uint256 newBuyIn) external {
        AccessControlStorage.layout().enforceHasRole(ADMIN_ROLE, _msgSender());
        _setBuyIn(newBuyIn);
    }

    function _isMatchConcluded(address player1, address player2, uint256 p1Balance, uint256 p2Balance) internal pure returns (bool) {
        if (player2 != address(0)) {
            return p1Balance == 0 && p2Balance == 0;
        } else if (player1 != address(0)) {
            return p1Balance == 0;
        } else {
            return false;
        }
    }

    /// @notice Checks if a match is concluded.
    /// @param matchId  The ID of the match to check.
    /// @return isConcluded A boolean indicating whether the match is concluded or not.
    function isMatchConcluded(uint256 matchId) external view returns (bool) {
        Match storage matchInfo = matches[matchId];
        return _isMatchConcluded(matchInfo.p1, matchInfo.p2, matchInfo.p1Balance, matchInfo.p2Balance);
    }

    /// @notice Allows a player to join a match and escrow their buy-in amount.
    /// @dev Reverts if the signature is invalid or expired.
    /// @dev Reverts if the player or playerMoveKey is the zero address.
    /// @dev Reverts if the contract is paused.
    /// @dev Reverts if the match is already full.
    /// @dev Emits a {PlayerJoined} event.
    /// @param matchId The ID of the match to join.
    /// @param player The address of the player joining the match.
    /// @param playerMoveKey The address of the move key for the player.
    /// @param matchDeadline The deadline for the match.
    /// @param signature The signature of the authorized signer.
    function joinMatch(uint256 matchId, address player, address playerMoveKey, uint256 matchDeadline, bytes calldata signature) external {
        require(block.timestamp < matchDeadline, ExpiredSignature());
        require(player != address(0), InvalidPlayer());
        require(playerMoveKey != address(0), InvalidPlayerMoveKey());
        PauseStorage.layout().enforceIsNotPaused();

        {
            bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(JOIN_MATCH_TYPEHASH, matchId, player, playerMoveKey, matchDeadline)));
            address recoveredSigner = ECDSA.recover(digest, signature);
            AccessControlStorage.layout().enforceHasRole(REFEREE_ROLE, recoveredSigner);
        }

        Match storage matchInfo = matches[matchId];
        address player1 = matchInfo.p1;
        address player2 = matchInfo.p2;
        require(!_isMatchConcluded(player1, player2, matchInfo.p1Balance, matchInfo.p2Balance), MatchAlreadyConcluded(matchId));

        if (player1 == address(0)) {
            uint256 curPlatformFee = platformFee;
            uint256 curBuyIn = buyIn;
            matchInfo.p1 = player;
            matchInfo.p1MoveKey = playerMoveKey;
            matchInfo.platformFee = curPlatformFee;
            matchInfo.p1Balance = curBuyIn;
            BUYIN_TOKEN.safeTransferFrom(player, address(this), curBuyIn);
            emit PlayerJoined(matchId, player, playerMoveKey, true, curBuyIn, curPlatformFee);
        } else if (player2 == address(0)) {
            require(player != player1, PlayerAlreadyJoined(matchId, player));

            uint256 p1BuyIn = matchInfo.p1Balance;
            uint256 fee = matchInfo.platformFee;

            matchInfo.p2 = player;
            matchInfo.p2MoveKey = playerMoveKey;
            matchInfo.p2Balance = p1BuyIn;

            BUYIN_TOKEN.safeTransferFrom(player, address(this), p1BuyIn);
            emit PlayerJoined(matchId, player, playerMoveKey, false, p1BuyIn, fee);
        } else {
            revert MatchIsFull(matchId);
        }
    }

    /// @notice Completes a match by providing a signature
    /// @dev Reverts if the signature is invalid.
    /// @dev Reverts if the match funds are insufficient to complete.
    /// @dev Reverts if the winner is not a player in the match.
    /// @dev Emits a {MatchCompleted} event.
    /// @param matchId The ID of the match to complete.
    /// @param winner The address of the winner.
    /// @param signature The signature of the authorized signer.
    function completeMatch(uint256 matchId, address winner, bytes calldata signature) external {
        {
            bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(COMPLETE_MATCH_TYPEHASH, matchId, winner)));
            address recoveredSigner = ECDSA.recover(digest, signature);
            AccessControlStorage.layout().enforceHasRole(REFEREE_ROLE, recoveredSigner);
        }

        Match storage matchInfo = matches[matchId];
        uint256 p1Balance = matchInfo.p1Balance;
        uint256 p2Balance = matchInfo.p2Balance;
        require(p1Balance > 0 && p2Balance > 0, InsufficientMatchBalance(matchId));

        address player1 = matchInfo.p1;
        address player2 = matchInfo.p2;
        address loser;
        if (winner == player1) {
            loser = player2;
        } else if (winner == player2) {
            loser = player1;
        } else {
            revert NotMatchPlayer(matchId, winner);
        }

        uint256 totalFee = matchInfo.platformFee * 2;
        uint256 prize = p1Balance + p2Balance - totalFee;
        matchInfo.p1Balance = 0;
        matchInfo.p2Balance = 0;
        matchInfo.platformFee = 0;

        if (totalFee != 0) {
            BUYIN_TOKEN.safeTransfer(PayoutWalletStorage.layout().payoutWallet(), totalFee);
        }

        BUYIN_TOKEN.safeTransfer(winner, prize);
        emit MatchCompleted(matchId, winner, prize);

        address target = address(matchCompleteCallback);
        if (target != address(0)) {
            require(
                IGambitMatchCompleteCallback(target).onMatchCompleted(matchId, winner, loser, prize, totalFee) ==
                    IGambitMatchCompleteCallback.onMatchCompleted.selector,
                CallbackRejected(target, matchId, winner, loser, prize, totalFee)
            );
        }
    }

    /// @notice Allows a player to declare a match as a draw and claim a refund of their buy-in amount minus the platform fee.
    /// @dev Reverts if the signature is invalid.
    /// @dev Reverts if the match funds are insufficient to draw.
    /// @dev Reverts if the player is not part of the match.
    /// @dev Reverts if the player has already been refunded.
    /// @dev Emits a {MatchRefunded} event.
    /// @param matchId The ID of the match to draw.
    /// @param player The address of the player requesting the draw.
    /// @param signature The signature of the authorized signer.
    function drawMatch(uint256 matchId, address player, bytes calldata signature) external {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(DRAW_MATCH_TYPEHASH, matchId, player)));
        address recoveredSigner = ECDSA.recover(digest, signature);
        AccessControlStorage.layout().enforceHasRole(REFEREE_ROLE, recoveredSigner);

        Match storage matchInfo = matches[matchId];
        address player1 = matchInfo.p1;
        address player2 = matchInfo.p2;
        require(player1 != address(0) && player2 != address(0), InsufficientPlayers(matchId));

        uint256 p1Balance = matchInfo.p1Balance;
        uint256 p2Balance = matchInfo.p2Balance;
        require(!_isMatchConcluded(player1, player2, p1Balance, p2Balance), MatchAlreadyConcluded(matchId));

        uint256 refundAmount;
        uint256 fee = matchInfo.platformFee;
        if (fee != 0) {
            if (player == player1) {
                refundAmount = p1Balance - fee;
                matchInfo.p1Balance = 0;
                matchInfo.platformFee = 0;
                matchInfo.p2Balance = p2Balance - fee;
            } else if (player == player2) {
                refundAmount = p2Balance - fee;
                matchInfo.p2Balance = 0;
                matchInfo.platformFee = 0;
                matchInfo.p1Balance = p1Balance - fee;
            } else {
                revert NotMatchPlayer(matchId, player);
            }

            uint256 totalFee = fee * 2;
            BUYIN_TOKEN.safeTransfer(PayoutWalletStorage.layout().payoutWallet(), totalFee);
        } else {
            if (player == player1) {
                refundAmount = p1Balance;
                require(refundAmount != 0, PlayerAlreadyRefunded(matchId, player));
                matchInfo.p1Balance = 0;
            } else if (player == player2) {
                refundAmount = p2Balance;
                require(refundAmount != 0, PlayerAlreadyRefunded(matchId, player));
                matchInfo.p2Balance = 0;
            } else {
                revert NotMatchPlayer(matchId, player);
            }
        }

        BUYIN_TOKEN.safeTransfer(player, refundAmount);
        emit MatchRefunded(matchId, player, refundAmount);
    }

    /// @notice Allows a player to claim a refund for a match that has not concluded.
    /// @dev Reverts if the signature is invalid.
    /// @dev Reverts if the match has already been concluded.
    /// @dev Reverts if the player is not part of the match.
    /// @dev Reverts if the player has already been refunded.
    /// @dev Emits a {MatchRefunded} event.
    /// @param matchId The ID of the match to refund.
    /// @param player The address of the player requesting the refund.
    /// @param signature The signature of the authorized signer.
    function refundMatch(uint256 matchId, address player, bytes calldata signature) external {
        require(player != address(0), InvalidPlayer());

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(REFUND_MATCH_TYPEHASH, matchId, player)));
        address recoveredSigner = ECDSA.recover(digest, signature);
        AccessControlStorage.layout().enforceHasRole(REFEREE_ROLE, recoveredSigner);

        Match storage matchInfo = matches[matchId];
        address player1 = matchInfo.p1;
        address player2 = matchInfo.p2;
        uint256 p1Balance = matchInfo.p1Balance;
        uint256 p2Balance = matchInfo.p2Balance;
        require(!_isMatchConcluded(player1, player2, p1Balance, p2Balance), MatchAlreadyConcluded(matchId));

        if (player == player1) {
            require(p1Balance != 0, PlayerAlreadyRefunded(matchId, player1));
            matchInfo.p1Balance = 0;
            matchInfo.platformFee = 0;

            BUYIN_TOKEN.safeTransfer(player1, p1Balance);
            emit MatchRefunded(matchId, player1, p1Balance);
        } else if (player == player2) {
            require(p2Balance != 0, PlayerAlreadyRefunded(matchId, player2));
            matchInfo.p2Balance = 0;
            matchInfo.platformFee = 0;

            BUYIN_TOKEN.safeTransfer(player2, p2Balance);
            emit MatchRefunded(matchId, player2, p2Balance);
        } else {
            revert NotMatchPlayer(matchId, player);
        }
    }

    /// @notice Allows an admin to refund a match.
    /// @dev Reverts if caller is not an admin.
    /// @dev Reverts if the match has already been concluded.
    /// @param matchId The ID of the match to refund.
    function refundMatch(uint256 matchId) external {
        AccessControlStorage.layout().enforceHasRole(ADMIN_ROLE, _msgSender());

        Match storage matchInfo = matches[matchId];
        address player1 = matchInfo.p1;
        address player2 = matchInfo.p2;
        uint256 refundAmountP1 = matchInfo.p1Balance;
        uint256 refundAmountP2 = matchInfo.p2Balance;
        require(!_isMatchConcluded(player1, player2, refundAmountP1, refundAmountP2), MatchAlreadyConcluded(matchId));

        matchInfo.platformFee = 0;
        if (refundAmountP1 != 0) {
            matchInfo.p1Balance = 0;

            BUYIN_TOKEN.safeTransfer(player1, refundAmountP1);
            emit MatchRefunded(matchId, player1, refundAmountP1);
        }

        if (refundAmountP2 != 0) {
            matchInfo.p2Balance = 0;

            BUYIN_TOKEN.safeTransfer(player2, refundAmountP2);
            emit MatchRefunded(matchId, player2, refundAmountP2);
        }
    }
}
