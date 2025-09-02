// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IPointsV2} from "../points/interface/IPointsV2.sol";
import {ContractOwnership} from "@animoca/ethereum-contracts/contracts/access/ContractOwnership.sol";
import {ContractOwnershipStorage} from "@animoca/ethereum-contracts/contracts/access/libraries/ContractOwnershipStorage.sol";
import {PayoutWallet} from "@animoca/ethereum-contracts/contracts/payment/PayoutWallet.sol";
import {PayoutWalletStorage} from "@animoca/ethereum-contracts/contracts/payment/libraries/PayoutWalletStorage.sol";

contract ERC20ToPointsV2Swap is PayoutWallet {
    using ContractOwnershipStorage for ContractOwnershipStorage.Layout;
    using PayoutWalletStorage for PayoutWalletStorage.Layout;
    using SafeERC20 for IERC20;

    error InvalidERC20Token();
    error InvalidPointsV2();
    error InvalidAmount();
    error InvalidSignatureLength();
    error InvalidSignature();

    event RateUpdated(uint256 indexed oldRate, uint256 indexed newRate);
    event Swapped(address indexed user, uint256 indexed tokenAmount, uint256 indexed pointsAmount);

    bytes32 public constant DEPOSIT_REASON_CODE = bytes32("ERC20_TO_POINTSV2_SWAP");
    uint256 public constant RATE_PRECISION = 1e4;

    address public immutable ERC20_TOKEN;
    address public immutable POINTSV2;

    uint256 public rate; // Number of points per token, 4 d.p.

    /**
     * @notice Constructor of the ERC20ToPointsV2Swap contract.
     * @dev Reverts if token_ is zero.
     * @dev Reverts if pointsV2_ is zero.
     * @param token_ The ERC20 token contract address.
     * @param pointsV2_ The PointsV2 contract address.
     * @param initialRate The initial rate.
     * @param payoutWallet_ The payout wallet address.
     */
    constructor(
        address token_,
        address pointsV2_,
        uint256 initialRate,
        address payable payoutWallet_
    ) PayoutWallet(payoutWallet_) ContractOwnership(msg.sender) {
        if (address(token_) == address(0)) {
            revert InvalidERC20Token();
        }
        if (address(pointsV2_) == address(0)) {
            revert InvalidPointsV2();
        }

        ERC20_TOKEN = token_;
        POINTSV2 = pointsV2_;
        rate = initialRate;
    }

    /**
     * @notice Called by owner to update exchange rate.
     * @dev Reverts if sender is not the owner.
     * @dev Emits a {RateUpdated} event.
     * @param newRate The new exchange rate.
     */
    function setRate(uint256 newRate) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        uint256 oldRate = rate;

        rate = newRate;

        emit RateUpdated(oldRate, newRate);
    }

    /**
     * @notice View function for calculating required token amount to get the given points amount.
     * @param pointsAmount The desired points amount.
     */
    function calculateRequiredTokenAmount(uint256 pointsAmount) public view returns (uint256) {
        return (pointsAmount * 10 ** ERC20(ERC20_TOKEN).decimals() * RATE_PRECISION) / rate;
    }

    /**
     * @notice Called by external swap functions.
     * @notice Calls calculateRequiredTokenAmount() to get the token amount.
     * @dev Reverts if pointsAmount is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param holder The points holder.
     * @param pointsAmount The desired points amount to be swapped from ERC20 tokens.
     */
    function _swap(address holder, uint256 pointsAmount) internal {
        if (pointsAmount == 0) {
            revert InvalidAmount();
        }

        uint256 tokenAmount = calculateRequiredTokenAmount(pointsAmount);
        IERC20(ERC20_TOKEN).safeTransferFrom(holder, PayoutWalletStorage.layout().payoutWallet(), tokenAmount);
        IPointsV2(POINTSV2).deposit(holder, pointsAmount, DEPOSIT_REASON_CODE);

        emit Swapped(holder, tokenAmount, pointsAmount);
    }

    /**
     * @notice Called by balance holder to swap his ERC20 token to points.
     * @notice Pre-approval of transferring ERC20 token by this contract is required.
     * @notice Calls _swap().
     * @dev Reverts if pointsAmount is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param pointsAmount The desired token amount to be swapped from ERC20 tokens.
     */
    function swap(uint256 pointsAmount) external {
        _swap(_msgSender(), pointsAmount);
    }

    /**
     * @notice Called by balance holder to swap his ERC20 token to points.
     * @notice The given signature is used as the permit to transfer the token.
     * @notice Calls _swap() after executing token.permit().
     * @dev Reverts if pointsAmount is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param pointsAmount The desired points amount to be swapped from tokens.
     * @param permittedTokenAmount The permitted token amount to be swapped to points.
     * @param deadline The deadline of the signature.
     * @param v The v value of ECDSA signature by holder.
     * @param r The r value of ECDSA signature by holder.
     * @param s The s value of ECDSA signature by holder.
     */
    function swap(uint256 pointsAmount, uint256 permittedTokenAmount, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        address sender = _msgSender();
        IERC20Permit(ERC20_TOKEN).permit(sender, address(this), permittedTokenAmount, deadline, v, r, s);
        _swap(sender, pointsAmount);
    }
}
