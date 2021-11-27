<div align="center">

# LandWorks Yield Farming

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## Overview

The repository contains contracts for farming with LandWork NFTs. Each lender in LandWorks receives an ERC-721
representation (known as LandWorks NFT) of their "deposit". That ERC-721 can be used to farm $ENTR tokens, by
depositing/locking them into the LandWorks NFT Staking contract that uses ERC-721 instead of the normal ERC-20 token.
The basis of the staking contract is the stripped down version of
Synthetix's [StakingRewards](https://solidity-by-example.org/defi/staking-rewards/) contract.

LandWorks NFT owner can stake or withdraw his/hers NFTs at any time.

## Development

[hardhat](https://hardhat.org/) - framework used for the development and testing of the contracts

1. After cloning, run:

```
cd LandWorks-YF-Contracts
npm install
```

2. Set up the config file by executing:

```bash
cp config.sample.ts config.ts
``` 

### Compilation

Before you deploy the contracts, you will need to compile them using:

```
npx hardhat compile
```

### Deployment

**Prerequisite**

Before running the deploy `npx hardhat` script, you need to create and populate the `config.ts` file. You can use
the `config.sample.ts` file and populate the following variables:

```markdown
YOUR-INFURA-API-KEY YOUR-ETHERSCAN-API-KEY
```

**Decentraland Staking**

* Deploys the `LandWorksDecentralandStaking` contract

```shell
npx hardhat deploy-decentraland \
    --network <network name> \
    --staking-token <address of the staking token> \
    --rewards-token <address of the rewards token> \
    --reward-rate <reward rate per token staked> \
    --metaverse-id <ID of Decentraland as mapped in LW Contracts> \
    --land-registry <address of LAND registry> \
    --estate-registry <address of ESTATE registry>
```

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
