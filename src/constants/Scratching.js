const RequestType = {
  MINT: 0,
  SINGLE: 1,
  ROW: 2,
};

const RewardType = {
  PROGRESS: 0,
  X1: 1,
  X2: 2,
  X3: 3,
  X5: 4,
  X10: 5,
  X15: 6,
  X20: 7,
  X50: 8,
  JACKPOT: 9,
};

const rowPrices = [
  137n, // ROW 1
  421n, // ROW 2
  1285n, // ROW 3
  3929n, // ROW 4
  12019n, // ROW 5
  36768n, // ROW 6
  112473n, // ROW 7
  344054n, // ROW 8
];

const erc20RewardDivisor = 100n;

const boardPositionsSetup = [
  {
    // A1
    price: 10n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 15n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B1
    price: 12n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 17n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C1
    price: 13n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 20n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D1
    price: 15n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 23n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E1
    price: 17n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 26n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F1
    price: 20n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 30n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G1
    price: 23n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 35n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H1
    price: 27n,
    rewards: [
      {type: RewardType.X3, probability: 800n, reward: 40n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A2
    price: 31n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 46n},
      {type: RewardType.X1, probability: 200n, reward: 15n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // B2
    price: 35n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 53n},
      {type: RewardType.X1, probability: 200n, reward: 18n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // C2
    price: 40n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 61n},
      {type: RewardType.X1, probability: 200n, reward: 20n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // D2
    price: 47n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 70n},
      {type: RewardType.X1, probability: 200n, reward: 23n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // E2
    price: 54n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 80n},
      {type: RewardType.X1, probability: 200n, reward: 27n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // F2
    price: 62n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 92n},
      {type: RewardType.X1, probability: 200n, reward: 31n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // G2
    price: 71n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 106n},
      {type: RewardType.X1, probability: 200n, reward: 35n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // H2
    price: 81n,
    rewards: [
      {type: RewardType.X3, probability: 600n, reward: 122n},
      {type: RewardType.X1, probability: 200n, reward: 41n},
      {type: RewardType.PROGRESS, probability: 9200n, reward: 0n},
    ],
  },
  {
    // A3
    price: 94n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 234n},
      {type: RewardType.X1, probability: 850n, reward: 47n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // B3
    price: 108n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 269n},
      {type: RewardType.X1, probability: 850n, reward: 54n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // C3
    price: 124n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 309n},
      {type: RewardType.X1, probability: 850n, reward: 62n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // D3
    price: 142n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 356n},
      {type: RewardType.X1, probability: 850n, reward: 71n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // E3
    price: 164n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 409n},
      {type: RewardType.X1, probability: 850n, reward: 82n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // F3
    price: 188n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 471n},
      {type: RewardType.X1, probability: 850n, reward: 94n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // G3
    price: 216n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 541n},
      {type: RewardType.X1, probability: 850n, reward: 108n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // H3
    price: 249n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 622n},
      {type: RewardType.X1, probability: 850n, reward: 124n},
      {type: RewardType.PROGRESS, probability: 9000n, reward: 0n},
    ],
  },
  {
    // A4
    price: 286n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 716n},
      {type: RewardType.X1, probability: 1050n, reward: 143n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // B4
    price: 329n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 823n},
      {type: RewardType.X1, probability: 1050n, reward: 165n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // C4
    price: 379n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 946n},
      {type: RewardType.X1, probability: 1050n, reward: 189n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // D4
    price: 435n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 1088n},
      {type: RewardType.X1, probability: 1050n, reward: 218n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // E4
    price: 501n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 1252n},
      {type: RewardType.X1, probability: 1050n, reward: 250n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // F4
    price: 576n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 1439n},
      {type: RewardType.X1, probability: 1050n, reward: 288n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // G4
    price: 662n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 1655n},
      {type: RewardType.X1, probability: 1050n, reward: 331n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // H4
    price: 761n,
    rewards: [
      {type: RewardType.X5, probability: 150n, reward: 1904n},
      {type: RewardType.X1, probability: 1050n, reward: 381n},
      {type: RewardType.PROGRESS, probability: 8800n, reward: 0n},
    ],
  },
  {
    // A5
    price: 876n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 4378n},
      {type: RewardType.X2, probability: 1300n, reward: 876n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // B5
    price: 1007n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 5035n},
      {type: RewardType.X2, probability: 1300n, reward: 1007n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // C5
    price: 1158n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 5790n},
      {type: RewardType.X2, probability: 1300n, reward: 1158n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // D5
    price: 1332n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 6659n},
      {type: RewardType.X2, probability: 1300n, reward: 1332n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // E5
    price: 1531n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 7657n},
      {type: RewardType.X2, probability: 1300n, reward: 1531n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // F5
    price: 1761n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 8806n},
      {type: RewardType.X2, probability: 1300n, reward: 1761n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // G5
    price: 2025n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 10127n},
      {type: RewardType.X2, probability: 1300n, reward: 2025n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // H5
    price: 2329n,
    rewards: [
      {type: RewardType.X10, probability: 100n, reward: 11646n},
      {type: RewardType.X2, probability: 1300n, reward: 2329n},
      {type: RewardType.PROGRESS, probability: 8600n, reward: 0n},
    ],
  },
  {
    // A6
    price: 2679n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 26785n},
      {type: RewardType.X2, probability: 1525n, reward: 2679n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // B6
    price: 3080n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 30803n},
      {type: RewardType.X2, probability: 1525n, reward: 3080n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // C6
    price: 3542n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 35424n},
      {type: RewardType.X2, probability: 1525n, reward: 3542n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // D6
    price: 4074n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 40737n},
      {type: RewardType.X2, probability: 1525n, reward: 4074n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // E6
    price: 4685n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 46848n},
      {type: RewardType.X2, probability: 1525n, reward: 4685n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // F6
    price: 5387n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 53875n},
      {type: RewardType.X2, probability: 1525n, reward: 5387n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // G6
    price: 6196n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 61956n},
      {type: RewardType.X2, probability: 1525n, reward: 6196n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // H6
    price: 7125n,
    rewards: [
      {type: RewardType.X20, probability: 75n, reward: 71250n},
      {type: RewardType.X2, probability: 1525n, reward: 7125n},
      {type: RewardType.PROGRESS, probability: 8400n, reward: 0n},
    ],
  },
  {
    // A7
    price: 8194n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 204841n},
      {type: RewardType.X5, probability: 2800n, reward: 20484n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // B7
    price: 9423n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 235567n},
      {type: RewardType.X5, probability: 2800n, reward: 23557n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // C7
    price: 10836n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 270902n},
      {type: RewardType.X5, probability: 2800n, reward: 27090n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // D7
    price: 12462n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 311538n},
      {type: RewardType.X5, probability: 2800n, reward: 31154n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // E7
    price: 14331n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 358268n},
      {type: RewardType.X5, probability: 2800n, reward: 35827n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // F7
    price: 16480n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 412008n},
      {type: RewardType.X5, probability: 2800n, reward: 41201n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // G7
    price: 18952n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 473810n},
      {type: RewardType.X5, probability: 2800n, reward: 47381n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // H7
    price: 21795n,
    rewards: [
      {type: RewardType.X50, probability: 100n, reward: 544881n},
      {type: RewardType.X5, probability: 2800n, reward: 54488n},
      {type: RewardType.PROGRESS, probability: 7100n, reward: 0n},
    ],
  },
  {
    // A8
    price: 25064n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 187983n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // B8
    price: 28824n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 216180n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // C8
    price: 33148n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 248607n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // D8
    price: 38120n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 285898n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // E8
    price: 43838n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 328783n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // F8
    price: 50413n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 378100n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // G8
    price: 57975n,
    rewards: [
      {type: RewardType.X15, probability: 4200n, reward: 434815n},
      {type: RewardType.PROGRESS, probability: 5800n, reward: 0n},
    ],
  },
  {
    // H8
    price: 66672n,
    rewards: [{type: RewardType.JACKPOT, probability: 10000n, reward: 17857100n}],
  },
];

module.exports = {RequestType, RewardType, rowPrices, boardPositionsSetup, erc20RewardDivisor};
