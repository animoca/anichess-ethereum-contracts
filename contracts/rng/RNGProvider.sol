// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {IRNGConsumer} from "./interfaces/IRNGConsumer.sol";
import {IRNGProvider} from "./interfaces/IRNGProvider.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract RNGProvider is IRNGProvider, ContractOwnership, EIP712 {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    bytes32 public constant FULFILL_RANDOMNESS_TYPEHASH = keccak256("FulfillRandomness(uint256 requestId,uint256[] randomWords)");

    address public signer;
    uint256 public nonce;

    mapping(uint256 requestId => RequestDetails requestDetails) private _requestDetails;
    mapping(address consumer => bool) public consumersWhitelist;

    event SignerSet(address newSigner);
    event ConsumerWhitelistingUpdated(address consumer, bool whitelisted);

    error ConsumerNotWhitelisted(address consumer);
    error InvalidSignature();
    error RequestAlreadyFulfilled(uint256 requestId);
    error UnknownRequestId(uint256 requestId);
    error WrongRandomWordsCount(uint256 expected, uint256 actual);

    /// @param signer_ the address of the signer
    constructor(address signer_) ContractOwnership(msg.sender) EIP712("RNGProvider", "1") {
        signer = signer_;
        emit SignerSet(signer_);
    }

    /// @notice Sets the address of the signer.
    /// @dev Reverts with {NotContractOwner} if the caller is not the contract owner.
    /// @param signer_ the address of the signer.
    function setSigner(address signer_) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        signer = signer_;
        emit SignerSet(signer_);
    }

    /// @notice Adds or removes a consumer from the whitelist.
    /// @dev Reverts with {NotContractOwner} if the caller is not the contract owner.
    /// @param consumer the address of the consumer.
    /// @param whitelisted whether the consumer is whitelisted or not.
    function whitelistConsumer(address consumer, bool whitelisted) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());
        consumersWhitelist[consumer] = whitelisted;
        emit ConsumerWhitelistingUpdated(consumer, whitelisted);
    }

    /// @inheritdoc IRNGProvider
    /// @dev Reverts with {ConsumerNotWhitelisted} if the caller is not whitelisted.
    function requestRandomness(uint32 numWords) external override returns (uint256 requestId) {
        require(consumersWhitelist[msg.sender], ConsumerNotWhitelisted(msg.sender));
        requestId = uint256(keccak256(abi.encodePacked(msg.sender, numWords, nonce++)));
        _requestDetails[requestId] = RequestDetails({consumer: msg.sender, fulfilled: false, numWords: numWords, randomWords: new uint256[](0)});
        emit RandomnessRequested(msg.sender, requestId, numWords);
    }

    /// @inheritdoc IRNGProvider
    /// @dev Reverts with {InvalidSignature} if the signature is invalid.
    /// @dev Reverts with {UnknownRequestId} if the requestId is not known.
    /// @dev Reverts with {RequestAlreadyFulfilled} if the request has already been fulfilled.
    /// @dev Reverts with {WrongRandomWordsCount} if the number of random words does not match the requested number.
    /// @dev Calls the {fulfillRandomness} function of the consumer.
    function fulfillRandomness(uint256 requestId, uint256[] calldata randomWords, bytes calldata signature) external override {
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(FULFILL_RANDOMNESS_TYPEHASH, requestId, keccak256(abi.encodePacked(randomWords)))));
        if (ECDSA.recover(digest, signature) != signer) revert InvalidSignature();

        RequestDetails storage request = _requestDetails[requestId];
        address consumer = request.consumer;
        require(consumer != address(0), UnknownRequestId(requestId));
        require(request.fulfilled == false, RequestAlreadyFulfilled(requestId));
        require(randomWords.length == request.numWords, WrongRandomWordsCount(request.numWords, randomWords.length));

        request.fulfilled = true;
        request.randomWords = randomWords;
        emit RandomnessFulfilled(consumer, requestId, randomWords);

        IRNGConsumer(consumer).fulfillRandomness(requestId, randomWords);
    }

    /// @inheritdoc IRNGProvider
    function requestDetails(uint256 requestId) external view override returns (RequestDetails memory) {
        return _requestDetails[requestId];
    }
}
