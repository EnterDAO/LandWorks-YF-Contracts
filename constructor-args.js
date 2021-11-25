module.exports = [
  process.env.STAKING_TOKEN,
  process.env.REWARDS_TOKEN,
  ethers.utils.parseEther(process.env.REWARDS_AMOUNT),
  process.env.REWARD_RATE,
  process.env.DECENTRALAND_ESTATE_REGISTRY,
  process.env.DECENTRALAND_LAND_REGISTRY,
];