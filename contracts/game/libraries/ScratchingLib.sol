// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library ScratchingLib {
    uint256 public constant ROW_1_PRICE = 1373;
    uint256 public constant ROW_2_PRICE = 4199;
    uint256 public constant ROW_3_PRICE = 12845;
    uint256 public constant ROW_4_PRICE = 39293;
    uint256 public constant ROW_5_PRICE = 120199;
    uint256 public constant ROW_6_PRICE = 367691;
    uint256 public constant ROW_7_PRICE = 1124777;
    uint256 public constant ROW_8_PRICE = 3373966;

    uint256 public constant ERC20_DECIMALS = 18;
    uint256 public constant ERC20_REWARD_DIVISOR = 100;
    uint256 public constant ERC20_REWARD_MULTIPLIER = 10 ** ERC20_DECIMALS / ERC20_REWARD_DIVISOR;

    uint256 public constant PROBABILITY_DIVISOR = 100;

    uint256 public constant A1_PRICE = 100;
    uint256 public constant A1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant A1_REWARD_ERC20 = 300;

    uint256 public constant B1_PRICE = 115;
    uint256 public constant B1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant B1_REWARD_ERC20 = 345;

    uint256 public constant C1_PRICE = 132;
    uint256 public constant C1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant C1_REWARD_ERC20 = 397;

    uint256 public constant D1_PRICE = 152;
    uint256 public constant D1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant D1_REWARD_ERC20 = 456;

    uint256 public constant E1_PRICE = 175;
    uint256 public constant E1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant E1_REWARD_ERC20 = 525;

    uint256 public constant F1_PRICE = 201;
    uint256 public constant F1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant F1_REWARD_ERC20 = 603;

    uint256 public constant G1_PRICE = 231;
    uint256 public constant G1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant G1_REWARD_ERC20 = 694;

    uint256 public constant H1_PRICE = 266;
    uint256 public constant H1_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant H1_REWARD_ERC20 = 798;

    uint256 public constant A2_PRICE = 306;
    uint256 public constant A2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant A2_REWARD_ERC20 = 918;

    uint256 public constant B2_PRICE = 352;
    uint256 public constant B2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant B2_REWARD_ERC20 = 1055;

    uint256 public constant C2_PRICE = 405;
    uint256 public constant C2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant C2_REWARD_ERC20 = 1214;

    uint256 public constant D2_PRICE = 465;
    uint256 public constant D2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant D2_REWARD_ERC20 = 1396;

    uint256 public constant E2_PRICE = 535;
    uint256 public constant E2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant E2_REWARD_ERC20 = 1605;

    uint256 public constant F2_PRICE = 615;
    uint256 public constant F2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant F2_REWARD_ERC20 = 1846;

    uint256 public constant G2_PRICE = 708;
    uint256 public constant G2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant G2_REWARD_ERC20 = 2123;

    uint256 public constant H2_PRICE = 814;
    uint256 public constant H2_PROBABILITY_ERC20 = 800; // 8%
    uint256 public constant H2_REWARD_ERC20 = 2441;

    uint256 public constant A3_PRICE = 936;
    uint256 public constant A3_PROBABILITY_5X = 200; // 2%
    uint256 public constant A3_PROBABILITY_2X = 600; // 6%
    uint256 public constant A3_REWARD_5X = 4679;
    uint256 public constant A3_REWARD_2X = 1872;

    uint256 public constant B3_PRICE = 1076;
    uint256 public constant B3_PROBABILITY_5X = 200; // 2%
    uint256 public constant B3_PROBABILITY_2X = 600; // 6%
    uint256 public constant B3_REWARD_5X = 5381;
    uint256 public constant B3_REWARD_2X = 2152;

    uint256 public constant C3_PRICE = 1238;
    uint256 public constant C3_PROBABILITY_5X = 200; // 2%
    uint256 public constant C3_PROBABILITY_2X = 600; // 6%
    uint256 public constant C3_REWARD_5X = 6188;
    uint256 public constant C3_REWARD_2X = 2475;

    uint256 public constant D3_PRICE = 1423;
    uint256 public constant D3_PROBABILITY_5X = 200; // 2%
    uint256 public constant D3_PROBABILITY_2X = 600; // 6%
    uint256 public constant D3_REWARD_5X = 7116;
    uint256 public constant D3_REWARD_2X = 2846;

    uint256 public constant E3_PRICE = 1637;
    uint256 public constant E3_PROBABILITY_5X = 200; // 2%
    uint256 public constant E3_PROBABILITY_2X = 600; // 6%
    uint256 public constant E3_REWARD_5X = 8183;
    uint256 public constant E3_REWARD_2X = 3273;

    uint256 public constant F3_PRICE = 1882;
    uint256 public constant F3_PROBABILITY_5X = 200; // 2%
    uint256 public constant F3_PROBABILITY_2X = 600; // 6%
    uint256 public constant F3_REWARD_5X = 9411;
    uint256 public constant F3_REWARD_2X = 3764;

    uint256 public constant G3_PRICE = 2164;
    uint256 public constant G3_PROBABILITY_5X = 200; // 2%
    uint256 public constant G3_PROBABILITY_2X = 600; // 6%
    uint256 public constant G3_REWARD_5X = 10822;
    uint256 public constant G3_REWARD_2X = 4329;

    uint256 public constant H3_PRICE = 2489;
    uint256 public constant H3_PROBABILITY_5X = 200; // 2%
    uint256 public constant H3_PROBABILITY_2X = 600; // 6%
    uint256 public constant H3_REWARD_5X = 12446;
    uint256 public constant H3_REWARD_2X = 4978;

    uint256 public constant A4_PRICE = 2863;
    uint256 public constant A4_PROBABILITY_5X = 200; // 2%
    uint256 public constant A4_PROBABILITY_2X = 600; // 6%
    uint256 public constant A4_REWARD_5X = 14313;
    uint256 public constant A4_REWARD_2X = 5725;

    uint256 public constant B4_PRICE = 3292;
    uint256 public constant B4_PROBABILITY_5X = 200; // 2%
    uint256 public constant B4_PROBABILITY_2X = 600; // 6%
    uint256 public constant B4_REWARD_5X = 16459;
    uint256 public constant B4_REWARD_2X = 6584;

    uint256 public constant C4_PRICE = 3786;
    uint256 public constant C4_PROBABILITY_5X = 200; // 2%
    uint256 public constant C4_PROBABILITY_2X = 600; // 6%
    uint256 public constant C4_REWARD_5X = 18928;
    uint256 public constant C4_REWARD_2X = 7571;

    uint256 public constant D4_PRICE = 4354;
    uint256 public constant D4_PROBABILITY_5X = 200; // 2%
    uint256 public constant D4_PROBABILITY_2X = 600; // 6%
    uint256 public constant D4_REWARD_5X = 21768;
    uint256 public constant D4_REWARD_2X = 8707;

    uint256 public constant E4_PRICE = 5007;
    uint256 public constant E4_PROBABILITY_5X = 200; // 2%
    uint256 public constant E4_PROBABILITY_2X = 600; // 6%
    uint256 public constant E4_REWARD_5X = 25033;
    uint256 public constant E4_REWARD_2X = 10013;

    uint256 public constant F4_PRICE = 5758;
    uint256 public constant F4_PROBABILITY_5X = 200; // 2%
    uint256 public constant F4_PROBABILITY_2X = 600; // 6%
    uint256 public constant F4_REWARD_5X = 28788;
    uint256 public constant F4_REWARD_2X = 11515;

    uint256 public constant G4_PRICE = 6621;
    uint256 public constant G4_PROBABILITY_5X = 200; // 2%
    uint256 public constant G4_PROBABILITY_2X = 600; // 6%
    uint256 public constant G4_REWARD_5X = 33106;
    uint256 public constant G4_REWARD_2X = 13242;

    uint256 public constant H4_PRICE = 7614;
    uint256 public constant H4_PROBABILITY_5X = 200; // 2%
    uint256 public constant H4_PROBABILITY_2X = 600; // 6%
    uint256 public constant H4_REWARD_5X = 38072;
    uint256 public constant H4_REWARD_2X = 15229;

    uint256 public constant A5_PRICE = 8757;
    uint256 public constant A5_PROBABILITY_10X = 200; // 2%
    uint256 public constant A5_PROBABILITY_2X = 600; // 6%
    uint256 public constant A5_REWARD_10X = 87565;
    uint256 public constant A5_REWARD_2X = 17513;

    uint256 public constant B5_PRICE = 10070;
    uint256 public constant B5_PROBABILITY_10X = 200; // 2%
    uint256 public constant B5_PROBABILITY_2X = 600; // 6%
    uint256 public constant B5_REWARD_10X = 100700;
    uint256 public constant B5_REWARD_2X = 20140;

    uint256 public constant C5_PRICE = 11580;
    uint256 public constant C5_PROBABILITY_10X = 200; // 2%
    uint256 public constant C5_PROBABILITY_2X = 600; // 6%
    uint256 public constant C5_REWARD_10X = 115805;
    uint256 public constant C5_REWARD_2X = 23161;

    uint256 public constant D5_PRICE = 13318;
    uint256 public constant D5_PROBABILITY_10X = 200; // 2%
    uint256 public constant D5_PROBABILITY_2X = 600; // 6%
    uint256 public constant D5_REWARD_10X = 133176;
    uint256 public constant D5_REWARD_2X = 26635;

    uint256 public constant E5_PRICE = 15315;
    uint256 public constant E5_PROBABILITY_10X = 200; // 2%
    uint256 public constant E5_PROBABILITY_2X = 600; // 6%
    uint256 public constant E5_REWARD_10X = 153152;
    uint256 public constant E5_REWARD_2X = 30630;

    uint256 public constant F5_PRICE = 17612;
    uint256 public constant F5_PROBABILITY_10X = 200; // 2%
    uint256 public constant F5_PROBABILITY_2X = 600; // 6%
    uint256 public constant F5_REWARD_10X = 176125;
    uint256 public constant F5_REWARD_2X = 35225;

    uint256 public constant G5_PRICE = 20254;
    uint256 public constant G5_PROBABILITY_10X = 200; // 2%
    uint256 public constant G5_PROBABILITY_2X = 600; // 6%
    uint256 public constant G5_REWARD_10X = 202543;
    uint256 public constant G5_REWARD_2X = 40509;

    uint256 public constant H5_PRICE = 23292;
    uint256 public constant H5_PROBABILITY_10X = 200; // 2%
    uint256 public constant H5_PROBABILITY_2X = 600; // 6%
    uint256 public constant H5_REWARD_10X = 232925;
    uint256 public constant H5_REWARD_2X = 46585;

    uint256 public constant A6_PRICE = 26786;
    uint256 public constant A6_PROBABILITY_20X = 200; // 2%
    uint256 public constant A6_PROBABILITY_2X = 600; // 6%
    uint256 public constant A6_REWARD_20X = 535727;
    uint256 public constant A6_REWARD_2X = 53573;

    uint256 public constant B6_PRICE = 30804;
    uint256 public constant B6_PROBABILITY_20X = 200; // 2%
    uint256 public constant B6_PROBABILITY_2X = 600; // 6%
    uint256 public constant B6_REWARD_20X = 616086;
    uint256 public constant B6_REWARD_2X = 61609;

    uint256 public constant C6_PRICE = 35425;
    uint256 public constant C6_PROBABILITY_20X = 200; // 2%
    uint256 public constant C6_PROBABILITY_2X = 600; // 6%
    uint256 public constant C6_REWARD_20X = 708499;
    uint256 public constant C6_REWARD_2X = 70850;

    uint256 public constant D6_PRICE = 40739;
    uint256 public constant D6_PROBABILITY_20X = 200; // 2%
    uint256 public constant D6_PROBABILITY_2X = 600; // 6%
    uint256 public constant D6_REWARD_20X = 814774;
    uint256 public constant D6_REWARD_2X = 81477;

    uint256 public constant E6_PRICE = 46850;
    uint256 public constant E6_PROBABILITY_20X = 200; // 2%
    uint256 public constant E6_PROBABILITY_2X = 600; // 6%
    uint256 public constant E6_REWARD_20X = 936990;
    uint256 public constant E6_REWARD_2X = 93699;

    uint256 public constant F6_PRICE = 53877;
    uint256 public constant F6_PROBABILITY_20X = 200; // 2%
    uint256 public constant F6_PROBABILITY_2X = 600; // 6%
    uint256 public constant F6_REWARD_20X = 1077539;
    uint256 public constant F6_REWARD_2X = 107754;

    uint256 public constant G6_PRICE = 61958;
    uint256 public constant G6_PROBABILITY_20X = 200; // 2%
    uint256 public constant G6_PROBABILITY_2X = 600; // 6%
    uint256 public constant G6_REWARD_20X = 1239169;
    uint256 public constant G6_REWARD_2X = 123917;

    uint256 public constant H6_PRICE = 71252;
    uint256 public constant H6_PROBABILITY_20X = 200; // 2%
    uint256 public constant H6_PROBABILITY_2X = 600; // 6%
    uint256 public constant H6_REWARD_20X = 1425045;
    uint256 public constant H6_REWARD_2X = 142504;

    uint256 public constant A7_PRICE = 81940;
    uint256 public constant A7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant A7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant A7_REWARD_50X = 4097004;
    uint256 public constant A7_REWARD_2X = 163880;

    uint256 public constant B7_PRICE = 94231;
    uint256 public constant B7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant B7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant B7_REWARD_50X = 4711554;
    uint256 public constant B7_REWARD_2X = 188462;

    uint256 public constant C7_PRICE = 108366;
    uint256 public constant C7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant C7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant C7_REWARD_50X = 5418287;
    uint256 public constant C7_REWARD_2X = 216731;

    uint256 public constant D7_PRICE = 124621;
    uint256 public constant D7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant D7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant D7_REWARD_50X = 6231030;
    uint256 public constant D7_REWARD_2X = 249241;

    uint256 public constant E7_PRICE = 143314;
    uint256 public constant E7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant E7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant E7_REWARD_50X = 7165685;
    uint256 public constant E7_REWARD_2X = 286627;

    uint256 public constant F7_PRICE = 164811;
    uint256 public constant F7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant F7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant F7_REWARD_50X = 8240538;
    uint256 public constant F7_REWARD_2X = 329622;

    uint256 public constant G7_PRICE = 189532;
    uint256 public constant G7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant G7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant G7_REWARD_50X = 9476618;
    uint256 public constant G7_REWARD_2X = 379065;

    uint256 public constant H7_PRICE = 217962;
    uint256 public constant H7_PROBABILITY_50X = 50; // 0.5%
    uint256 public constant H7_PROBABILITY_2X = 750; // 7.5%
    uint256 public constant H7_REWARD_50X = 10898111;
    uint256 public constant H7_REWARD_2X = 435924;

    uint256 public constant A8_PRICE = 250657;
    uint256 public constant A8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant A8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant A8_REWARD_100X = 25065655;
    uint256 public constant A8_REWARD_2X = 501313;

    uint256 public constant B8_PRICE = 288255;
    uint256 public constant B8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant B8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant B8_REWARD_100X = 28825503;
    uint256 public constant B8_REWARD_2X = 576510;

    uint256 public constant C8_PRICE = 331493;
    uint256 public constant C8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant C8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant C8_REWARD_100X = 33149329;
    uint256 public constant C8_REWARD_2X = 662987;

    uint256 public constant D8_PRICE = 381217;
    uint256 public constant D8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant D8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant D8_REWARD_100X = 38121728;
    uint256 public constant D8_REWARD_2X = 762435;

    uint256 public constant E8_PRICE = 438400;
    uint256 public constant E8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant E8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant E8_REWARD_100X = 43839987;
    uint256 public constant E8_REWARD_2X = 876800;

    uint256 public constant F8_PRICE = 504160;
    uint256 public constant F8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant F8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant F8_REWARD_100X = 50415986;
    uint256 public constant F8_REWARD_2X = 1008320;

    uint256 public constant G8_PRICE = 579784;
    uint256 public constant G8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant G8_PROBABILITY_2X = 775; // 7.75%
    uint256 public constant G8_REWARD_100X = 57978383;
    uint256 public constant G8_REWARD_2X = 1159568;

    uint256 public constant H8_PRICE = 600000;
    uint256 public constant H8_PROBABILITY_100X = 25; // 0.25%
    uint256 public constant H8_PROBABILITY_5X = 775; // 7.75%
    uint256 public constant H8_REWARD_100X = 60000000;
    uint256 public constant H8_REWARD_5X = 3000000;
    uint256 public constant H8_REWARD_2X = 1200000;

    enum RewardType {
        Snowball,
        Erc20,
        TwoX,
        FiveX,
        TenX,
        TwentyX,
        FiftyX,
        HundredX
    }

    struct ScratchResult {
        RewardType rewardType;
        uint256 rewardAmount;
    }

    function getSingleScratchPrice(uint256 boardPositionToScratch) internal pure returns (uint256) {
        uint256 row = boardPositionToScratch / 8;
        uint256 column = boardPositionToScratch % 8;

        if (row == 0) {
            // ROW_1
            if (column == 0) {
                // A1
                return A1_PRICE;
            } else if (column == 1) {
                // B1
                return B1_PRICE;
            } else if (column == 2) {
                // C1
                return C1_PRICE;
            } else if (column == 3) {
                // D1
                return D1_PRICE;
            } else if (column == 4) {
                // E1
                return E1_PRICE;
            } else if (column == 5) {
                // F1
                return F1_PRICE;
            } else if (column == 6) {
                // G1
                return G1_PRICE;
            } else {
                // H1
                return H1_PRICE;
            }
        } else if (row == 1) {
            // ROW_2
            if (column == 0) {
                // A2
                return A2_PRICE;
            } else if (column == 1) {
                // B2
                return B2_PRICE;
            } else if (column == 2) {
                // C2
                return C2_PRICE;
            } else if (column == 3) {
                // D2
                return D2_PRICE;
            } else if (column == 4) {
                // E2
                return E2_PRICE;
            } else if (column == 5) {
                // F2
                return F2_PRICE;
            } else if (column == 6) {
                // G2
                return G2_PRICE;
            } else {
                // H2
                return H2_PRICE;
            }
        } else if (row == 2) {
            // ROW_3
            if (column == 0) {
                // A3
                return A3_PRICE;
            } else if (column == 1) {
                // B3
                return B3_PRICE;
            } else if (column == 2) {
                // C3
                return C3_PRICE;
            } else if (column == 3) {
                // D3
                return D3_PRICE;
            } else if (column == 4) {
                // E3
                return E3_PRICE;
            } else if (column == 5) {
                // F3
                return F3_PRICE;
            } else if (column == 6) {
                // G3
                return G3_PRICE;
            } else {
                // H3
                return H3_PRICE;
            }
        } else if (row == 3) {
            // ROW_4
            if (column == 0) {
                // A4
                return A4_PRICE;
            } else if (column == 1) {
                // B4
                return B4_PRICE;
            } else if (column == 2) {
                // C4
                return C4_PRICE;
            } else if (column == 3) {
                // D4
                return D4_PRICE;
            } else if (column == 4) {
                // E4
                return E4_PRICE;
            } else if (column == 5) {
                // F4
                return F4_PRICE;
            } else if (column == 6) {
                // G4
                return G4_PRICE;
            } else {
                // H4
                return H4_PRICE;
            }
        } else if (row == 4) {
            // ROW_5
            if (column == 0) {
                // A5
                return A5_PRICE;
            } else if (column == 1) {
                // B5
                return B5_PRICE;
            } else if (column == 2) {
                // C5
                return C5_PRICE;
            } else if (column == 3) {
                // D5
                return D5_PRICE;
            } else if (column == 4) {
                // E5
                return E5_PRICE;
            } else if (column == 5) {
                // F5
                return F5_PRICE;
            } else if (column == 6) {
                // G5
                return G5_PRICE;
            } else {
                // H5
                return H5_PRICE;
            }
        } else if (row == 5) {
            // ROW_6
            if (column == 0) {
                // A6
                return A6_PRICE;
            } else if (column == 1) {
                // B6
                return B6_PRICE;
            } else if (column == 2) {
                // C6
                return C6_PRICE;
            } else if (column == 3) {
                // D6
                return D6_PRICE;
            } else if (column == 4) {
                // E6
                return E6_PRICE;
            } else if (column == 5) {
                // F6
                return F6_PRICE;
            } else if (column == 6) {
                // G6
                return G6_PRICE;
            } else {
                // H6
                return H6_PRICE;
            }
        } else if (row == 6) {
            // ROW_7
            if (column == 0) {
                // A7
                return A7_PRICE;
            } else if (column == 1) {
                // B7
                return B7_PRICE;
            } else if (column == 2) {
                // C7
                return C7_PRICE;
            } else if (column == 3) {
                // D7
                return D7_PRICE;
            } else if (column == 4) {
                // E7
                return E7_PRICE;
            } else if (column == 5) {
                // F7
                return F7_PRICE;
            } else if (column == 6) {
                // G7
                return G7_PRICE;
            } else {
                // H7
                return H7_PRICE;
            }
        } else {
            // ROW_8
            if (column == 0) {
                // A8
                return A8_PRICE;
            } else if (column == 1) {
                // B8
                return B8_PRICE;
            } else if (column == 2) {
                // C8
                return C8_PRICE;
            } else if (column == 3) {
                // D8
                return D8_PRICE;
            } else if (column == 4) {
                // E8
                return E8_PRICE;
            } else if (column == 5) {
                // F8
                return F8_PRICE;
            } else if (column == 6) {
                // G8
                return G8_PRICE;
            } else {
                // H8
                return H8_PRICE;
            }
        }
    }

    function getRowScratchPrice(uint256 boardPositionToScratch) internal pure returns (uint256) {
        uint256 row = boardPositionToScratch / 8;

        if (row == 0) {
            return ROW_1_PRICE;
        } else if (row == 1) {
            return ROW_2_PRICE;
        } else if (row == 2) {
            return ROW_3_PRICE;
        } else if (row == 3) {
            return ROW_4_PRICE;
        } else if (row == 4) {
            return ROW_5_PRICE;
        } else if (row == 5) {
            return ROW_6_PRICE;
        } else if (row == 6) {
            return ROW_7_PRICE;
        } else {
            return ROW_8_PRICE;
        }
    }

    function remainingScratchesInRow(uint256 boardPosition) internal pure returns (uint256) {
        uint256 column = boardPosition % 8;
        return 8 - column;
    }

    function rewardMultiplier(uint8 erc20Decimals) internal pure returns (uint256) {
        return 10 ** erc20Decimals / ERC20_REWARD_DIVISOR;
    }

    function getRowScratchResults(
        uint256 boardPositionToScratch,
        uint256[] calldata randomValues,
        uint8 erc20Decimals
    ) internal pure returns (uint256 lastScratchedBoardPosition, ScratchResult memory result) {
        result = ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
        uint256 nbToScratch = remainingScratchesInRow(boardPositionToScratch);
        uint256 i;

        while (result.rewardType == RewardType.Snowball && i < nbToScratch) {
            result = getSingleScratchResult(boardPositionToScratch + i, randomValues[i], erc20Decimals);
            ++i;
        }
        lastScratchedBoardPosition = boardPositionToScratch + i - 1;
    }

    function _randomnessHit(uint256 randomValue, uint256 probability) internal pure returns (bool) {
        return (randomValue % 10 ** 64) < (probability * 10 ** 62) / PROBABILITY_DIVISOR;
    }

    function getSingleScratchResult(
        uint256 boardPositionToScratch,
        uint256 randomValue,
        uint8 erc20Decimals
    ) internal pure returns (ScratchResult memory result) {
        uint256 erc20RewardMultiplier = rewardMultiplier(erc20Decimals);
        uint256 row = boardPositionToScratch / 8;
        uint256 column = boardPositionToScratch % 8;

        if (row == 0) {
            // ROW_1
            if (column == 0) {
                // A1
                if (_randomnessHit(randomValue, A1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: A1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B1
                if (_randomnessHit(randomValue, B1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: B1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C1
                if (_randomnessHit(randomValue, C1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: C1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D1
                if (_randomnessHit(randomValue, D1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: D1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E1
                if (_randomnessHit(randomValue, E1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: E1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F1
                if (_randomnessHit(randomValue, F1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: F1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G1
                if (_randomnessHit(randomValue, G1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: G1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H1
                if (_randomnessHit(randomValue, H1_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: H1_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 1) {
            // ROW_2
            if (column == 0) {
                // A2
                if (_randomnessHit(randomValue, A2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: A2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B2
                if (_randomnessHit(randomValue, B2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: B2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C2
                if (_randomnessHit(randomValue, C2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: C2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D2
                if (_randomnessHit(randomValue, D2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: D2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E2
                if (_randomnessHit(randomValue, E2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: E2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F2
                if (_randomnessHit(randomValue, F2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: F2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G2
                if (_randomnessHit(randomValue, G2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: G2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H2
                if (_randomnessHit(randomValue, H2_PROBABILITY_ERC20)) {
                    return ScratchResult({rewardType: RewardType.Erc20, rewardAmount: H2_REWARD_ERC20 * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 2) {
            // ROW_3
            if (column == 0) {
                // A3
                if (_randomnessHit(randomValue, A3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: A3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A3_PROBABILITY_5X + A3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B3
                if (_randomnessHit(randomValue, B3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: B3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B3_PROBABILITY_5X + B3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C3
                if (_randomnessHit(randomValue, C3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: C3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C3_PROBABILITY_5X + C3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D3
                if (_randomnessHit(randomValue, D3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: D3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D3_PROBABILITY_5X + D3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E3
                if (_randomnessHit(randomValue, E3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: E3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E3_PROBABILITY_5X + E3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F3
                if (_randomnessHit(randomValue, F3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: F3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F3_PROBABILITY_5X + F3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G3
                if (_randomnessHit(randomValue, G3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: G3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G3_PROBABILITY_5X + G3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H3
                if (_randomnessHit(randomValue, H3_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H3_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H3_PROBABILITY_5X + H3_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H3_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 3) {
            // ROW_4
            if (column == 0) {
                // A4
                if (_randomnessHit(randomValue, A4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: A4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A4_PROBABILITY_5X + A4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B4
                if (_randomnessHit(randomValue, B4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: B4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B4_PROBABILITY_5X + B4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C4
                if (_randomnessHit(randomValue, C4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: C4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C4_PROBABILITY_5X + C4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D4
                if (_randomnessHit(randomValue, D4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: D4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D4_PROBABILITY_5X + D4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E4
                if (_randomnessHit(randomValue, E4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: E4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E4_PROBABILITY_5X + E4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F4
                if (_randomnessHit(randomValue, F4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: F4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F4_PROBABILITY_5X + F4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G4
                if (_randomnessHit(randomValue, G4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: G4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G4_PROBABILITY_5X + G4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H4
                if (_randomnessHit(randomValue, H4_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H4_REWARD_5X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H4_PROBABILITY_5X + H4_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H4_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 4) {
            // ROW_5
            if (column == 0) {
                // A5
                if (_randomnessHit(randomValue, A5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: A5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A5_PROBABILITY_10X + A5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B5
                if (_randomnessHit(randomValue, B5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: B5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B5_PROBABILITY_10X + B5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C5
                if (_randomnessHit(randomValue, C5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: C5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C5_PROBABILITY_10X + C5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D5
                if (_randomnessHit(randomValue, D5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: D5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D5_PROBABILITY_10X + D5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E5
                if (_randomnessHit(randomValue, E5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: E5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E5_PROBABILITY_10X + E5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F5
                if (_randomnessHit(randomValue, F5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: F5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F5_PROBABILITY_10X + F5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G5
                if (_randomnessHit(randomValue, G5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: G5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G5_PROBABILITY_10X + G5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H5
                if (_randomnessHit(randomValue, H5_PROBABILITY_10X)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: H5_REWARD_10X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H5_PROBABILITY_10X + H5_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H5_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 5) {
            // ROW_6
            if (column == 0) {
                if (_randomnessHit(randomValue, A6_PROBABILITY_20X)) {
                    // A6
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: A6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A6_PROBABILITY_20X + A6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B6
                if (_randomnessHit(randomValue, B6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: B6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B6_PROBABILITY_20X + B6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C6
                if (_randomnessHit(randomValue, C6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: C6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C6_PROBABILITY_20X + C6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D6
                if (_randomnessHit(randomValue, D6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: D6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D6_PROBABILITY_20X + D6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E6
                if (_randomnessHit(randomValue, E6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: E6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E6_PROBABILITY_20X + E6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F6
                if (_randomnessHit(randomValue, F6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: F6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F6_PROBABILITY_20X + F6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G6
                if (_randomnessHit(randomValue, G6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: G6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G6_PROBABILITY_20X + G6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H6
                if (_randomnessHit(randomValue, H6_PROBABILITY_20X)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: H6_REWARD_20X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H6_PROBABILITY_20X + H6_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H6_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else if (row == 6) {
            // ROW_7
            if (column == 0) {
                // A7
                if (_randomnessHit(randomValue, A7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: A7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A7_PROBABILITY_50X + A7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B7
                if (_randomnessHit(randomValue, B7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: B7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B7_PROBABILITY_50X + B7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C7
                if (_randomnessHit(randomValue, C7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: C7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C7_PROBABILITY_50X + C7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D7
                if (_randomnessHit(randomValue, D7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: D7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D7_PROBABILITY_50X + D7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E7
                if (_randomnessHit(randomValue, E7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: E7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E7_PROBABILITY_50X + E7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F7
                if (_randomnessHit(randomValue, F7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: F7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F7_PROBABILITY_50X + F7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G7
                if (_randomnessHit(randomValue, G7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: G7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G7_PROBABILITY_50X + G7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H7
                if (_randomnessHit(randomValue, H7_PROBABILITY_50X)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: H7_REWARD_50X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H7_PROBABILITY_50X + H7_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H7_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            }
        } else {
            // ROW_8
            if (column == 0) {
                // A8
                if (_randomnessHit(randomValue, A8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: A8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A8_PROBABILITY_100X + A8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B8
                if (_randomnessHit(randomValue, B8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: B8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B8_PROBABILITY_100X + B8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C8
                if (_randomnessHit(randomValue, C8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: C8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C8_PROBABILITY_100X + C8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D8
                if (_randomnessHit(randomValue, D8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: D8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D8_PROBABILITY_100X + D8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E8
                if (_randomnessHit(randomValue, E8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: E8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E8_PROBABILITY_100X + E8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F8
                if (_randomnessHit(randomValue, F8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: F8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F8_PROBABILITY_100X + F8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G8
                if (_randomnessHit(randomValue, G8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: G8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G8_PROBABILITY_100X + G8_PROBABILITY_2X)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G8_REWARD_2X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Snowball, rewardAmount: 0});
                }
            } else {
                // H8
                if (_randomnessHit(randomValue, H8_PROBABILITY_100X)) {
                    return ScratchResult({rewardType: RewardType.HundredX, rewardAmount: H8_REWARD_100X * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H8_PROBABILITY_100X + H8_PROBABILITY_5X)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H8_REWARD_5X * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H8_REWARD_2X * erc20RewardMultiplier});
                }
            }
        }
    }
}
