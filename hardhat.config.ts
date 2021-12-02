import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import * as config from './config';

task('deploy-decentraland', 'Deploys the LandWorks Decentraland YF Contract')
	.addParam('stakingToken', 'The address of the staking token')
	.addParam('rewardsToken', 'The address of the rewards token')
	.addParam('duration', 'The duration of the farming in seconds')
	.addParam('metaverseId', 'The ID of the Decentraland Metaverse as mapped in LandWorks')
	.addParam('landRegistry', 'The address of the LAND Registry')
	.addParam('estateRegistry', 'The address of the ESTATE Registry')
	.setAction(async (args) => {
		const deployLandWorksYF = require('./scripts/deploy-decentraland');
		await deployLandWorksYF(
			args.stakingToken,
			args.rewardsToken,
			args.duration,
			args.metaverseId,
			args.landRegistry,
			args.estateRegistry
		);
	});

module.exports = {
	solidity: {
		version: '0.8.9',
		settings: {
			optimizer: {
				enabled: true,
				runs: 9999,
				details: {
					yul: false
				}
			},
		},
	},
	defaultNetwork: 'hardhat',
	namedAccounts: {
		deployer: {
			default: 0, // here this will by default take the first account as deployer
		},
	},
	networks: config.networks,
	etherscan: config.etherscan,
	abiExporter: {
		only: ['LandWorksDecentralandStaking', 'ILandWorks', 'IERC721Consumable', 'IDecentralandEstateRegistry'],
		except: ['.*Mock$'],
		clear: true,
		flat: true,
	},
	gasReporter: {
		enabled: !!(process.env.REPORT_GAS)
	},
};
