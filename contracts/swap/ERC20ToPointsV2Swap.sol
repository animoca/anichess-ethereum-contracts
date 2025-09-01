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

    event RateUpdated(uint256 indexed newRate);
    event Swapped(address indexed user, uint256 indexed tokenAmount, uint256 indexed pointsAmount);

    bytes32 public constant DEPOSIT_REASON_CODE = keccak256("ERC20_TO_POINTSV2_SWAP");
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
     * @dev Emits a {RateUpdated} event if the approval is successful.
     * @param newRate The new exchange rate.
     */
    function setRate(uint256 newRate) external {
        ContractOwnershipStorage.layout().enforceIsContractOwner(_msgSender());

        rate = newRate;

        emit RateUpdated(newRate);
    }

    /**
     * @notice Called by external swap functions.
     * @dev Reverts if pointsAmountOut is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param holder The token holder.
     * @param pointsAmountOut The desired token amount to be swapped from ERC20 tokens.
     */
    function _swap(address holder, uint256 pointsAmountOut) internal {
        if (pointsAmountOut == 0) {
            revert InvalidAmount();
        }

        uint256 erc20TokenPrecision = 10 ** ERC20(ERC20_TOKEN).decimals();
        uint256 tokenAmountIn = (pointsAmountOut * erc20TokenPrecision * RATE_PRECISION) / rate;

        IERC20(ERC20_TOKEN).safeTransferFrom(holder, PayoutWalletStorage.layout().payoutWallet(), tokenAmountIn);
        IPointsV2(POINTSV2).deposit(holder, pointsAmountOut, DEPOSIT_REASON_CODE);

        emit Swapped(holder, tokenAmountIn, pointsAmountOut);
    }

    /**
     * @notice Called by balance holder to swap his ERC20 token to points.
     * @notice Pre-approval of transferring ERC20 token by this contract is required.
     * @dev Reverts if pointsAmountOut is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param pointsAmountOut The desired token amount to be swapped from ERC20 tokens.
     */
    function swap(uint256 pointsAmountOut) external {
        _swap(_msgSender(), pointsAmountOut);
    }

    /**
     * @notice Called by anyone to swap holder's ERC20 token to points.
     * @notice the give signature as the permit to transfer the token.
     * @notice Calls the other swap function after executing token.permit().
     * @dev Reverts if pointsAmountOut is zero.
     * @dev Emits a {Swapped} event if the swap is successful.
     * @param holder The token holder.
     * @param pointsAmountOut The desired points amount to be swapped from tokens.
     * @param permittedTokenAmountIn The permitted token amount to be swapped to points.
     * @param deadline The deadline of the signature.
     * @param v The v value of ECDSA signature by holder.
     * @param r The r value of ECDSA signature by holder.
     * @param s The s value of ECDSA signature by holder.
     */
    function swap(address holder, uint256 pointsAmountOut, uint256 permittedTokenAmountIn, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external {
        IERC20Permit(ERC20_TOKEN).permit(holder, address(this), permittedTokenAmountIn, deadline, v, r, s);
        _swap(holder, pointsAmountOut);
    }
}
