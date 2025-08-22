// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC, Transaction} from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymaster.sol";
import {IPaymasterFlow} from "@matterlabs/zksync-contracts/contracts/system-contracts/interfaces/IPaymasterFlow.sol";
// import {Transaction} from "@matterlabs/zksync-contracts/contracts/system-contracts/libraries/TransactionHelper.sol";
import {BOOTLOADER_FORMAL_ADDRESS} from "@matterlabs/zksync-contracts/contracts/system-contracts/Constants.sol";

// import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC, Transaction} from "./interface/IPaymaster.sol";
// import {IPaymasterFlow} from "./interface/IPaymasterFlow.sol";

import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";

contract AbstractSponsoredListPaymaster is IPaymaster, ContractOwnership {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;

    error ShortPaymasterInput();
    error UnsupportedPaymasterFlow();
    error NotFromBootloader();
    error WithdrawFailed();
    error FailedFeeTransfer(uint256 fee);
    error InvalidToAddress();
    error InvalidSelector();
    error InsufficientBalance();
    error InconsistentLengths();
    error AccountNotSponsored();

    // Event to be emitted when the balance is withdrawn
    event BalanceWithdrawn(uint256 indexed amount);
    // Event to be emitted when a user tx is sponsored
    event FeeSponsored(address indexed user);

    event SponsoredAccountSet(address account, bool sponsored);

    // address payable constant BOOTLOADER_FORMAL_ADDRESS = payable(address(0x8001));

    mapping(address account => bool sponsored) public sponsoredList;

    receive() external payable {}

    constructor() ContractOwnership(msg.sender) {
    }

    /// @inheritdoc IPaymaster
    function validateAndPayForPaymasterTransaction(
        bytes32 /**_txHash*/,
        bytes32 /**_suggestedSignedHash*/,
        Transaction calldata _transaction
    ) external payable returns (bytes4, bytes memory) {
        // Revert if standart paymaster input is shorter than 4 bytes
        if (_transaction.paymasterInput.length < 4) {
            revert ShortPaymasterInput();
        }

        // Check the paymaster input selector to detect flow
        bytes4 paymasterInputSelector = bytes4(_transaction.paymasterInput[0:4]);
        if (paymasterInputSelector != IPaymasterFlow.general.selector) {
            revert UnsupportedPaymasterFlow();
        }

        if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
            revert NotFromBootloader();
        }

        if (!sponsoredList[address(uint160(_transaction.from))]) {
            revert AccountNotSponsored();
        }

        // Required ETH and token to pay fees
        uint256 requiredETH = _transaction.gasLimit * _transaction.maxFeePerGas;

        // Transfer fees to the bootloader
        (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{value: requiredETH}("");
        if (!success) {
            revert FailedFeeTransfer(requiredETH);
        }

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
        if (amount > address(this).balance) {
            revert InsufficientBalance();
        }

        address sender = _msgSender();
        ContractOwnershipStorage.layout().enforceIsContractOwner(sender);

        // Send paymaster funds to the owner
        (bool success, ) = payable(sender).call{value: amount}("");
        if (!success) revert WithdrawFailed();

        emit BalanceWithdrawn(amount);
    }

    function setBatchSponsored(
        address[] calldata accountList_,
        bool[] calldata sponsoredList_
    ) external {

        address sender = _msgSender();
        ContractOwnershipStorage.layout().enforceIsContractOwner(sender);

        uint256 accountListLength = accountList_.length;
        if (accountListLength != sponsoredList_.length) {
            revert InconsistentLengths();
        }
        
        for (uint256 i; i < accountListLength; ++i) {
            setSponsored(accountList_[i], sponsoredList_[i]);
        }
    }

    function setSponsored(address account_, bool sponsored_) public {
        bool isSponsored = sponsoredList[account_];

        if (isSponsored != sponsored_) {
            sponsoredList[account_] = sponsored_;
            emit SponsoredAccountSet(account_, sponsored_);
        }
    }
}
