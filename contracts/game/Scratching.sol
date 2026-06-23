// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {RNGConsumer} from "../rng/RNGConsumer.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {PointsV2SpendingCallback} from "../points/PointsV2SpendingCallback.sol";

import {ScratchingLib} from "./libraries/ScratchingLib.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC721} from "@animoca/ethereum-contracts/contracts/token/ERC721/interfaces/IERC721.sol";
import {IScratchingBoard} from "./../token/interfaces/IScratchingBoard.sol";
import {IRNGProvider} from "../rng/interfaces/IRNGProvider.sol";
import {IScratching} from "./interfaces/IScratching.sol";
import {IPointsV2} from "../points/interface/IPointsV2.sol";

contract Scratching is TokenRecovery, RNGConsumer, PointsV2SpendingCallback, IScratching {
    using SafeERC20 for IERC20;
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    enum RequestType {
        MINT,
        SINGLE,
        ROW
    }

    struct ScratchRequest {
        uint256 tokenId;
        RequestType requestType;
    }

    address public immutable SCRATCHING_BOARD;
    IERC20 public immutable ERC20_TOKEN;
    uint8 public immutable ERC20_DECIMALS;

    address public erc20TokenHolder;

    mapping(uint256 tokenId => uint256) public boardPositions;
    mapping(uint256 requestId => ScratchRequest) public scratchRequests;
    mapping(uint256 tokenId => uint256 requestId) public pendingScratchRequest;

    event ERC20TokenHolderUpdated(address newHolder);
    event ScratchedSingle(uint256 tokenId, uint256 scratchPosition, ScratchingLib.RewardType rewardType, uint256 rewardAmount);
    event ScratchedRow(
        uint256 tokenId,
        uint256 startScratchPosition,
        uint256 endScratchPosition,
        ScratchingLib.RewardType rewardType,
        uint256 rewardAmount
    );

    error UnsupportedERC20TokenDecimals(uint8 decimals);
    error NotTheTokenOwner(uint256 tokenId, address owner, address caller);
    error ScratchRequestPending(uint256 tokenId, uint256 requestId);
    error IncorrectPaymentAmount(uint256 tokenId, uint256 requiredAmount, uint256 providedAmount);
    error UnknownRequestId(uint256 requestId);

    constructor(
        address scratchingBoard,
        IERC20 erc20Token,
        IRNGProvider rngProvider,
        IPointsV2 pointsV2
    ) ContractOwnership(msg.sender) RNGConsumer(rngProvider) PointsV2SpendingCallback(pointsV2) {
        SCRATCHING_BOARD = scratchingBoard;
        ERC20_TOKEN = erc20Token;
        ERC20_DECIMALS = IERC20Metadata(address(erc20Token)).decimals();
        require(ERC20_DECIMALS >= 2, UnsupportedERC20TokenDecimals(ERC20_DECIMALS));
    }

    /// @notice Gets the M8 mint price of a ScratchingBoard NFT, which is the price of the first scratch.
    /// @return the mint price in M8.
    function getMintPrice() public pure returns (uint256) {
        return ScratchingLib.getSingleScratchPrice(0);
    }

    /// @notice Gets the M8 price of a single scratch for a given tokenId.
    /// @param tokenId the tokenId of the ScratchingBoard NFT.
    /// @return the single scratch price in M8.
    function getSingleScratchPrice(uint256 tokenId) public view returns (uint256) {
        return ScratchingLib.getSingleScratchPrice(boardPositions[tokenId]);
    }

    /// @notice Gets the M8 price of scratching the rest of the row for a given tokenId.
    /// @param tokenId the tokenId of the ScratchingBoard NFT.
    /// @return the row scratch price in M8.
    function getRowScratchPrice(uint256 tokenId) public view returns (uint256) {
        return ScratchingLib.getRowScratchPrice(boardPositions[tokenId]);
    }

    /// @notice Sets the address of the ERC20 token holder.
    /// @dev Reverts with {NotContractOwner} if the caller is not the contract owner.
    /// @dev Emits a {ERC20TokenHolderUpdated} event.
    /// @param holder the address of the new ERC20 token holder.
    function setERC20TokenHolder(address holder) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        erc20TokenHolder = holder;
        emit ERC20TokenHolderUpdated(holder);
    }

    function _onPointsSpent(address spender, uint256 amount, bytes calldata data) internal override {
        (RequestType requestType, uint256 tokenId) = abi.decode(data, (RequestType, uint256));
        uint256 price;
        uint32 nbRandomWords;
        if (requestType == RequestType.MINT) {
            tokenId = IScratchingBoard(SCRATCHING_BOARD).mint(spender);
            price = getMintPrice();
            nbRandomWords = 1;
        } else {
            address owner = IERC721(SCRATCHING_BOARD).ownerOf(tokenId);
            require(owner == spender, NotTheTokenOwner(tokenId, owner, spender));
            require(pendingScratchRequest[tokenId] == 0, ScratchRequestPending(tokenId, pendingScratchRequest[tokenId]));

            if (requestType == RequestType.SINGLE) {
                price = getSingleScratchPrice(tokenId);
                nbRandomWords = 1;
            } else {
                price = getRowScratchPrice(tokenId);
                nbRandomWords = uint32(ScratchingLib.remainingScratchesInRow(boardPositions[tokenId]));
            }
        }
        require(price == amount, IncorrectPaymentAmount(tokenId, price, amount));
        uint256 requestId = _requestRandomness(nbRandomWords);
        scratchRequests[requestId] = ScratchRequest({tokenId: tokenId, requestType: requestType});
        pendingScratchRequest[tokenId] = requestId;
    }

    /// @inheritdoc RNGConsumer
    /// @notice Handles the randomness fulfillment for scratch requests (single and row).
    /// @dev Reverts with {UnknownRequestId} if the requestId is not known.
    /// @dev Emits a {ScratchedSingle} event for single scratch requests.
    /// @dev Emits a {ScratchedRow} event for row scratch requests.
    /// @dev If the scratch results in a reward, emits a burn {Transfer} event from the ScratchingBoard contract.
    /// @dev If the scratch results in a reward, emits a reward {Transfer} event from the ERC20 token contract.
    /// @param requestId the request ID of the randomness request.
    /// @param randomWords the randomness result.
    function _fulfillRandomness(uint256 requestId, uint256[] calldata randomWords) internal override {
        ScratchRequest storage scratchRequest = scratchRequests[requestId];
        uint256 tokenId = scratchRequest.tokenId;
        pendingScratchRequest[tokenId] = 0;

        if (scratchRequest.requestType <= RequestType.SINGLE) {
            _fulfillScratchSingle(tokenId, randomWords[0]);
        } else {
            _fulfillScratchRow(tokenId, randomWords);
        }
    }

    function _fulfillScratchSingle(uint256 tokenId, uint256 randomWord) internal {
        uint256 scratchPosition = boardPositions[tokenId];
        ScratchingLib.ScratchResult memory result = ScratchingLib.getSingleScratchResult(scratchPosition, randomWord, ERC20_DECIMALS);
        uint256 rewardAmount = result.rewardAmount;
        if (result.rewardType == ScratchingLib.RewardType.Snowball) {
            boardPositions[tokenId] = scratchPosition + 1;
        } else {
            _deliverReward(tokenId, rewardAmount);
        }
        emit ScratchedSingle(tokenId, scratchPosition, result.rewardType, rewardAmount);
    }

    function _fulfillScratchRow(uint256 tokenId, uint256[] calldata randomWords) internal {
        uint256 scratchPosition = boardPositions[tokenId];
        (uint256 lastScratchedPosition, ScratchingLib.ScratchResult memory result) = ScratchingLib.getRowScratchResults(
            scratchPosition,
            randomWords,
            ERC20_DECIMALS
        );
        uint256 rewardAmount = result.rewardAmount;
        if (result.rewardType == ScratchingLib.RewardType.Snowball) {
            boardPositions[tokenId] = lastScratchedPosition + 1;
        } else {
            if (lastScratchedPosition != scratchPosition) {
                boardPositions[tokenId] = lastScratchedPosition;
            }
            _deliverReward(tokenId, rewardAmount);
        }
        emit ScratchedRow(tokenId, scratchPosition, lastScratchedPosition, result.rewardType, rewardAmount);
    }

    function _deliverReward(uint256 tokenId, uint256 rewardAmount) internal {
        address currentOwner = IERC721(SCRATCHING_BOARD).ownerOf(tokenId);
        ERC20_TOKEN.safeTransferFrom(erc20TokenHolder, currentOwner, rewardAmount);
        IScratchingBoard(SCRATCHING_BOARD).burn(tokenId);
    }
}
