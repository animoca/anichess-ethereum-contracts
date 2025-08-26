// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IPointsV2} from "../points/interface/IPointsV2.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {ForwarderRegistryContext} from "@animoca/ethereum-contracts/contracts/metatx/ForwarderRegistryContext.sol";
import {ForwarderRegistryContextBase} from "@animoca/ethereum-contracts/contracts/metatx/base/ForwarderRegistryContextBase.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";

contract ERC20ToPointsV2Swap is PayoutWallet, ForwarderRegistryContext {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;
    using SafeERC20 for IERC20;

    error InvalidERC20Token();
    error InvalidPointsV2();
    error InvalidAmount();
    error InvalidSignatureLength();
    error InvalidSignature();

    event RateUpdated(uint256 indexed newRate);
    event Swapped(address indexed user, uint256 indexed tokenAmount, uint256 indexed pointsAmount);

    bytes32 public constant DEPOSIT_REASON_CODE = keccak256("ERC20_TO_POINTSV2_SWAP");
    uint256 public constant RATE_PRECISION = 1e4;

    address public immutable ERC20_TOKEN;
    uint256 public immutable ERC20_TOKEN_PRECISION;
    address public immutable POINTSV2;

    uint256 public rate; // Number of points per token, 4 d.p.

    constructor(
        address token_,
        address pointsV2_,
        uint256 initialRate,
        address payable payoutWallet_,
        IForwarderRegistry forwarderRegistry_
    ) PayoutWallet(payoutWallet_) ContractOwnership(_msgSender()) ForwarderRegistryContext(forwarderRegistry_) {
        if (address(token_) == address(0)) {
            revert InvalidERC20Token();
        }
        if (address(pointsV2_) == address(0)) {
            revert InvalidPointsV2();
        }

        ERC20_TOKEN = token_;
        ERC20_TOKEN_PRECISION = 10 ** ERC20(token_).decimals();
        POINTSV2 = pointsV2_;
        rate = initialRate;
    }

    function setRate(uint256 newRate) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        rate = newRate;

        emit RateUpdated(newRate);
    }

    function swap(uint256 tokenAmountIn) external {
        if (tokenAmountIn == 0) {
            revert InvalidAmount();
        }

        uint256 pointsAmountOut = (tokenAmountIn * rate) / ERC20_TOKEN_PRECISION / RATE_PRECISION;
        uint256 actualTokenAmountIn = (pointsAmountOut * ERC20_TOKEN_PRECISION * RATE_PRECISION) / rate;

        address sender = _msgSender();
        IERC20(ERC20_TOKEN).safeTransferFrom(sender, PayoutWalletStorage.layout().payoutWallet(), actualTokenAmountIn);
        IPointsV2(POINTSV2).deposit(sender, pointsAmountOut, DEPOSIT_REASON_CODE);

        emit Swapped(sender, actualTokenAmountIn, pointsAmountOut);
    }

    function swap(address holder, uint256 tokenAmountIn, uint256 deadline, bytes memory signature) external {
        if (tokenAmountIn == 0) {
            revert InvalidAmount();
        }

        if (signature.length != 65) {
            revert InvalidSignatureLength();
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }

        if (v != 27 && v != 28) {
            revert InvalidSignature();
        }

        IERC20Permit(ERC20_TOKEN).permit(holder, address(this), tokenAmountIn, deadline, v, r, s);

        uint256 pointsAmountOut = (tokenAmountIn * rate) / ERC20_TOKEN_PRECISION / RATE_PRECISION;
        uint256 actualTokenAmountIn = (pointsAmountOut * ERC20_TOKEN_PRECISION * RATE_PRECISION) / rate;

        IERC20(ERC20_TOKEN).safeTransferFrom(holder, PayoutWalletStorage.layout().payoutWallet(), actualTokenAmountIn);
        IPointsV2(POINTSV2).deposit(holder, pointsAmountOut, DEPOSIT_REASON_CODE);

        emit Swapped(holder, actualTokenAmountIn, pointsAmountOut);
    }

    /// @notice retrieve original msg sender of the meta transaction
    function _msgSender() internal view virtual override(Context, ForwarderRegistryContextBase) returns (address) {
        return ForwarderRegistryContextBase._msgSender();
    }

    /// @notice retrieve original msg calldata of the meta transaction
    function _msgData() internal view virtual override(Context, ForwarderRegistryContextBase) returns (bytes calldata) {
        return ForwarderRegistryContextBase._msgData();
    }
}
