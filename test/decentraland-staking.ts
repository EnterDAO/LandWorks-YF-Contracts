import {ethers, waffle} from "hardhat";
import {expect} from 'chai';

const {loadFixture} = waffle;

describe("LandWorks NFT Staking Tests", () => {

	const CURRENT_TIME = Math.round(new Date().getTime() / 1000);

	async function deployContract() {

		const EstateRegistryMock = await ethers.getContractFactory("EstateRegistryMock");
		const estateRegistryMock = await EstateRegistryMock.deploy();

		const LandRegistryMock = await ethers.getContractFactory("LandRegistryMock");
		const landRegistryMock = await LandRegistryMock.deploy();

		const MockENTR = await ethers.getContractFactory("MockENTR");
		const mockENTR = await MockENTR.deploy();

		const MockLandWorksNFT = await ethers.getContractFactory("MockLandWorksNFT");
		const mockLandWorksNFT = await MockLandWorksNFT.deploy();

		const LandWorksDecentralandStaking = await ethers.getContractFactory("LandWorksDecentralandStaking");
		const landWorksDecentralandStaking = await LandWorksDecentralandStaking.deploy(
			mockLandWorksNFT.address,
			mockENTR.address,
			100,
			estateRegistryMock.address,
			landRegistryMock.address,
			1
		);

		return {estateRegistryMock, landRegistryMock, mockENTR, mockLandWorksNFT, landWorksDecentralandStaking};
	}

	it("Should initialize properly with correct configuration", async () => {
		const {landWorksDecentralandStaking, mockLandWorksNFT, mockENTR} = await loadFixture(deployContract);

		expect(await landWorksDecentralandStaking.stakingToken()).to.equal(mockLandWorksNFT.address);
		expect(await landWorksDecentralandStaking.rewardsToken()).to.equal(mockENTR.address);
		expect(await landWorksDecentralandStaking.rewardRate()).to.equal(100);

	});

	it("Should stake a LandWorks NFTs successfully", async () => {
		const {
			landWorksDecentralandStaking,
			mockLandWorksNFT,
			estateRegistryMock,
			landRegistryMock
		} = await loadFixture(deployContract);

		const accounts = await ethers.getSigners();

		await mockLandWorksNFT.generateTestAssets(10, accounts[1].address, landRegistryMock.address, estateRegistryMock.address);

		await mockLandWorksNFT.connect(accounts[1]).setApprovalForAll(landWorksDecentralandStaking.address, true);

		await landWorksDecentralandStaking.connect(accounts[1]).stake([1, 2, 3, 4, 5]);

		const balanceOfContract = await mockLandWorksNFT.balanceOf(landWorksDecentralandStaking.address);

		expect(balanceOfContract.toNumber()).to.equal(5);

	});

	it("Should withdraw staked LandWorks NFTs successfully", async () => {
		const {
			landWorksDecentralandStaking,
			mockLandWorksNFT,
			estateRegistryMock,
			landRegistryMock
		} = await loadFixture(deployContract);
		const accounts = await ethers.getSigners();

		await mockLandWorksNFT.generateTestAssets(10, accounts[1].address, landRegistryMock.address, estateRegistryMock.address);

		await mockLandWorksNFT.connect(accounts[1]).setApprovalForAll(landWorksDecentralandStaking.address, true);

		await landWorksDecentralandStaking.connect(accounts[1]).stake([1, 2, 3, 4, 5]);

		const balanceOfContractBefore = await mockLandWorksNFT.balanceOf(landWorksDecentralandStaking.address);

		expect(balanceOfContractBefore.toNumber()).to.equal(5);

		await landWorksDecentralandStaking.connect(accounts[1]).withdraw([1, 2, 3, 4, 5]);

		const balanceOfContractAfter = await mockLandWorksNFT.balanceOf(landWorksDecentralandStaking.address);

		expect(balanceOfContractAfter.toNumber()).to.equal(0);

		const balanceOfStaker = await mockLandWorksNFT.balanceOf(accounts[1].address);

		expect(balanceOfStaker.toNumber()).to.equal(10);

	});

	it("Should not be able to withdraw LandWorks NFTs staked by other person", async () => {
		const {
			landWorksDecentralandStaking,
			mockLandWorksNFT,
			estateRegistryMock,
			landRegistryMock
		} = await loadFixture(deployContract);
		const accounts = await ethers.getSigners();

		await mockLandWorksNFT.generateTestAssets(10, accounts[1].address, landRegistryMock.address, estateRegistryMock.address);

		await mockLandWorksNFT.connect(accounts[1]).setApprovalForAll(landWorksDecentralandStaking.address, true);

		await landWorksDecentralandStaking.connect(accounts[1]).stake([1, 2, 3, 4, 5]);

		const balanceOfContractBefore = await mockLandWorksNFT.balanceOf(landWorksDecentralandStaking.address);

		expect(balanceOfContractBefore.toNumber()).to.equal(5);

		await expect(landWorksDecentralandStaking.connect(accounts[2]).withdraw([1, 2, 3, 4, 5])).revertedWith("Not owner of the token");

	});

	it("Should generate and withdraw yield for the time staked", async () => {
		const {
			landWorksDecentralandStaking,
			mockLandWorksNFT,
			mockENTR,
			estateRegistryMock,
			landRegistryMock
		} = await loadFixture(deployContract);
		const accounts = await ethers.getSigners();

		await mockENTR.mint(landWorksDecentralandStaking.address, "1000000000000000000");

		await mockLandWorksNFT.generateTestAssets(10, accounts[1].address, landRegistryMock.address, estateRegistryMock.address);

		await mockLandWorksNFT.connect(accounts[1]).setApprovalForAll(landWorksDecentralandStaking.address, true);

		await landWorksDecentralandStaking.connect(accounts[1]).stake([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

		await ethers.provider.send("evm_setNextBlockTimestamp", [CURRENT_TIME + 3600]);
		await ethers.provider.send("evm_mine", []);

		const earned = await landWorksDecentralandStaking.earned(accounts[1].address);

		expect(earned.toNumber()).greaterThan(0);

		await landWorksDecentralandStaking.connect(accounts[1]).getReward();

		const stakerBalanceAfterWithdraw = await mockENTR.balanceOf(accounts[1].address);

		expect(stakerBalanceAfterWithdraw.toNumber()).greaterThan(0);

	});

	it("Should change the consumer of the LandWorks NFT to the staker", async () => {
		const {
			landWorksDecentralandStaking,
			mockLandWorksNFT,
			estateRegistryMock,
			landRegistryMock
		} = await loadFixture(deployContract);

		const accounts = await ethers.getSigners();

		await mockLandWorksNFT.generateTestAssets(10, accounts[1].address, landRegistryMock.address, estateRegistryMock.address);

		await mockLandWorksNFT.connect(accounts[1]).setApprovalForAll(landWorksDecentralandStaking.address, true);

		await landWorksDecentralandStaking.connect(accounts[1]).stake([1, 2, 3, 4, 5]);

		const balanceOfContract = await mockLandWorksNFT.balanceOf(landWorksDecentralandStaking.address);

		expect(balanceOfContract.toNumber()).to.equal(5);

		for (let i = 1; i <= 5; i++) {
			const consumer = await mockLandWorksNFT.consumerOf(i);
			expect(consumer).to.equal(accounts[1].address);
		}

	});
});
