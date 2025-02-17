// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ERC721Full} from "@animoca/ethereum-contracts/contracts/token/ERC721/preset/ERC721Full.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

contract GeniusScoreNFTClaim is EIP712, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    /// @notice Thrown when the given reward contract address is zero address.
    error InvalidRewardContractAddress();

    /// @notice Error thrown when the recipient has already claimed the reward.
    error AlreadyClaimed(address recipient);

    /// @notice Thrown when the signature is invalid.
    error InvalidSignature();

    /// @notice Thrown when the signer address has already been set.
    error SignerAlreadySet(address signer);

    /// @notice Event emitted when signer is updated successfully.
    /// @param signer The signer of the ERC712 signature for claim validation.
    event SignerSet(address signer);

    /// @notice Event emitted when claim is done successfully.
    /// @param recipient The recipient of the points.
    /// @param score The genius score.
    event Claimed(address recipient, uint96 score);

    /// @notice The type hash for ERC712 signature.
    bytes32 private constant CLAIM_TYPEHASH = keccak256("GeniusScoreNFTClaim(address recipient,uint96 score)");

    /// @notice The ERC721Full reward contract.
    ERC721Full public immutable REWARD_CONTRACT;

    /// @notice The signer of the ERC712 signature for claim validation.
    address public signer;

    /// @notice Mark if a recipient has claimed.
    mapping(address recipient => bool claimed) public claimed;

    /**
     * @notice Constructor for the ERC721ClaimWindowMerkleClaim contract.
     * @param rewardContract The ERC721Full reward contract interface.
     * @param signer_ The signer of the ERC712 signature for claim validation.
     */
    constructor(ERC721Full rewardContract, address signer_) EIP712("GeniusScoreNFTClaim", "1.0") ContractOwnership(msg.sender) {
        if (address(rewardContract) == address(0)) {
            revert InvalidRewardContractAddress();
        }

        REWARD_CONTRACT = rewardContract;
        signer = signer_;
    }

    /// @notice Sets the signer of the ERC712 signature for claim validation.
    /// @dev Reverts with {SignerAlreadySet} if signer address has already been set.
    /// @dev Reverts with {NotContractOwner} if sender is not owner.
    /// @dev Emits a {SignerSet} event.
    /// @param newSigner New signer.
    function setSigner(address newSigner) external {
        if (newSigner == signer) {
            revert SignerAlreadySet(newSigner);
        }
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        signer = newSigner;

        emit SignerSet(newSigner);
    }

    /// @dev Reverts with {AlreadyClaimed} if the recipient has already claimed.
    /// @dev Reverts with {InvalidSignature} if signature is not a valid ERC712 signature by signer.
    /// @dev Emits a {Claimed} event.
    /// @param recipient Recipient of the claim.
    /// @param score Bit position array for the claim.
    /// @param signature ERC712 signature by signer.
    function claim(address recipient, uint96 score, bytes calldata signature) external {
        if (claimed[recipient]) {
            revert AlreadyClaimed(recipient);
        }

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(CLAIM_TYPEHASH, recipient, score)));
        bool isValid = SignatureChecker.isValidSignatureNow(signer, digest, signature);
        if (!isValid) {
            revert InvalidSignature();
        }

        claimed[recipient] = true;

        REWARD_CONTRACT.mint(recipient, uint256(bytes32(abi.encodePacked(recipient, score))));

        emit Claimed(recipient, score);
    }
}
