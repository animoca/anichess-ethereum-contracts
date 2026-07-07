// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20ToPoints} from "../../../contracts/swap/ERC20ToPoints.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPointsV2} from "../../../contracts/points/interface/IPointsV2.sol";
import {IForwarderRegistry} from "@animoca/ethereum-contracts/contracts/metatx/interfaces/IForwarderRegistry.sol";

contract ERC20ToPointsMock is ERC20ToPoints {
    constructor(
        IERC20 token,
        IPointsV2 points,
        uint256 tokenToPointsRate,
        string memory depositReason,
        address payable payoutAddress,
        IForwarderRegistry forwarderRegistry
    ) ERC20ToPoints(token, points, tokenToPointsRate, depositReason, payoutAddress, forwarderRegistry) {}

    function __msgData() external view returns (bytes calldata) {
        return _msgData();
    }
}
