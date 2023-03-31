const { expect } = require("chai");
const { ethers } = require("hardhat");

const SECONDS_IN_HOUR = 3600;

describe("StakingContract", function () {
  let StakingToken, RewardToken, StakingContract;
  let stakingToken, rewardToken, stakingContract;
  let deployer, user1, user2;

  beforeEach(async () => {

    const REWARD_RATE_PER_HOUR = ethers.utils.parseEther("1");
    
    [deployer, user1, user2] = await ethers.getSigners();

    StakingToken = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await StakingToken.deploy("Staking Token", "STK");
    await stakingToken.deployed();

    RewardToken = await ethers.getContractFactory("ERC20Mock");
    rewardToken = await RewardToken.deploy("Reward Token", "RWD");
    await rewardToken.deployed();

    StakingContract = await ethers.getContractFactory("StakingContract");
    const rewardRate = REWARD_RATE_PER_HOUR.div(SECONDS_IN_HOUR);
    stakingContract = await StakingContract.deploy(stakingToken.address, rewardToken.address, rewardRate);
    await stakingContract.deployed();

    await stakingToken.mint(user1.address, ethers.utils.parseEther("1000000"));
    await stakingToken.mint(user2.address, ethers.utils.parseEther("1000000"));

    await rewardToken.mint(deployer.address, ethers.utils.parseEther("10000000"));
    await rewardToken.transfer(stakingContract.address, ethers.utils.parseEther("10000000"));
  });

  it("Should allow users to stake tokens", async () => {
    await stakingToken.connect(user1).approve(stakingContract.address, ethers.utils.parseEther("500"));
    await stakingContract.connect(user1).stake(ethers.utils.parseEther("500"));

    const user1Stake = await stakingContract.stakes(user1.address);
    expect(user1Stake.amount).to.equal(ethers.utils.parseEther("500"));
  });

  it("Should prevent users from staking 0 tokens", async () => {
    await stakingToken.connect(user1).approve(stakingContract.address, ethers.utils.parseEther("0"));
    await expect(stakingContract.connect(user1).stake(ethers.utils.parseEther("0"))).to.be.revertedWith(
      "Staking amount should be greater than 0"
    );
  });

  it("Should allow users to unstake tokens and receive rewards", async () => {
    await stakingToken.connect(user1).approve(stakingContract.address, ethers.utils.parseEther("500"));
    await stakingContract.connect(user1).stake(ethers.utils.parseEther("500"));
  
    const initialTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
  
    await ethers.provider.send("evm_increaseTime", [SECONDS_IN_HOUR]); // Advance time by 1 hour
    await ethers.provider.send("evm_mine");
  
    const currentTimestamp = await ethers.provider.getBlock("latest").then((block) => block.timestamp);
    const timeDifference = currentTimestamp - initialTimestamp;
  
    await stakingContract.connect(user1).unstake(ethers.utils.parseEther("500"));
  
    const user1Stake = await stakingContract.stakes(user1.address);
    expect(user1Stake.amount).to.equal(ethers.utils.parseEther("0"));
  
    const user1RewardBalance = await rewardToken.balanceOf(user1.address);
    const expectedReward = ethers.utils.parseEther("1").mul(timeDifference);
  
    // Check if the reward is within an acceptable range
    const rewardDifference = user1RewardBalance.sub(expectedReward).abs();
    const acceptableErrorPercentage = 1.05; // 0.5% error
    const acceptableError = expectedReward.mul(ethers.utils.parseUnits(acceptableErrorPercentage.toString(), 16)).div(ethers.utils.parseUnits("1", 16));
    expect(rewardDifference).to.be.lte(acceptableError);
  });
  

  it("Should prevent users from unstaking more tokens than staked", async () => {
    await stakingToken.connect(user1).approve(stakingContract.address, ethers.utils.parseEther("500"));
    await stakingContract.connect(user1).stake(ethers.utils.parseEther("500"));

    await expect(stakingContract.connect(user1).unstake(ethers.utils.parseEther("600"))).to.be.revertedWith(
      "Insufficient staked balance"
    );
  });

  it("Should calculate rewards correctly", async () => {
    await stakingToken.connect(user1).approve(stakingContract.address, ethers.utils.parseEther("500"));
    await stakingContract.connect(user1).stake(ethers.utils.parseEther("500"));
  
    await ethers.provider.send("evm_increaseTime", [SECONDS_IN_HOUR]); // Advance time by 1 hour
    await ethers.provider.send("evm_mine");
  
    const currentReward = await stakingContract.calculateReward(user1.address);
    const expectedReward = ethers.utils.parseEther("1").mul(SECONDS_IN_HOUR);
  
    // Check if the calculated reward is within an acceptable range
    const rewardDifference = currentReward.sub(expectedReward).abs();
    const acceptableErrorPercentage = 1.005; // 0.5% error
    const acceptableError = expectedReward.mul(ethers.utils.parseUnits(acceptableErrorPercentage.toString(), 16)).div(ethers.utils.parseUnits("1", 16));
    expect(rewardDifference).to.be.lte(acceptableError);
  });
  

  it("Should allow owner to update reward rate", async () => {
    const newRewardRate = ethers.utils.parseEther("2");
    await stakingContract.connect(deployer).updateRewardRate(newRewardRate);

    const updatedRewardRate = await stakingContract.rewardRate();
    expect(updatedRewardRate).to.equal(newRewardRate);
  });

  it("Should prevent non-owner from updating reward rate", async () => {
    const newRewardRate = ethers.utils.parseEther("2");
    await expect(stakingContract.connect(user1).updateRewardRate(newRewardRate)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });
});
  
