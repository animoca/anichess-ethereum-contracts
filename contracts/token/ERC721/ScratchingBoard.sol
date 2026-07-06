// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC721} from "@animoca/ethereum-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721Base} from "@animoca/ethereum-contracts/contracts/token/ERC721/base/ERC721Base.sol";
import {ERC721Metadata} from "@animoca/ethereum-contracts/contracts/token/ERC721/ERC721Metadata.sol";
import {ERC2981} from "@animoca/ethereum-contracts/contracts/token/royalty/ERC2981.sol";
import {AccessControl} from "@animoca/ethereum-contracts/contracts/access/AccessControl.sol";
import {TokenRecovery} from "@animoca/ethereum-contracts/contracts/security/TokenRecovery.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";

import {ERC721Storage} from "@animoca/ethereum-contracts/contracts/token/ERC721/libraries/ERC721Storage.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

import {ITokenMetadataResolver} from "@animoca/ethereum-contracts/contracts/token/metadata/interfaces/ITokenMetadataResolver.sol";
import {IScratchingBoard} from "./../interfaces/IScratchingBoard.sol";
import {IScratching} from "./../../game/interfaces/IScratching.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

import {ERC721NonExistingToken} from "@animoca/ethereum-contracts/contracts/token/ERC721/errors/ERC721Errors.sol";
import {Transfer} from "@animoca/ethereum-contracts/contracts/token/ERC721/events/ERC721Events.sol";

contract ScratchingBoard is ERC721, ERC721Metadata, ERC2981, IScratchingBoard, AccessControl, ForwarderRegistryContext, TokenRecovery {
    using ERC721Storage for ERC721Storage.Layout;
    using AccessControlStorage for AccessControlStorage.Layout;
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    bytes32 public constant MINTER_ROLE = "minter";

    uint256 public nextTokenId;
    IScratching public scratchingContract;

    event ScratchingContractSet(IScratching scratchingContract);

    error PendingScratchRequest(uint256 tokenId, uint256 requestId);

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        ITokenMetadataResolver metadataResolver,
        IForwarderRegistry forwarderRegistry
    ) ContractOwnership(msg.sender) ERC721Metadata(tokenName, tokenSymbol, metadataResolver) ForwarderRegistryContext(forwarderRegistry) {}

    /// @notice Sets the scratching contract.
    /// @dev Reverts with {NotContractOwner} if the caller is not the contract owner.
    /// @param scratching the address of the scratching contract.
    function setScratchingContract(IScratching scratching) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(msg.sender);
        scratchingContract = scratching;
        emit ScratchingContractSet(scratching);
    }

    /// @notice Mints a new token with incremental token ID to the specified address.
    /// @dev Reverts with {MissingRole} if the caller does not have the MINTER_ROLE.
    /// @dev Emits a {Transfer} event from address 0.
    /// @param to the address to mint the token to.
    /// @return tokenId the ID of the minted token.
    function mint(address to) external virtual returns (uint256 tokenId) {
        AccessControlStorage.layout().enforceHasRole(MINTER_ROLE, msg.sender);
        tokenId = nextTokenId++;
        ERC721Storage.layout().mint(to, tokenId);
    }

    /// @notice Burns a token.
    /// @dev Reverts with {MissingRole} if the caller does not have the MINTER_ROLE.
    /// @dev Reverts with {ERC721NonExistingToken} if the token does not exist.
    /// @dev Emits a {Transfer} event to address 0.
    /// @param tokenId the ID of the token to burn.
    function burn(uint256 tokenId) external {
        AccessControlStorage.layout().enforceHasRole(MINTER_ROLE, _msgSender());

        ERC721Storage.Layout storage s = ERC721Storage.layout();
        address owner = address(uint160(s.owners[tokenId]));
        if (owner == address(0)) revert ERC721NonExistingToken(tokenId);

        s.owners[tokenId] = ERC721Storage.BURNT_TOKEN_OWNER_VALUE;

        unchecked {
            // cannot underflow as balance is verified through TOKEN ownership
            --s.balances[owner];
        }

        emit Transfer(owner, address(0), tokenId);
    }

    /// @inheritdoc ERC721Base
    /// @dev Reverts with {PendingScratchRequest} if there is a scratching contract and the token has a pending scratch request
    function transferFrom(address from, address to, uint256 tokenId) external virtual override {
        _requireNoPendingScratchRequest(tokenId);
        ERC721Storage.layout().transferFrom(_msgSender(), from, to, tokenId);
    }

    /// @inheritdoc ERC721Base
    /// @dev Reverts with {PendingScratchRequest} if there is a scratching contract and the token has a pending scratch request
    function safeTransferFrom(address from, address to, uint256 tokenId) external virtual override {
        _requireNoPendingScratchRequest(tokenId);
        ERC721Storage.layout().safeTransferFrom(_msgSender(), from, to, tokenId);
    }

    /// @inheritdoc ERC721Base
    /// @dev Reverts with {PendingScratchRequest} if there is a scratching contract and the token has a pending scratch request
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external virtual override {
        _requireNoPendingScratchRequest(tokenId);
        ERC721Storage.layout().safeTransferFrom(_msgSender(), from, to, tokenId, data);
    }

    function _requireNoPendingScratchRequest(uint256 tokenId) internal view {
        IScratching scratchingContract_ = scratchingContract;
        if (scratchingContract_ != IScratching(address(0))) {
            uint256 pendingRequestId = scratchingContract_.pendingScratchRequest(tokenId);
            require(pendingRequestId == 0, PendingScratchRequest(tokenId, pendingRequestId));
        }
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @inheritdoc ForwarderRegistryContextBase
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
