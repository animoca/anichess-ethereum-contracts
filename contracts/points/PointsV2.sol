// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {AccessControlStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/AccessControlStorage.sol";
import {AccessControl} from "@animoca/ethereum-contracts/contracts/access/AccessControl.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IPointsV2} from "./interface/IPointsV2.sol";
import {IPointsV2SpendingCallback} from "./interface/IPointsV2SpendingCallback.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

/// @title PointsV2
/// @notice This contract is designed for managing the point balances of Anichess Game.
contract PointsV2 is AccessControl, EIP712, ForwarderRegistryContext, IPointsV2 {
    using AccessControlStorage for AccessControlStorage.Layout;

    bytes32 private constant APPROVE_TYPEHASH = keccak256("Approve(address holder,address spender,uint256 amount,uint256 deadline,uint256 nonce)");
    bytes32 private constant SPEND_TYPEHASH = keccak256("Spend(address holder,address spender,uint256 amount,uint256 deadline,uint256 nonce)");

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    mapping(address holder => mapping(address spender => uint256 amount)) public allowances;
    mapping(address holder => uint256 balance) public balances;
    mapping(bytes32 hashHolderSpender => uint256 nonce) public nonces;

    /// @notice Thrown when depositing to the zero address
    error DepositToAddressZero();

    /// @notice Thrown when depositing zero amount
    error DepositZeroAmount();

    /// @notice Thrown when the holder does not have enough balance
    /// @param holder The given holder address.
    /// @param availableBalance The available balance.
    /// @param requiredBalance The required balance.
    error InsufficientBalance(address holder, uint256 availableBalance, uint256 requiredBalance);

    /// @notice Thrown when the allowance decreases below the current alowance set.
    /// @param owner The owner of the tokens.
    /// @param spender The spender of the tokens.
    /// @param allowance The current allowance.
    /// @param decrement The allowance decrease.
    error InsufficientAllowance(address owner, address spender, uint256 allowance, uint256 decrement);

    /// @notice Thrown when approving to the zero address.
    /// @param holder The holder of the balance.
    error ApprovalToAddressZero(address holder);

    /// @notice Thrown when the signature is invalid.
    error InvalidSignature();

    /// @notice Thrown when the signature is expired.
    error ExpiredSignature();

    error CallbackRejected(address spender, uint256 amount, address target, bytes data);

    constructor(
        IForwarderRegistry forwarderRegistry
    ) ForwarderRegistryContext(forwarderRegistry) ContractOwnership(msg.sender) EIP712("Points", "2") {}

    /// @notice Called by a depositor to increase the balance of a holder.
    /// @dev Reverts with {NotRoleHolder} if sender does not have Depositor role.
    /// @dev Reverts with {DepositToAddressZero} if deposit is made to the zero address.
    /// @dev Reverts with {DepositZeroAmount} if deposit amount is zero.
    /// @dev Emits a {Deposited} event if amount has been successfully added to the holder's balance
    /// @param holder The holder of the balance to deposit to.
    /// @param amount The amount to deposit.
    /// @param depositReasonCode The reason code of the deposit.
    function deposit(address holder, uint256 amount, bytes32 depositReasonCode) external {
        address depositor = _msgSender();
        AccessControlStorage.layout().enforceHasRole(DEPOSITOR_ROLE, depositor);

        require(holder != address(0), DepositToAddressZero());
        require(amount != 0, DepositZeroAmount());

        balances[holder] += amount;

        emit Deposited(depositor, depositReasonCode, holder, amount);
    }

    /// @inheritdoc IPointsV2
    /// @dev Reverts with {ApprovalToAddressZero} if the spender is the zero address.
    function approve(address spender, uint256 amount) external {
        _approve(_msgSender(), spender, amount);
    }

    function _approve(address holder, address spender, uint256 amount) internal {
        if (spender == address(0)) revert ApprovalToAddressZero(holder);
        allowances[holder][spender] = amount;
        emit Approval(holder, spender, amount);
    }

    /// @inheritdoc IPointsV2
    /// @dev Reverts with {ExpiredSignature} if the deadline has passed.
    /// @dev Reverts with {InvalidSignature} if the signature is not valid.
    /// @dev Reverts with {ApprovalToAddressZero} if the spender is the zero address.
    function approveWithSignature(address holder, address spender, uint256 amount, uint256 deadline, bytes calldata signature) external {
        _validateSignature(holder, spender, amount, deadline, signature);
        _approve(holder, spender, amount);
    }

    function _validateSignature(address holder, address spender, uint256 amount, uint256 deadline, bytes calldata signature) internal {
        require(block.timestamp <= deadline, ExpiredSignature());
        bytes32 nonceKey = getNonceKey(holder, spender);
        uint256 nonce = nonces[nonceKey];

        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(APPROVE_TYPEHASH, holder, spender, amount, deadline, nonce)));
        require(SignatureChecker.isValidSignatureNow(holder, digest, signature), InvalidSignature());

        nonces[nonceKey] = nonce + 1;
    }

    function getNonceKey(address holder, address spender) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(holder, spender));
    }

    /// @inheritdoc IPointsV2
    /// @dev Reverts with {InsufficientBalance} if the holder does not have enough balance.
    /// @dev Reverts with {InsufficientAllowance} if the allowance is insufficient.
    function spendFrom(address holder, uint256 amount) external {
        address spender = _msgSender();
        _decreaseAllowance(holder, spender, amount);
        _spend(spender, holder, amount);
    }

    function _spend(address spender, address holder, uint256 amount) internal {
        uint256 balance = balances[holder];
        require(balance >= amount, InsufficientBalance(holder, balance, amount));
        balances[holder] = balance - amount;
        emit Spent(spender, holder, amount);
    }

    function _decreaseAllowance(address holder, address spender, uint256 amount) internal {
        if (holder != spender) {
            uint256 currentAllowance = allowances[holder][spender];
            if (currentAllowance < amount) {
                revert InsufficientAllowance(holder, spender, currentAllowance, amount);
            }
            uint256 newAllowance = currentAllowance - amount;
            allowances[holder][spender] = newAllowance;
            emit Approval(holder, spender, newAllowance);
        }
    }

    /// @inheritdoc IPointsV2
    /// @dev Reverts with {InsufficientBalance} if the holder does not have enough balance.
    /// @dev Reverts with {CallbackRejected} if the callback reverts or does not return the expected value.
    function spendAndCall(uint256 amount, address target, bytes calldata data) external {
        address spender = _msgSender();
        _spend(spender, spender, amount);
        require(
            IPointsV2SpendingCallback(target).onPointsSpent(spender, amount, data) == IPointsV2SpendingCallback.onPointsSpent.selector,
            CallbackRejected(spender, amount, target, data)
        );
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
