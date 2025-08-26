// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {AccessControl} from "@animoca/ethereum-contracts/contracts/access/AccessControl.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {IPointsV2} from "./interface/IPointsV2.sol";

/// @title Points
/// @notice This contract is designed for managing the point balances of Anichess Game.
contract PointsV2 is AccessControl, EIP712, IPointsV2 {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using AccessControlStorage for AccessControlStorage.Layout;

    bytes32 private constant CONSUME_TYPEHASH = keccak256("Consume(address holder,address spender,uint256 amount,uint256 deadline,uint256 nonce)");
    bytes32 private constant PERMIT_TYPEHASH = keccak256("Permit(address holder,address spender,uint256 amount,uint256 deadline,uint256 nonce)");

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    mapping(address holder => uint256 balance) public balances;
    mapping(address holder => mapping(address spender => uint256 allowance)) public allowances;
    mapping(address holder => uint256 nonce) public nonces;

    /// @notice Emitted when an amount is deposited to a balance.
    /// @param sender The sender of the deposit.
    /// @param reasonCode The reason code of the deposit.
    /// @param holder The holder of the balance deposited to.
    /// @param amount The amount deposited.
    event Deposited(address indexed sender, bytes32 indexed reasonCode, address indexed holder, uint256 amount);

    /// @notice Emitted when an amount is consumed from a balance.
    /// @param holder The holder address of the balance consumed from.
    /// @param operator The sender of the consumption.
    /// @param amount The amount consumed.
    event Consumed(address indexed operator, address indexed holder, uint256 amount);

    /// @notice Emitted when an amount is approved by a holder.
    /// @param holder The holder.
    /// @param spender The spender.
    /// @param amount The approved amount.
    event Approved(address indexed holder, address indexed spender, uint256 amount);

    /// @notice Emitted when an amount is permitted by a holder.
    /// @param holder The holder.
    /// @param spender The spender.
    /// @param amount The approved amount.
    event Permitted(address indexed holder, address indexed spender, uint256 amount);

    /// @notice Thrown when depositing zero amount
    error DepositZeroAmount();

    /// @notice Thrown when the holder does not have enough balance
    /// @param holder The given holder address.
    /// @param requiredBalance The required balance.
    error InsufficientBalance(address holder, uint256 requiredBalance);

    /// @notice Thrown when the signature is invalid.
    error InvalidSignature();

    /// @notice Thrown when the signature is expired.
    error ExpiredSignature();

    /// @notice Thrown when the allowance is not enough.
    error NotEnoughAllowance();

    /// @notice Thrown when the spender is invalid.
    error InvalidSpender();

    /// @dev Reverts if the given address is invalid (equal to ZeroAddress).
    constructor() ContractOwnership(_msgSender()) EIP712("Points", "2.0") {}

    /// @notice Called by a depositor to increase the balance of a holder.
    /// @dev Reverts if sender does not have Depositor role.
    /// @dev Reverts if deposit amount is zero.
    /// @dev Emits a {Deposited} event if amount has been successfully added to the holder's balance
    /// @param holder The holder of the balance to deposit to.
    /// @param amount The amount to deposit.
    /// @param depositReasonCode The reason code of the deposit.
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external {
        address depositor = _msgSender();
        AccessControlStorage.layout().enforceHasRole(DEPOSITOR_ROLE, depositor);

        if (amount == 0) {
            revert DepositZeroAmount();
        }

        balances[holder] += amount;

        emit Deposited(depositor, depositReasonCode, holder, amount);
    }

    /// @notice Called by the a spender to consume a given amount from holder's balance.
    /// @dev Reverts if sender does not have enough balance
    /// @dev Reverts if the allwowance is not enough.
    /// @dev Emits a {Consumed} event if the consumption is successful.
    /// @param holder The balance holder address to consume.
    /// @param amount The amount to consume.
    function consume(address holder, uint256 amount) external {
        uint256 balance = balances[holder];
        if (balance < amount) {
            revert InsufficientBalance(holder, amount);
        }

        address spender = _msgSender();
        if (allowances[holder][spender] < amount) {
            revert NotEnoughAllowance();
        }

        balances[holder] = balance - amount;
        allowances[holder][spender] -= amount;

        emit Consumed(spender, holder, amount);
    }

    function approve(address spender, uint256 amount) external {
        address holder = _msgSender();
        if (spender == address(0) || spender == holder) {
            revert InvalidSpender();
        }

        allowances[holder][spender] = amount;

        emit Approved(holder, spender, amount);
    }

    function permit(address holder, address spender, uint256 amount, uint256 deadline, bytes calldata signature) external {
        if (block.timestamp > deadline) {
            revert ExpiredSignature();
        }

        uint256 nonce = nonces[holder];
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, holder, spender, amount, deadline, nonce));
        bytes32 digest = _hashTypedDataV4(structHash);

        bool isValid = SignatureChecker.isValidSignatureNow(holder, digest, signature);
        if (!isValid) {
            revert InvalidSignature();
        }

        nonces[holder] = nonce + 1;
        allowances[holder][spender] = amount;

        emit Permitted(holder, spender, amount);
    }
}
