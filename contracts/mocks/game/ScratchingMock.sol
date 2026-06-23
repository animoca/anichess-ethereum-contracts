// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Scratching} from "./../../game/Scratching.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRNGProvider} from "./../../rng/interfaces/IRNGProvider.sol";
import {IPointsV2} from "./../../points/interface/IPointsV2.sol";

contract ScratchingMock is Scratching {
    constructor(
        address scratchingBoard,
        IERC20 erc20Token,
        IRNGProvider rngProvider,
        IPointsV2 points
    ) Scratching(scratchingBoard, erc20Token, rngProvider, points) {}

    function setPendingScratchRequest(uint256 tokenId, uint256 requestId) external {
        pendingScratchRequest[tokenId] = requestId;
    }

    function setBoardPosition(uint256 tokenId, uint256 position) external {
        boardPositions[tokenId] = position;
    }
}
