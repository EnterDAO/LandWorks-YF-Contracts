import {ethers} from "hardhat";
import {expect} from 'chai';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Contract} from "ethers";
describe("LandWorks Decentraland Staking", () => {

	let owner: SignerWithAddress, nftHolder: SignerWithAddress, nonNftHolder: SignerWithAddress,
		anotherNftHolder: SignerWithAddress;
	let mockLandWorksNft: Contract, staking: Contract, landRegistryMock: Contract, estateRegistryMock: Contract,
		mockENTR: Contract;
	let snapshotId: any;

	const METAVERSE_ID = 1;
	const REWARD_DURATION = 31536000; // 1 year in seconds
	const REWARD = ethers.utils.parseEther("1000000") // 1000000 ENTR
	const REWARD_RATE = REWARD.div(REWARD_DURATION);

	before(async () => {
		const signers = await ethers.getSigners();
		owner = signers[0];
		nftHolder = signers[1];
		nonNftHolder = signers[2];
		anotherNftHolder = signers[3];

		const EstateRegistryMock = await ethers.getContractFactory("EstateRegistryMock");
		estateRegistryMock = await EstateRegistryMock.deploy();

		const LandRegistryMock = await ethers.getContractFactory("LandRegistryMock");
		landRegistryMock = await LandRegistryMock.deploy();

		const MockENTR = await ethers.getContractFactory("MockENTR");
		mockENTR = await MockENTR.deploy();

		const MockLandWorksNFT = await ethers.getContractFactory("MockLandWorksNFT");
		mockLandWorksNft = await MockLandWorksNFT.deploy(landRegistryMock.address, estateRegistryMock.address);

		const LandWorksDecentralandStaking = await ethers.getContractFactory("LandWorksDecentralandStaking");
		staking = await LandWorksDecentralandStaking.deploy(
			mockLandWorksNft.address,
			mockENTR.address,
			REWARD_DURATION,
			METAVERSE_ID,
			landRegistryMock.address,
			estateRegistryMock.address
		);
		await mockENTR.mint(staking.address, REWARD);
	});

	beforeEach(async function () {
		snapshotId = await ethers.provider.send('evm_snapshot', []);
	});

	afterEach(async function () {
		await ethers.provider.send('evm_revert', [snapshotId]);
	});

	it("Should initialize properly with correct configuration", async () => {
		expect(await staking.rewardsToken()).to.equal(mockENTR.address);
		expect(await staking.stakingToken()).to.equal(mockLandWorksNft.address);
		expect(await staking.rewardsDuration()).to.equal(REWARD_DURATION);
		expect(await staking.metaverseId()).to.equal(METAVERSE_ID);
		expect(await staking.landRegistry()).to.equal(landRegistryMock.address);
		expect(await staking.estateRegistry()).to.equal(estateRegistryMock.address);
	});

	describe('Owner', () => {

		it('Should set owner to deployer', async () => {
			expect(await staking.owner()).to.equal(owner.address);
		});

		it('Should allow owner to pause', async () => {
			await expect(staking.pause())
				.to.emit(staking, "Paused").withArgs(owner.address);
		});

		it('Should allow owner to unpause', async () => {
			await staking.pause();
			await expect(staking.unpause())
				.to.emit(staking, "Unpaused").withArgs(owner.address);
		});

		it('Should not allow nonOnwer to pause', async () => {
			const expectedRevertMessage = 'Ownable: caller is not the owner';
			await expect(staking.connect(nftHolder).pause()).to.be.revertedWith(expectedRevertMessage);
		});

		it('Should not allow nonOnwer to unpause', async () => {
			const expectedRevertMessage = 'Ownable: caller is not the owner';
			await staking.pause();
			await expect(staking.connect(nftHolder).unpause()).to.be.revertedWith(expectedRevertMessage);
		});

		it('Should not allow nonOwner to change rewardsDuration', async () => {
			const expectedRevertMessage = 'Ownable: caller is not the owner';
			await expect(staking.connect(nftHolder).setRewardsDuration(REWARD_DURATION))
				.to.be.revertedWith(expectedRevertMessage);
		});

		it('Should not allow nonOwner to notifyRewardAmount', async () => {
			const expectedRevertMessage = 'Ownable: caller is not the owner';
			await expect(staking.connect(nftHolder).notifyRewardAmount(1))
				.to.be.revertedWith(expectedRevertMessage);
		});

	})

	it('Should update rewards duration accordingly', async () => {
		await staking.setRewardsDuration(REWARD_DURATION);
		expect(await staking.rewardsDuration()).to.equal(REWARD_DURATION);
	})

	it('Should emit event on update rewards duration', async () => {
		await expect(staking.setRewardsDuration(REWARD_DURATION))
			.to.emit(staking, "RewardsDurationUpdated").withArgs(REWARD_DURATION);
	})

	it('Should not update rewards duration if previous reward period as not finished', async () => {
		const expectedRevertMessage = 'Staking: Previous rewards period must be complete before changing the' +
			' duration for the new period';
		await staking.notifyRewardAmount(REWARD);
		await expect(staking.setRewardsDuration(REWARD_DURATION + 1)).to.revertedWith(expectedRevertMessage);
	})

	it('Should notifyRewardsAmount accordingly when period finished', async() => {
		await staking.setRewardsDuration(10);
		const tx = await staking.notifyRewardAmount(ethers.utils.parseEther("1"));
		await tx.wait();
		const block = await ethers.provider.getBlock(tx.blockNumber);

		expect(await staking.rewardRate()).to.equal(ethers.utils.parseEther("1").div(10));
		expect(await staking.lastUpdateTime()).to.equal(block.timestamp);
		expect(await staking.periodFinish()).to.equal(block.timestamp + 10);
	});

	it('Should notifyRewardsAmount accordingly when period has not finished', async() => {
		const ONE_ENTR = ethers.utils.parseEther("1");
		await staking.setRewardsDuration(10);
		await staking.notifyRewardAmount(ONE_ENTR);
		const firstExpectedRewardRate = ONE_ENTR.div(10);
		expect(await staking.rewardRate()).to.equal(firstExpectedRewardRate);

		const tx = await staking.notifyRewardAmount(ONE_ENTR);
		await tx.wait();
		const block = await ethers.provider.getBlock(tx.blockNumber);
		expect(await staking.rewardRate()).to.equal(
			(firstExpectedRewardRate.mul(9).add(ONE_ENTR)).div(10)
		);
		expect(await staking.lastUpdateTime()).to.equal(block.timestamp);
		expect(await staking.periodFinish()).to.equal(block.timestamp + 10);
	});

	describe('', () => {

		before(async () => {
			await staking.setRewardsDuration(REWARD_DURATION);
			await staking.notifyRewardAmount(REWARD);
		})

		it('Should set reward rate properly', async () => {
			expect(await staking.rewardRate()).to.equal(REWARD_RATE);
		})

		it("Should revert if reward is too high", async () => {
			const expectedRevertMessage = 'Staking: Provided reward too high';
			await expect(staking.notifyRewardAmount(REWARD.add(1))).to.be.revertedWith(expectedRevertMessage);
		});

		describe("Staking", () => {

			it("Should stake LandWorks NFTs successfully", async () => {
				await mockLandWorksNft.generateTestAssets(2, nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);

				await staking.connect(nftHolder).stake([1, 2]);

				const balanceOfContract = await mockLandWorksNft.balanceOf(staking.address);
				expect(balanceOfContract.toNumber()).to.equal(2);
				expect(await staking.totalSupply()).to.equal(6);
				expect(await staking.balances(nftHolder.address)).to.equal(6);
				expect(await staking.stakedAssets(1)).to.equal(nftHolder.address);
				expect(await staking.stakedAssets(2)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(1)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(2)).to.equal(nftHolder.address);
			});

			it("Should update fields correctly on second time staking", async () => {
				await mockLandWorksNft.generateTestAssets(3, nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
				await staking.connect(nftHolder).stake([1]);
				expect((await mockLandWorksNft.balanceOf(staking.address)).toNumber()).to.equal(1);

				await staking.connect(nftHolder).stake([2, 3]);
				const balanceOfContract = await mockLandWorksNft.balanceOf(staking.address);
				expect(balanceOfContract.toNumber()).to.equal(3);
				expect(await staking.totalSupply()).to.equal(7);
				expect(await staking.balances(nftHolder.address)).to.equal(7);
				expect(await staking.stakedAssets(1)).to.equal(nftHolder.address);
				expect(await staking.stakedAssets(2)).to.equal(nftHolder.address);
				expect(await staking.stakedAssets(3)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(1)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(2)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(3)).to.equal(nftHolder.address);
			})

			it("Should emit events correctly", async () => {
				await mockLandWorksNft.generateTestAssets(2, nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);

				await expect(staking.connect(nftHolder).stake([1, 2]))
					.to.emit(mockLandWorksNft, "Transfer").withArgs(nftHolder.address, staking.address, 1)
					.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, nftHolder.address, 1)
					.to.emit(mockLandWorksNft, "Transfer").withArgs(nftHolder.address, staking.address, 2)
					.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, nftHolder.address, 2)
					.to.emit(staking, "Staked").withArgs(nftHolder.address, 6, [1, 2])
			});

			it("Should not allow staking of unsupported metaverse Id", async () => {
				const expectedRevertMessage = 'Staking: Invalid metaverseId';
				await mockLandWorksNft.generateWithInvalidMetaverseId(nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);

				await expect(staking.connect(nftHolder).stake([1])).to.be.revertedWith(expectedRevertMessage);
			});

			it("Should not allow staking of unsupported registry", async () => {
				const expectedRevertMessage = 'Staking: Invalid metaverseRegistry';
				await mockLandWorksNft.generateWithInvalidRegistry(nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
				await expect(staking.connect(nftHolder).stake([1])).to.be.revertedWith(expectedRevertMessage);
			});

			it("Should revert on staking non-existing tokens", async () => {
				const expectedRevertMessage = 'ERC721: operator query for nonexistent token';
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
				await expect(staking.connect(nftHolder).stake([100])).to.be.revertedWith(expectedRevertMessage);
			});

			it("Should revert on staking non-owned tokens", async () => {
				const expectedRevertMessage = 'ERC721: transfer caller is not owner nor approved';
				await mockLandWorksNft.generateTestAssets(1, owner.address);
				await mockLandWorksNft.connect(nonNftHolder).setApprovalForAll(staking.address, true);
				await expect(staking.connect(nonNftHolder).stake([1])).to.be.revertedWith(expectedRevertMessage);
			});

			it('Should not allow staking of no tokens', async () => {
				const expectedRevertMessage = `Staking: No tokenIds provided`;
				await expect(staking.connect(nftHolder).stake([])).to.be.revertedWith(expectedRevertMessage);
			});

			it('Should not allow staking when paused', async () => {
				const expectedRevertMessage = 'Pausable: paused';
				await staking.pause();

				await expect(staking.connect(nftHolder).stake([1])).to.be.revertedWith(expectedRevertMessage);
			})

		});

		describe('Withdrawal', async () => {

			beforeEach(async () => {
				await mockLandWorksNft.generateTestAssets(2, nftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
				await staking.connect(nftHolder).stake([1, 2]);
			});

			it("Should withdraw staked LandWorks NFTs successfully", async () => {
				const balanceOfContractBefore = await mockLandWorksNft.balanceOf(staking.address);
				expect(balanceOfContractBefore.toNumber()).to.equal(2);
				expect(await staking.totalSupply()).to.equal(6);
				expect(await staking.balances(nftHolder.address)).to.equal(6);
				expect(await staking.stakedAssets(1)).to.equal(nftHolder.address);
				expect(await staking.stakedAssets(2)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(1)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.consumerOf(2)).to.equal(nftHolder.address);

				await staking.connect(nftHolder).withdraw([1, 2]);
				const balanceOfContractAfter = await mockLandWorksNft.balanceOf(staking.address);
				expect(balanceOfContractAfter.toNumber()).to.equal(0);

				const balanceOfStaker = await mockLandWorksNft.balanceOf(nftHolder.address);
				expect(balanceOfStaker.toNumber()).to.equal(2);
				expect(await mockLandWorksNft.ownerOf(1)).to.equal(nftHolder.address);
				expect(await mockLandWorksNft.ownerOf(2)).to.equal(nftHolder.address);
				expect(await staking.totalSupply()).to.equal(0);
				expect(await staking.balances(nftHolder.address)).to.equal(0);
				expect(await staking.stakedAssets(1)).to.equal(ethers.constants.AddressZero);
				expect(await staking.stakedAssets(2)).to.equal(ethers.constants.AddressZero);
				expect(await mockLandWorksNft.consumerOf(1)).to.equal(ethers.constants.AddressZero);
				expect(await mockLandWorksNft.consumerOf(2)).to.equal(ethers.constants.AddressZero);
			});

			it('Should withdraw when paused', async () => {
				await staking.pause();
				await expect(staking.connect(nftHolder).withdraw([1, 2])).to.not.be.reverted;
			})

			it("Should emit events correctly on Withdraw", async () => {
				await expect(staking.connect(nftHolder).withdraw([1, 2]))
					.to.emit(mockLandWorksNft, "Transfer").withArgs(staking.address, nftHolder.address, 1)
					.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, ethers.constants.AddressZero, 1)
					.to.emit(mockLandWorksNft, "Transfer").withArgs(staking.address, nftHolder.address, 2)
					.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, ethers.constants.AddressZero, 2)
					.to.emit(staking, "Withdrawn").withArgs(nftHolder.address, 6, [1, 2]);
			});

			it("Should not be able to withdraw LandWorks NFTs staked by other person", async () => {
				const expectedRevertMessage = 'Staking: Not owner of the token';
				await expect(staking.connect(nonNftHolder).withdraw([1, 2])).revertedWith(expectedRevertMessage);
			});

			it('Should not allow staking of no tokens', async () => {
				const expectedRevertMessage = `Staking: No tokenIds provided`;
				await expect(staking.connect(nftHolder).withdraw([])).to.be.revertedWith(expectedRevertMessage);
			});
		});

		describe('Rewards', async () => {

			before(async () => {
				await mockLandWorksNft.generateTestAssets(10, nftHolder.address);
				await mockLandWorksNft.generateTestAssets(10, anotherNftHolder.address);
				await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
				await mockLandWorksNft.connect(anotherNftHolder).setApprovalForAll(staking.address, true);
			});

			it('Should not emit and send if no rewards have been accrued', async () => {
				await expect(staking.connect(nftHolder).getReward())
					.to.not.emit(mockENTR, "Transfer")
					.to.not.emit(staking, "RewardPaid");
			});

			it('Should accrue correct amount for one holder per second', async () => {
				await staking.connect(nftHolder).stake([1]);
				const earnedBefore = await staking.earned(nftHolder.address);
				await ethers.provider.send("evm_mine", []);

				const earnedAfter = await staking.earned(nftHolder.address);
				expect(earnedBefore + REWARD_RATE).to.equal(earnedAfter);

				// Accrues 100 more as reward
				await staking.connect(nftHolder).getReward();
				expect(await mockENTR.balanceOf(nftHolder.address)).to.equal(REWARD_RATE.mul(2));
				expect(await mockENTR.balanceOf(staking.address)).to.equal(REWARD.sub(REWARD_RATE.mul(2)));
			})

			it('Should accrue correct amount for balance > 1 per second', async () => {
				await staking.connect(nftHolder).stake([1, 2, 3, 4, 5, 6, 7, 8, 9]);
				const earnedBefore = await staking.earned(nftHolder.address);
				await ethers.provider.send("evm_mine", []);

				const earnedAfter = await staking.earned(nftHolder.address);
				expect(earnedBefore + REWARD_RATE).to.equal(earnedAfter);

				await staking.connect(nftHolder).getReward();
				expect(await mockENTR.balanceOf(nftHolder.address)).to.equal(REWARD_RATE.mul(2));
				expect(await mockENTR.balanceOf(staking.address)).to.equal(REWARD.sub(REWARD_RATE.mul(2)));
			})

			it('Should accrue correct amount for multiple users per second', async () => {
				await staking.connect(nftHolder).stake([1]);
				const holder1EarnedT0 = await staking.earned(nftHolder.address);

				// 1 second elapses; nftHolder=100; anotherNftHolder=0
				await staking.connect(anotherNftHolder).stake([11]);
				const holder1EarnedT1 = await staking.earned(nftHolder.address);
				const holder2EarnedT0 = await staking.earned(anotherNftHolder.address);

				// 2 seconds elapse; nftHolder=150; anotherNftHolder=50
				await ethers.provider.send("evm_mine", []);
				const holder1EarnedT2 = await staking.earned(nftHolder.address);
				const holder2EarnedT1 = await staking.earned(anotherNftHolder.address);

				// 3 seconds elapse; nftHolder=0; anotherNftHolder=100
				await staking.connect(nftHolder).getReward();
				const holder1EarnedT3 = await staking.earned(nftHolder.address);
				const holder2EarnedT2 = await staking.earned(anotherNftHolder.address);

				// 4 seconds elapse; nftHolder=50; anotherNftHolder=150
				await staking.connect(anotherNftHolder).getReward();
				const holder2EarnedT3 = await staking.earned(anotherNftHolder.address);

				// nftHolder balances
				expect(holder1EarnedT0).to.equal(0);
				expect(holder1EarnedT1).to.equal(REWARD_RATE);
				expect(holder1EarnedT2).to.equal(REWARD_RATE.mul(3).div(2));
				expect(holder1EarnedT3).to.equal(0);
				expect(await mockENTR.balanceOf(nftHolder.address)).to.equal(REWARD_RATE.mul(2));

				// anotherNftHolder balances
				expect(holder2EarnedT0).to.equal(0);
				expect(holder2EarnedT1).to.equal(REWARD_RATE.div(2));
				expect(holder2EarnedT2).to.equal(REWARD_RATE);
				expect(holder2EarnedT3).to.equal(0);
				expect(await mockENTR.balanceOf(anotherNftHolder.address)).to.equal(REWARD_RATE.mul(3).div(2));

				// Staking contract balance
				expect(await mockENTR.balanceOf(staking.address)).to.equal(REWARD.sub(REWARD_RATE.mul(7).div(2)));
			})

			it('Should accrue correct amount for multiple users proportionally to their balance per second', async () => {
				// Balance for nftHolder is 1
				await staking.connect(nftHolder).stake([1]);
				const holder1EarnedT0 = await staking.earned(nftHolder.address);

				// Balance for anotherNftHolder is 4
				// 1 second elapses
				await staking.connect(anotherNftHolder).stake([11, 13, 15, 17]);
				const holder1EarnedT1 = await staking.earned(nftHolder.address);
				const holder2EarnedT0 = await staking.earned(anotherNftHolder.address);

				// 2 second elapse
				await ethers.provider.send("evm_mine", []);

				const holder1EarnedT2 = await staking.earned(nftHolder.address);
				const holder2EarnedT1 = await staking.earned(anotherNftHolder.address);

				// nftHolder accrues 20% of REWARDS_RATE/sec
				// anotherNftHolder accrues 80% of REWARDS_RATE/sec
				await staking.connect(nftHolder).getReward();
				const holder1EarnedT3 = await staking.earned(nftHolder.address);
				const holder2EarnedT2 = await staking.earned(anotherNftHolder.address);

				await staking.connect(anotherNftHolder).getReward();
				const holder1EarnedT4 = await staking.earned(nftHolder.address);
				const holder2EarnedT3 = await staking.earned(anotherNftHolder.address);

				expect(holder1EarnedT0).to.equal(0);
				expect(holder1EarnedT1).to.equal(REWARD_RATE);
				expect(holder1EarnedT2).to.equal(REWARD_RATE.add(REWARD_RATE.div(5)));
				expect(holder1EarnedT3).to.equal(0);
				expect(holder1EarnedT4).to.equal(REWARD_RATE .div(5));
				expect(await mockENTR.balanceOf(nftHolder.address)).to.equal(REWARD_RATE.mul(7).div(5));

				expect(holder2EarnedT0).to.equal(0);
				expect(holder2EarnedT1).to.equal(REWARD_RATE.mul(4).div(5));
				expect(holder2EarnedT2).to.equal(REWARD_RATE.mul(8).div(5));
				expect(holder2EarnedT3).to.equal(0);
				expect(await mockENTR.balanceOf(anotherNftHolder.address)).to.equal(REWARD_RATE.mul(12).div(5));

				// Staking contract balance
				expect(await mockENTR.balanceOf(staking.address)).to.equal(REWARD.sub(REWARD_RATE.mul(19).div(5)));
			})

			it('Should emit correct events on Claim', async () => {
				await staking.connect(nftHolder).stake([1]);

				await expect(staking.connect(nftHolder).getReward())
					.to.emit(mockENTR, "Transfer").withArgs(staking.address, nftHolder.address, REWARD_RATE)
					.to.emit(staking, "RewardPaid").withArgs(nftHolder.address, REWARD_RATE)
			})
		});

		it('Should be able to exit', async () => {
			await mockLandWorksNft.generateTestAssets(2, nftHolder.address);
			await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
			await staking.connect(nftHolder).stake([1, 2]);

			await staking.connect(nftHolder).exit([1,2]);
			const balanceOfContractAfter = await mockLandWorksNft.balanceOf(staking.address);
			expect(balanceOfContractAfter.toNumber()).to.equal(0);

			const balanceOfStaker = await mockLandWorksNft.balanceOf(nftHolder.address);
			expect(balanceOfStaker.toNumber()).to.equal(2);
			expect(await mockLandWorksNft.ownerOf(1)).to.equal(nftHolder.address);
			expect(await mockLandWorksNft.ownerOf(2)).to.equal(nftHolder.address);
			expect(await staking.totalSupply()).to.equal(0);
			expect(await staking.balances(nftHolder.address)).to.equal(0);
			expect(await staking.stakedAssets(1)).to.equal(ethers.constants.AddressZero);
			expect(await staking.stakedAssets(2)).to.equal(ethers.constants.AddressZero);
			expect(await mockLandWorksNft.consumerOf(1)).to.equal(ethers.constants.AddressZero);
			expect(await mockLandWorksNft.consumerOf(2)).to.equal(ethers.constants.AddressZero);

			expect(await mockENTR.balanceOf(staking.address)).to.equal(REWARD.sub(REWARD_RATE));
			expect(await mockENTR.balanceOf(nftHolder.address)).to.equal(REWARD_RATE);
		})

		it('Should emit correct events when exit', async () => {
			await mockLandWorksNft.generateTestAssets(2, nftHolder.address);
			await mockLandWorksNft.connect(nftHolder).setApprovalForAll(staking.address, true);
			await staking.connect(nftHolder).stake([1, 2]);

			await expect(staking.connect(nftHolder).exit([1,2]))
				.to.emit(mockLandWorksNft, "Transfer").withArgs(staking.address, nftHolder.address, 1)
				.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, ethers.constants.AddressZero, 1)
				.to.emit(mockLandWorksNft, "Transfer").withArgs(staking.address, nftHolder.address, 2)
				.to.emit(mockLandWorksNft, "ConsumerChanged").withArgs(staking.address, ethers.constants.AddressZero, 2)
				.to.emit(staking, "Withdrawn").withArgs(nftHolder.address, 6, [1, 2])
				.to.emit(mockENTR, "Transfer").withArgs(staking.address, nftHolder.address, REWARD_RATE)
				.to.emit(staking, "RewardPaid").withArgs(nftHolder.address, REWARD_RATE)
		})
	})
});
