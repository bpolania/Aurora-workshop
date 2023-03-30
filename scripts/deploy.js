const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const StakingToken = await hre.ethers.getContractFactory("ERC20Mock"); // Assuming you have an ERC20Mock contract
  const stakingToken = await StakingToken.deploy("Staking Token", "STK");
  await stakingToken.deployed();
  console.log("Staking Token deployed to:", stakingToken.address);

  const RewardToken = await hre.ethers.getContractFactory("ERC20Mock"); // Assuming you have an ERC20Mock contract
  const rewardToken = await RewardToken.deploy("Reward Token", "RWD");
  await rewardToken.deployed();
  console.log("Reward Token deployed to:", rewardToken.address);

  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const rewardRate = hre.ethers.utils.parseEther("1"); // Adjust the reward rate as desired
  const stakingContract = await StakingContract.deploy(stakingToken.address, rewardToken.address, rewardRate);

  await stakingContract.deployed();

  console.log("StakingContract deployed to:", stakingContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
