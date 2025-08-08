// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

// import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC, Transaction} from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymaster.sol";
// import {IPaymasterFlow} from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymasterFlow.sol";
// import {Transaction} from "@matterlabs/zksync-contracts/contracts/system-contracts/libraries/TransactionHelper.sol";
// import {BOOTLOADER_FORMAL_ADDRESS} from "@matterlabs/zksync-contracts/contracts/system-contracts/Constants.sol";

import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC, Transaction} from "./interface/IPaymaster.sol";
import {IPaymasterFlow} from "./interface/IPaymasterFlow.sol";

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

contract AbstractGasPaymaster is IPaymaster, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    error ShortPaymasterInput();
    error UnsupportedPaymasterFlow();
    error NotFromBootloader();
    error WithdrawFailed();
    error FailedFeeTransfer(uint256 fee);
    error TargetContractNotWhitelisted(address target);

    event TargetContractWhitelisted(address indexed target, bool indexed whitelisted);
    // Event to be emitted when the balance is withdrawn
    event BalanceWithdrawn(uint256 indexed amount);
    // Event to be emitted when a user tx is sponsored
    event FeeSponsored(address indexed user);

    address payable constant BOOTLOADER_FORMAL_ADDRESS = payable(address(0x8001));

    mapping(address target => bool enabled) public whitelist;

    receive() external payable {}

    constructor() ContractOwnership(msg.sender) {}

    /// @inheritdoc IPaymaster
    function validateAndPayForPaymasterTransaction(
        bytes32 /**_txHash*/,
        bytes32 /**_suggestedSignedHash*/,
        Transaction calldata _transaction
    ) external payable returns (bytes4, bytes memory) {
        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert NotFromBootloader();
        }

        // Revert if standart paymaster input is shorter than 4 bytes
        if (_transaction.paymasterInput.length < 4) revert ShortPaymasterInput();

        // Check the paymaster input selector to detect flow
        bytes4 paymasterInputSelector = bytes4(_transaction.paymasterInput[0:4]);
        if (paymasterInputSelector != IPaymasterFlow.general.selector) revert UnsupportedPaymasterFlow();

        if (!whitelist[address(uint160(_transaction.to))]) {
            revert TargetContractNotWhitelisted(address(uint160(_transaction.to)));
        }

        // Required ETH and token to pay fees
        uint256 requiredETH = _transaction.gasLimit * _transaction.maxFeePerGas;

        // Transfer fees to the bootloader
        (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{value: requiredETH}("");
        if (!success) revert FailedFeeTransfer(requiredETH);

        return (PAYMASTER_VALIDATION_SUCCESS_MAGIC, "");
    }

    /// @inheritdoc IPaymaster
    function postTransaction(
        bytes calldata /**_context*/,
        Transaction calldata _transaction,
        bytes32 /**_txHash*/,
        bytes32 /**_suggestedSignedHash*/,
        ExecutionResult /**_txResult*/,
        uint256 /**_maxRefundedGas*/
    ) external payable {
        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert NotFromBootloader();
        }

        emit FeeSponsored(address(uint160(_transaction.from)));
    }

    function withdraw(uint256 amount) external {
        address sender = _msgSender();

        ContractOwnershipStorage.layout().enforceIsContractOwner(sender);

        // Send paymaster funds to the owner
        (bool success, ) = payable(sender).call{value: amount}("");
        if (!success) revert WithdrawFailed();

        emit BalanceWithdrawn(amount);
    }

    function setTargetContractWhiltelisted(address target, bool whitedlisted) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        whitelist[target] = whitedlisted;

        emit TargetContractWhitelisted(target, whitedlisted);
    }
}
