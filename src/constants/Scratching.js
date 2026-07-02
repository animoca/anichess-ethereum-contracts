const RequestType = {
  MINT: 0,
  SINGLE: 1,
  ROW: 2,
};

const RewardType = {
  SNOWBALL: 0,
  ERC20: 1,
  X2: 2,
  X5: 3,
  X10: 4,
  X20: 5,
  X50: 6,
  X100: 7,
};

const rowPrices = [
  1373n, // ROW 1
  4199n, // ROW 2
  12845n, // ROW 3
  39293n, // ROW 4
  120199n, // ROW 5
  367691n, // ROW 6
  1124777n, // ROW 7
  3373966n, // ROW 8
];

const erc20RewardDivisor = 100n;

const boardPositionsSetup = [
  {
    // A1
    price: 100,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 300n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B1
    price: 115,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 345n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C1
    price: 132,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 397n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D1
    price: 152,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 456n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E1
    price: 175,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 525n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F1
    price: 201,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 603n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G1
    price: 231,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 694n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H1
    price: 266,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 798n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A2
    price: 306,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 918n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B2
    price: 352,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 1055n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C2
    price: 405,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 1214n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D2
    price: 465,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 1396n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E2
    price: 535,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 1605n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F2
    price: 615,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 1846n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G2
    price: 708,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 2123n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H2
    price: 814,
    rewards: [
      {type: RewardType.ERC20, probability: 800n, reward: 2441n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A3
    price: 936,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 4679n},
      {type: RewardType.X2, probability: 600n, reward: 1872n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B3
    price: 1076,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 5381n},
      {type: RewardType.X2, probability: 600n, reward: 2152n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C3
    price: 1238,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 6188n},
      {type: RewardType.X2, probability: 600n, reward: 2475n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D3
    price: 1423,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 7116n},
      {type: RewardType.X2, probability: 600n, reward: 2846n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E3
    price: 1637,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 8183n},
      {type: RewardType.X2, probability: 600n, reward: 3273n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F3
    price: 1882,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 9411n},
      {type: RewardType.X2, probability: 600n, reward: 3764n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G3
    price: 2164,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 10822n},
      {type: RewardType.X2, probability: 600n, reward: 4329n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H3
    price: 2489,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 12446n},
      {type: RewardType.X2, probability: 600n, reward: 4978n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A4
    price: 2863,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 14313n},
      {type: RewardType.X2, probability: 600n, reward: 5725n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B4
    price: 3292,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 16459n},
      {type: RewardType.X2, probability: 600n, reward: 6584n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C4
    price: 3786,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 18928n},
      {type: RewardType.X2, probability: 600n, reward: 7571n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D4
    price: 4354,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 21768n},
      {type: RewardType.X2, probability: 600n, reward: 8707n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E4
    price: 5007,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 25033n},
      {type: RewardType.X2, probability: 600n, reward: 10013n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F4
    price: 5758,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 28788n},
      {type: RewardType.X2, probability: 600n, reward: 11515n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G4
    price: 6621,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 33106n},
      {type: RewardType.X2, probability: 600n, reward: 13242n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H4
    price: 7614,
    rewards: [
      {type: RewardType.X5, probability: 200n, reward: 38072n},
      {type: RewardType.X2, probability: 600n, reward: 15229n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },

  {
    // A5
    price: 8757,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 87565n},
      {type: RewardType.X2, probability: 600n, reward: 17513n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B5
    price: 10070,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 100700n},
      {type: RewardType.X2, probability: 600n, reward: 20140n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C5
    price: 11580,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 115805n},
      {type: RewardType.X2, probability: 600n, reward: 23161n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D5
    price: 13318,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 133176n},
      {type: RewardType.X2, probability: 600n, reward: 26635n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E5
    price: 15315,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 153152n},
      {type: RewardType.X2, probability: 600n, reward: 30630n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F5
    price: 17612,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 176125n},
      {type: RewardType.X2, probability: 600n, reward: 35225n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G5
    price: 20254,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 202543n},
      {type: RewardType.X2, probability: 600n, reward: 40509n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H5
    price: 23292,
    rewards: [
      {type: RewardType.X10, probability: 200n, reward: 232925n},
      {type: RewardType.X2, probability: 600n, reward: 46585n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A6
    price: 26786,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 535727n},
      {type: RewardType.X2, probability: 600n, reward: 53573n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B6
    price: 30804,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 616086n},
      {type: RewardType.X2, probability: 600n, reward: 61609n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C6
    price: 35425,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 708499n},
      {type: RewardType.X2, probability: 600n, reward: 70850n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D6
    price: 40739,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 814774n},
      {type: RewardType.X2, probability: 600n, reward: 81477n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E6
    price: 46850,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 936990n},
      {type: RewardType.X2, probability: 600n, reward: 93699n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F6
    price: 53877,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 1077539n},
      {type: RewardType.X2, probability: 600n, reward: 107754n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G6
    price: 61958,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 1239169n},
      {type: RewardType.X2, probability: 600n, reward: 123917n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H6
    price: 71252,
    rewards: [
      {type: RewardType.X20, probability: 200n, reward: 1425045n},
      {type: RewardType.X2, probability: 600n, reward: 142504n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A7
    price: 81940,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 4097004n},
      {type: RewardType.X2, probability: 750n, reward: 163880n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B7
    price: 94231,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 4711554n},
      {type: RewardType.X2, probability: 750n, reward: 188462n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C7
    price: 108366,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 5418287n},
      {type: RewardType.X2, probability: 750n, reward: 216731n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D7
    price: 124621,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 6231030n},
      {type: RewardType.X2, probability: 750n, reward: 249241n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E7
    price: 143314,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 7165685n},
      {type: RewardType.X2, probability: 750n, reward: 286627n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F7
    price: 164811,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 8240538n},
      {type: RewardType.X2, probability: 750n, reward: 329622n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G7
    price: 189532,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 9476618n},
      {type: RewardType.X2, probability: 750n, reward: 379065n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H7
    price: 217962,
    rewards: [
      {type: RewardType.X50, probability: 50n, reward: 10898111n},
      {type: RewardType.X2, probability: 750n, reward: 435924n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A8
    price: 250657,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 25065655n},
      {type: RewardType.X2, probability: 750n, reward: 501313n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B8
    price: 288255,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 28825503n},
      {type: RewardType.X2, probability: 750n, reward: 576510n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C8
    price: 331493,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 33149329n},
      {type: RewardType.X2, probability: 750n, reward: 662987n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D8
    price: 381217,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 38121728n},
      {type: RewardType.X2, probability: 750n, reward: 762435n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E8
    price: 438400,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 43839987n},
      {type: RewardType.X2, probability: 750n, reward: 876800n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F8
    price: 504160,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 50415986n},
      {type: RewardType.X2, probability: 750n, reward: 1008320n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G8
    price: 579784,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 57978383n},
      {type: RewardType.X2, probability: 750n, reward: 1159568n},
      {type: RewardType.SNOWBALL, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H8
    price: 600000,
    rewards: [
      {type: RewardType.X100, probability: 25n, reward: 60000000n},
      {type: RewardType.X5, probability: 775n, reward: 3000000n},
      {type: RewardType.X2, probability: 9200n, reward: 1200000n},
    ],
  },
];

module.exports = {RequestType, RewardType, rowPrices, boardPositionsSetup, erc20RewardDivisor};
