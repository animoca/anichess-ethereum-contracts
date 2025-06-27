# Anichess Ethereum Contracts

[![NPM Package](https://img.shields.io/npm/v/@animoca/anichess-ethereum-contracts.svg)](https://www.npmjs.org/package/@animoca/anichess-ethereum-contracts)
[![Coverage Status](https://codecov.io/gh/animoca/anichess-ethereum-contracts/graph/badge.svg)](https://codecov.io/gh/animoca/anichess-ethereum-contracts)

Solidity contracts for the Anichess project.

## Audits

| Date       | Scope                                                                                                                                                 | Commit                                                                                                                                  | Package version                                                            | Auditor                                | Report                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 10/06/2025 | staking/\* | [75e0894104c5a71297bc8ea568388202abd80847](https://github.com/animoca/ethereum-contracts/tree/75e0894104c5a71297bc8ea568388202abd80847) | [4.2.2](https://www.npmjs.com/package/@animoca/ethereum-contracts/v/4.2.2) | [Oak Security](https://www.oaksecurity.io)    | [link](/audit/2025-06-23%20Audit%20Report%20-%20Anichess%20Ethereum%20Contracts%20v1.2.pdf)   |

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
