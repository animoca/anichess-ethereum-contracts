# Anichess Ethereum Contracts

[![NPM Package](https://img.shields.io/npm/v/@animoca/anichess-ethereum-contracts.svg)](https://www.npmjs.org/package/@animoca/anichess-ethereum-contracts)
[![Coverage Status](https://codecov.io/gh/animoca/anichess-ethereum-contracts/graph/badge.svg)](https://codecov.io/gh/animoca/anichess-ethereum-contracts)

Solidity contracts for the Anichess project.

## Installation

To install the module in your project, add it as an npm dependency:

```bash
yarn add -D @animoca/anichess-ethereum-contracts
```

or

```bash
npm add --save-dev @animoca/anichess-ethereum-contracts
```

## Development

Install the dependencies:

```bash
yarn
```

Compile the contracts:

```bash
yarn compile
```

Run the tests:

```bash
yarn test
# or
yarn test-p # parallel mode
```

Run the coverage tests:

```bash
yarn coverage
```

Run the full pipeline (should be run before commiting code):

```bash
yarn run-all
```

See `package.json` for additional commands.

Note: this repository uses git lfs: the module should be installed before pushing changes.
