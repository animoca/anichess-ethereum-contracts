// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

library ScratchingLib {
    uint256 public constant ROW_1_PRICE = 137;
    uint256 public constant ROW_2_PRICE = 421;
    uint256 public constant ROW_3_PRICE = 1285;
    uint256 public constant ROW_4_PRICE = 3929;
    uint256 public constant ROW_5_PRICE = 12019;
    uint256 public constant ROW_6_PRICE = 36768;
    uint256 public constant ROW_7_PRICE = 112473;
    uint256 public constant ROW_8_PRICE = 344054;

    uint256 public constant ERC20_REWARD_DIVISOR = 100;

    uint256 public constant PROBABILITY_DIVISOR = 100;

    uint256 public constant A1_PRICE = 10;
    uint256 public constant A1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant A1_REWARD_HEADLINE = 15;

    uint256 public constant B1_PRICE = 12;
    uint256 public constant B1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant B1_REWARD_HEADLINE = 17;

    uint256 public constant C1_PRICE = 13;
    uint256 public constant C1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant C1_REWARD_HEADLINE = 20;

    uint256 public constant D1_PRICE = 15;
    uint256 public constant D1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant D1_REWARD_HEADLINE = 23;

    uint256 public constant E1_PRICE = 17;
    uint256 public constant E1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant E1_REWARD_HEADLINE = 26;

    uint256 public constant F1_PRICE = 20;
    uint256 public constant F1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant F1_REWARD_HEADLINE = 30;

    uint256 public constant G1_PRICE = 23;
    uint256 public constant G1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant G1_REWARD_HEADLINE = 35;

    uint256 public constant H1_PRICE = 27;
    uint256 public constant H1_PROBABILITY_HEADLINE = 800; // 8%
    uint256 public constant H1_REWARD_HEADLINE = 40;

    uint256 public constant A2_PRICE = 31;
    uint256 public constant A2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant A2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant A2_REWARD_HEADLINE = 46;
    uint256 public constant A2_REWARD_CONSOLATION = 15;

    uint256 public constant B2_PRICE = 35;
    uint256 public constant B2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant B2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant B2_REWARD_HEADLINE = 53;
    uint256 public constant B2_REWARD_CONSOLATION = 18;

    uint256 public constant C2_PRICE = 40;
    uint256 public constant C2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant C2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant C2_REWARD_HEADLINE = 61;
    uint256 public constant C2_REWARD_CONSOLATION = 20;

    uint256 public constant D2_PRICE = 47;
    uint256 public constant D2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant D2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant D2_REWARD_HEADLINE = 70;
    uint256 public constant D2_REWARD_CONSOLATION = 23;

    uint256 public constant E2_PRICE = 54;
    uint256 public constant E2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant E2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant E2_REWARD_HEADLINE = 80;
    uint256 public constant E2_REWARD_CONSOLATION = 27;

    uint256 public constant F2_PRICE = 62;
    uint256 public constant F2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant F2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant F2_REWARD_HEADLINE = 92;
    uint256 public constant F2_REWARD_CONSOLATION = 31;

    uint256 public constant G2_PRICE = 71;
    uint256 public constant G2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant G2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant G2_REWARD_HEADLINE = 106;
    uint256 public constant G2_REWARD_CONSOLATION = 35;

    uint256 public constant H2_PRICE = 81;
    uint256 public constant H2_PROBABILITY_HEADLINE = 600; // 6%
    uint256 public constant H2_PROBABILITY_CONSOLATION = 200; // 2%
    uint256 public constant H2_REWARD_HEADLINE = 122;
    uint256 public constant H2_REWARD_CONSOLATION = 41;

    uint256 public constant A3_PRICE = 94;
    uint256 public constant A3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant A3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant A3_REWARD_HEADLINE = 234;
    uint256 public constant A3_REWARD_CONSOLATION = 47;

    uint256 public constant B3_PRICE = 108;
    uint256 public constant B3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant B3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant B3_REWARD_HEADLINE = 269;
    uint256 public constant B3_REWARD_CONSOLATION = 54;

    uint256 public constant C3_PRICE = 124;
    uint256 public constant C3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant C3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant C3_REWARD_HEADLINE = 309;
    uint256 public constant C3_REWARD_CONSOLATION = 62;

    uint256 public constant D3_PRICE = 142;
    uint256 public constant D3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant D3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant D3_REWARD_HEADLINE = 356;
    uint256 public constant D3_REWARD_CONSOLATION = 71;

    uint256 public constant E3_PRICE = 164;
    uint256 public constant E3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant E3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant E3_REWARD_HEADLINE = 409;
    uint256 public constant E3_REWARD_CONSOLATION = 82;

    uint256 public constant F3_PRICE = 188;
    uint256 public constant F3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant F3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant F3_REWARD_HEADLINE = 471;
    uint256 public constant F3_REWARD_CONSOLATION = 94;

    uint256 public constant G3_PRICE = 216;
    uint256 public constant G3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant G3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant G3_REWARD_HEADLINE = 541;
    uint256 public constant G3_REWARD_CONSOLATION = 108;

    uint256 public constant H3_PRICE = 249;
    uint256 public constant H3_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant H3_PROBABILITY_CONSOLATION = 850; // 8.5%
    uint256 public constant H3_REWARD_HEADLINE = 622;
    uint256 public constant H3_REWARD_CONSOLATION = 124;

    uint256 public constant A4_PRICE = 286;
    uint256 public constant A4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant A4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant A4_REWARD_HEADLINE = 716;
    uint256 public constant A4_REWARD_CONSOLATION = 143;

    uint256 public constant B4_PRICE = 329;
    uint256 public constant B4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant B4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant B4_REWARD_HEADLINE = 823;
    uint256 public constant B4_REWARD_CONSOLATION = 165;

    uint256 public constant C4_PRICE = 379;
    uint256 public constant C4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant C4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant C4_REWARD_HEADLINE = 946;
    uint256 public constant C4_REWARD_CONSOLATION = 189;

    uint256 public constant D4_PRICE = 435;
    uint256 public constant D4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant D4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant D4_REWARD_HEADLINE = 1088;
    uint256 public constant D4_REWARD_CONSOLATION = 218;

    uint256 public constant E4_PRICE = 501;
    uint256 public constant E4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant E4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant E4_REWARD_HEADLINE = 1252;
    uint256 public constant E4_REWARD_CONSOLATION = 250;

    uint256 public constant F4_PRICE = 576;
    uint256 public constant F4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant F4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant F4_REWARD_HEADLINE = 1439;
    uint256 public constant F4_REWARD_CONSOLATION = 288;

    uint256 public constant G4_PRICE = 662;
    uint256 public constant G4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant G4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant G4_REWARD_HEADLINE = 1655;
    uint256 public constant G4_REWARD_CONSOLATION = 331;

    uint256 public constant H4_PRICE = 761;
    uint256 public constant H4_PROBABILITY_HEADLINE = 150; // 1.5%
    uint256 public constant H4_PROBABILITY_CONSOLATION = 1050; // 10.5%
    uint256 public constant H4_REWARD_HEADLINE = 1904;
    uint256 public constant H4_REWARD_CONSOLATION = 381;

    uint256 public constant A5_PRICE = 876;
    uint256 public constant A5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant A5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant A5_REWARD_HEADLINE = 4378;
    uint256 public constant A5_REWARD_CONSOLATION = 876;

    uint256 public constant B5_PRICE = 1007;
    uint256 public constant B5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant B5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant B5_REWARD_HEADLINE = 5035;
    uint256 public constant B5_REWARD_CONSOLATION = 1007;

    uint256 public constant C5_PRICE = 1158;
    uint256 public constant C5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant C5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant C5_REWARD_HEADLINE = 5790;
    uint256 public constant C5_REWARD_CONSOLATION = 1158;

    uint256 public constant D5_PRICE = 1332;
    uint256 public constant D5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant D5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant D5_REWARD_HEADLINE = 6659;
    uint256 public constant D5_REWARD_CONSOLATION = 1332;

    uint256 public constant E5_PRICE = 1531;
    uint256 public constant E5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant E5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant E5_REWARD_HEADLINE = 7657;
    uint256 public constant E5_REWARD_CONSOLATION = 1531;

    uint256 public constant F5_PRICE = 1761;
    uint256 public constant F5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant F5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant F5_REWARD_HEADLINE = 8806;
    uint256 public constant F5_REWARD_CONSOLATION = 1761;

    uint256 public constant G5_PRICE = 2025;
    uint256 public constant G5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant G5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant G5_REWARD_HEADLINE = 10127;
    uint256 public constant G5_REWARD_CONSOLATION = 2025;

    uint256 public constant H5_PRICE = 2329;
    uint256 public constant H5_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant H5_PROBABILITY_CONSOLATION = 1300; // 13%
    uint256 public constant H5_REWARD_HEADLINE = 11646;
    uint256 public constant H5_REWARD_CONSOLATION = 2329;

    uint256 public constant A6_PRICE = 2679;
    uint256 public constant A6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant A6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant A6_REWARD_HEADLINE = 26785;
    uint256 public constant A6_REWARD_CONSOLATION = 2679;

    uint256 public constant B6_PRICE = 3080;
    uint256 public constant B6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant B6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant B6_REWARD_HEADLINE = 30803;
    uint256 public constant B6_REWARD_CONSOLATION = 3080;

    uint256 public constant C6_PRICE = 3542;
    uint256 public constant C6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant C6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant C6_REWARD_HEADLINE = 35424;
    uint256 public constant C6_REWARD_CONSOLATION = 3542;

    uint256 public constant D6_PRICE = 4074;
    uint256 public constant D6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant D6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant D6_REWARD_HEADLINE = 40737;
    uint256 public constant D6_REWARD_CONSOLATION = 4074;

    uint256 public constant E6_PRICE = 4685;
    uint256 public constant E6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant E6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant E6_REWARD_HEADLINE = 46848;
    uint256 public constant E6_REWARD_CONSOLATION = 4685;

    uint256 public constant F6_PRICE = 5387;
    uint256 public constant F6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant F6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant F6_REWARD_HEADLINE = 53875;
    uint256 public constant F6_REWARD_CONSOLATION = 5387;

    uint256 public constant G6_PRICE = 6196;
    uint256 public constant G6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant G6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant G6_REWARD_HEADLINE = 61956;
    uint256 public constant G6_REWARD_CONSOLATION = 6196;

    uint256 public constant H6_PRICE = 7125;
    uint256 public constant H6_PROBABILITY_HEADLINE = 75; // 0.75%
    uint256 public constant H6_PROBABILITY_CONSOLATION = 1525; // 15.25%
    uint256 public constant H6_REWARD_HEADLINE = 71250;
    uint256 public constant H6_REWARD_CONSOLATION = 7125;

    uint256 public constant A7_PRICE = 8194;
    uint256 public constant A7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant A7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant A7_REWARD_HEADLINE = 204841;
    uint256 public constant A7_REWARD_CONSOLATION = 20484;

    uint256 public constant B7_PRICE = 9423;
    uint256 public constant B7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant B7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant B7_REWARD_HEADLINE = 235567;
    uint256 public constant B7_REWARD_CONSOLATION = 23557;

    uint256 public constant C7_PRICE = 10836;
    uint256 public constant C7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant C7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant C7_REWARD_HEADLINE = 270902;
    uint256 public constant C7_REWARD_CONSOLATION = 27090;

    uint256 public constant D7_PRICE = 12462;
    uint256 public constant D7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant D7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant D7_REWARD_HEADLINE = 311538;
    uint256 public constant D7_REWARD_CONSOLATION = 31154;

    uint256 public constant E7_PRICE = 14331;
    uint256 public constant E7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant E7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant E7_REWARD_HEADLINE = 358268;
    uint256 public constant E7_REWARD_CONSOLATION = 35827;

    uint256 public constant F7_PRICE = 16480;
    uint256 public constant F7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant F7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant F7_REWARD_HEADLINE = 412008;
    uint256 public constant F7_REWARD_CONSOLATION = 41201;

    uint256 public constant G7_PRICE = 18952;
    uint256 public constant G7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant G7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant G7_REWARD_HEADLINE = 473810;
    uint256 public constant G7_REWARD_CONSOLATION = 47381;

    uint256 public constant H7_PRICE = 21795;
    uint256 public constant H7_PROBABILITY_HEADLINE = 100; // 1%
    uint256 public constant H7_PROBABILITY_CONSOLATION = 2800; // 28%
    uint256 public constant H7_REWARD_HEADLINE = 544881;
    uint256 public constant H7_REWARD_CONSOLATION = 54488;

    uint256 public constant A8_PRICE = 25064;
    uint256 public constant A8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant A8_REWARD_HEADLINE = 187983;

    uint256 public constant B8_PRICE = 28824;
    uint256 public constant B8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant B8_REWARD_HEADLINE = 216180;

    uint256 public constant C8_PRICE = 33148;
    uint256 public constant C8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant C8_REWARD_HEADLINE = 248607;

    uint256 public constant D8_PRICE = 38120;
    uint256 public constant D8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant D8_REWARD_HEADLINE = 285898;

    uint256 public constant E8_PRICE = 43838;
    uint256 public constant E8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant E8_REWARD_HEADLINE = 328783;

    uint256 public constant F8_PRICE = 50413;
    uint256 public constant F8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant F8_REWARD_HEADLINE = 378100;

    uint256 public constant G8_PRICE = 57975;
    uint256 public constant G8_PROBABILITY_HEADLINE = 4200; // 42%
    uint256 public constant G8_REWARD_HEADLINE = 434815;

    uint256 public constant H8_PRICE = 66672;
    uint256 public constant H8_REWARD_JACKPOT = 17857100;

    enum RewardType {
        Progress,
        OneX,
        TwoX,
        ThreeX,
        FiveX,
        TenX,
        FifteenX,
        TwentyX,
        FiftyX,
        Jackpot
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
        result = ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
        uint256 nbToScratch = remainingScratchesInRow(boardPositionToScratch);
        uint256 i;

        while (result.rewardType == RewardType.Progress && i < nbToScratch) {
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
                if (_randomnessHit(randomValue, A1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: A1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B1
                if (_randomnessHit(randomValue, B1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: B1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C1
                if (_randomnessHit(randomValue, C1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: C1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D1
                if (_randomnessHit(randomValue, D1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: D1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E1
                if (_randomnessHit(randomValue, E1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: E1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F1
                if (_randomnessHit(randomValue, F1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: F1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G1
                if (_randomnessHit(randomValue, G1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: G1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H1
                if (_randomnessHit(randomValue, H1_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: H1_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 1) {
            // ROW_2
            if (column == 0) {
                // A2
                if (_randomnessHit(randomValue, A2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: A2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A2_PROBABILITY_HEADLINE + A2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: A2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B2
                if (_randomnessHit(randomValue, B2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: B2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B2_PROBABILITY_HEADLINE + B2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: B2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C2
                if (_randomnessHit(randomValue, C2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: C2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C2_PROBABILITY_HEADLINE + C2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: C2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D2
                if (_randomnessHit(randomValue, D2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: D2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D2_PROBABILITY_HEADLINE + D2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: D2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E2
                if (_randomnessHit(randomValue, E2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: E2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E2_PROBABILITY_HEADLINE + E2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: E2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F2
                if (_randomnessHit(randomValue, F2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: F2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F2_PROBABILITY_HEADLINE + F2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: F2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G2
                if (_randomnessHit(randomValue, G2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: G2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G2_PROBABILITY_HEADLINE + G2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: G2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H2
                if (_randomnessHit(randomValue, H2_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.ThreeX, rewardAmount: H2_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H2_PROBABILITY_HEADLINE + H2_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: H2_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 2) {
            // ROW_3
            if (column == 0) {
                // A3
                if (_randomnessHit(randomValue, A3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: A3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A3_PROBABILITY_HEADLINE + A3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: A3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B3
                if (_randomnessHit(randomValue, B3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: B3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B3_PROBABILITY_HEADLINE + B3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: B3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C3
                if (_randomnessHit(randomValue, C3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: C3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C3_PROBABILITY_HEADLINE + C3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: C3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D3
                if (_randomnessHit(randomValue, D3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: D3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D3_PROBABILITY_HEADLINE + D3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: D3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E3
                if (_randomnessHit(randomValue, E3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: E3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E3_PROBABILITY_HEADLINE + E3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: E3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F3
                if (_randomnessHit(randomValue, F3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: F3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F3_PROBABILITY_HEADLINE + F3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: F3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G3
                if (_randomnessHit(randomValue, G3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: G3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G3_PROBABILITY_HEADLINE + G3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: G3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H3
                if (_randomnessHit(randomValue, H3_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H3_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H3_PROBABILITY_HEADLINE + H3_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: H3_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 3) {
            // ROW_4
            if (column == 0) {
                // A4
                if (_randomnessHit(randomValue, A4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: A4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A4_PROBABILITY_HEADLINE + A4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: A4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B4
                if (_randomnessHit(randomValue, B4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: B4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B4_PROBABILITY_HEADLINE + B4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: B4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C4
                if (_randomnessHit(randomValue, C4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: C4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C4_PROBABILITY_HEADLINE + C4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: C4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D4
                if (_randomnessHit(randomValue, D4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: D4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D4_PROBABILITY_HEADLINE + D4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: D4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E4
                if (_randomnessHit(randomValue, E4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: E4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E4_PROBABILITY_HEADLINE + E4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: E4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F4
                if (_randomnessHit(randomValue, F4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: F4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F4_PROBABILITY_HEADLINE + F4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: F4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G4
                if (_randomnessHit(randomValue, G4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: G4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G4_PROBABILITY_HEADLINE + G4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: G4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H4
                if (_randomnessHit(randomValue, H4_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H4_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H4_PROBABILITY_HEADLINE + H4_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.OneX, rewardAmount: H4_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 4) {
            // ROW_5
            if (column == 0) {
                // A5
                if (_randomnessHit(randomValue, A5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: A5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A5_PROBABILITY_HEADLINE + A5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B5
                if (_randomnessHit(randomValue, B5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: B5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B5_PROBABILITY_HEADLINE + B5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C5
                if (_randomnessHit(randomValue, C5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: C5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C5_PROBABILITY_HEADLINE + C5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D5
                if (_randomnessHit(randomValue, D5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: D5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D5_PROBABILITY_HEADLINE + D5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E5
                if (_randomnessHit(randomValue, E5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: E5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E5_PROBABILITY_HEADLINE + E5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F5
                if (_randomnessHit(randomValue, F5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: F5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F5_PROBABILITY_HEADLINE + F5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G5
                if (_randomnessHit(randomValue, G5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: G5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G5_PROBABILITY_HEADLINE + G5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H5
                if (_randomnessHit(randomValue, H5_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TenX, rewardAmount: H5_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H5_PROBABILITY_HEADLINE + H5_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H5_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 5) {
            // ROW_6
            if (column == 0) {
                if (_randomnessHit(randomValue, A6_PROBABILITY_HEADLINE)) {
                    // A6
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: A6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A6_PROBABILITY_HEADLINE + A6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: A6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B6
                if (_randomnessHit(randomValue, B6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: B6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B6_PROBABILITY_HEADLINE + B6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: B6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C6
                if (_randomnessHit(randomValue, C6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: C6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C6_PROBABILITY_HEADLINE + C6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: C6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D6
                if (_randomnessHit(randomValue, D6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: D6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D6_PROBABILITY_HEADLINE + D6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: D6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E6
                if (_randomnessHit(randomValue, E6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: E6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E6_PROBABILITY_HEADLINE + E6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: E6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F6
                if (_randomnessHit(randomValue, F6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: F6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F6_PROBABILITY_HEADLINE + F6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: F6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G6
                if (_randomnessHit(randomValue, G6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: G6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G6_PROBABILITY_HEADLINE + G6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: G6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H6
                if (_randomnessHit(randomValue, H6_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.TwentyX, rewardAmount: H6_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H6_PROBABILITY_HEADLINE + H6_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.TwoX, rewardAmount: H6_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else if (row == 6) {
            // ROW_7
            if (column == 0) {
                // A7
                if (_randomnessHit(randomValue, A7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: A7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, A7_PROBABILITY_HEADLINE + A7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: A7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B7
                if (_randomnessHit(randomValue, B7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: B7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, B7_PROBABILITY_HEADLINE + B7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: B7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C7
                if (_randomnessHit(randomValue, C7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: C7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, C7_PROBABILITY_HEADLINE + C7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: C7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D7
                if (_randomnessHit(randomValue, D7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: D7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, D7_PROBABILITY_HEADLINE + D7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: D7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E7
                if (_randomnessHit(randomValue, E7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: E7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, E7_PROBABILITY_HEADLINE + E7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: E7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F7
                if (_randomnessHit(randomValue, F7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: F7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, F7_PROBABILITY_HEADLINE + F7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: F7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G7
                if (_randomnessHit(randomValue, G7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: G7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, G7_PROBABILITY_HEADLINE + G7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: G7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H7
                if (_randomnessHit(randomValue, H7_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FiftyX, rewardAmount: H7_REWARD_HEADLINE * erc20RewardMultiplier});
                } else if (_randomnessHit(randomValue, H7_PROBABILITY_HEADLINE + H7_PROBABILITY_CONSOLATION)) {
                    return ScratchResult({rewardType: RewardType.FiveX, rewardAmount: H7_REWARD_CONSOLATION * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            }
        } else {
            // ROW_8
            if (column == 0) {
                // A8
                if (_randomnessHit(randomValue, A8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: A8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 1) {
                // B8
                if (_randomnessHit(randomValue, B8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: B8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 2) {
                // C8
                if (_randomnessHit(randomValue, C8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: C8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 3) {
                // D8
                if (_randomnessHit(randomValue, D8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: D8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 4) {
                // E8
                if (_randomnessHit(randomValue, E8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: E8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 5) {
                // F8
                if (_randomnessHit(randomValue, F8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: F8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else if (column == 6) {
                // G8
                if (_randomnessHit(randomValue, G8_PROBABILITY_HEADLINE)) {
                    return ScratchResult({rewardType: RewardType.FifteenX, rewardAmount: G8_REWARD_HEADLINE * erc20RewardMultiplier});
                } else {
                    return ScratchResult({rewardType: RewardType.Progress, rewardAmount: 0});
                }
            } else {
                // H8
                return ScratchResult({rewardType: RewardType.Jackpot, rewardAmount: H8_REWARD_JACKPOT * erc20RewardMultiplier});
            }
        }
    }
}
