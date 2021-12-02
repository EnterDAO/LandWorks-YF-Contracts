import hardhat, {ethers} from 'hardhat';

async function deployDecentraland(
	stakingToken: string,
	rewardsToken: string,
	duration: string,
	metaverseId: number,
	landRegistry: string,
	estateRegistry: string
) {
	await hardhat.run('compile');

	console.log("Deploying...");
	const LWDecentralandStaking = await ethers.getContractFactory("LandWorksDecentralandStaking");
	const lwDecentralandStaking = await LWDecentralandStaking.deploy(
		stakingToken,
		rewardsToken,
		duration,
		metaverseId,
		landRegistry,
		estateRegistry
	);
	await lwDecentralandStaking.deployTransaction.wait(5);
	console.log("LandWorks YF deployed to:", lwDecentralandStaking.address);

	/**
	 * Verify Contracts
	 */
	console.log('Verifying LandWorks Decentraland YF on Etherscan...');
	await hardhat.run('verify:verify', {
		address: lwDecentralandStaking.address,
		constructorArguments: [stakingToken, rewardsToken, duration, metaverseId, estateRegistry, landRegistry]
	});
}

module.exports = deployDecentraland;