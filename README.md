<div align="center">

# LandWorks Yield Farming

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

The goal of yield farming with LandWorks NFTs is to bootstrap the initial liquidity of lenders in LandWorks.

Each lender in LandWorks receives an ERC-721 representation (known as LandWorks NFT) of their "deposit". That ERC-721 can be used to farm ENTR tokens, by depositing/locking them into the LandWorks NFT Staking contract that uses ERC-721 instead of the normal ERC-20 token. As a basis of the LandWorks NFT Staking, the widely used StakingRewards contract by Synthetix is used.

## Contracts

### LandWorksDecentralandStaking

The main contract used for staking the LandWorks NFTs. A LandWorks NFT owner can stake and unstake his/hers NFTs at any time.

## Development


[hardhat](https://hardhat.org/) - framework used for the development and testing of the contracts

After cloning, run:
```
cd LandWorks-YF-Contracts
npm install
```

### Compilation

Before you deploy the contracts, you will need to compile them using:

```
npx hardhat compile
```

### Deployment

TODO

### Tests

#### Unit Tests

```bash
npx hardhat test
```

#### Coverage

TODO
```bash
npx hardhat coverage
```
