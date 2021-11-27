// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  console.log("Starting deploy...");

  const LandWorksDecentralandStaking = await hre.ethers.getContractFactory("LandWorksDecentralandStaking");
  const landWorksDecentralandStaking = await LandWorksDecentralandStaking.deploy(
    process.env.STAKING_TOKEN,
    process.env.REWARDS_TOKEN,
    process.env.REWARD_RATE,
    process.env.DECENTRALAND_ESTATE_REGISTRY,
    process.env.DECENTRALAND_LAND_REGISTRY,
    process.env.METAVERSE_ID,
  );

  await landWorksDecentralandStaking.deployed();
  console.log("LandWorks NFT Staking deployed to:", landWorksDecentralandStaking.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
