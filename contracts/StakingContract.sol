// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingContract is ReentrancyGuard, Ownable {
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    uint256 public rewardRate;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardRateUpdated(uint256 newRewardRate);

    constructor(IERC20 _stakingToken, IERC20 _rewardToken, uint256 _rewardRate) {
        stakingToken = _stakingToken;
        rewardToken = _rewardToken;
        rewardRate = _rewardRate;
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Staking amount should be greater than 0");

        stakingToken.transferFrom(msg.sender, address(this), _amount);
        stakes[msg.sender].amount += _amount;
        stakes[msg.sender].timestamp = block.timestamp;

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        require(userStake.amount >= _amount, "Insufficient staked balance");

        uint256 reward = calculateReward(msg.sender);
        if (reward > 0) {
            rewardToken.transfer(msg.sender, reward);
        }

        stakingToken.transfer(msg.sender, _amount);
        userStake.amount -= _amount;
        userStake.timestamp = block.timestamp;

        emit Unstaked(msg.sender, _amount, reward);
    }

    function calculateReward(address _user) public view returns (uint256) {
        Stake storage userStake = stakes[_user];
        uint256 stakingDuration = block.timestamp - userStake.timestamp;
        return userStake.amount * stakingDuration * rewardRate / 1e18;
    }

    function updateRewardRate(uint256 _newRewardRate) external onlyOwner {
        rewardRate = _newRewardRate;
        emit RewardRateUpdated(_newRewardRate);
    }
}
