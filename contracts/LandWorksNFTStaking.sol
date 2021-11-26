// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/ILandWorks.sol";
import "./interfaces/IDecentralandEstateRegistry.sol";
import "./interfaces/IERC721Consumable.sol";

contract LandWorksNFTStaking is ERC721Holder, ReentrancyGuard {
    using SafeMath for uint256;

    IERC20 public rewardsToken;
    IERC721Consumable public stakingToken;

    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _stakedAssets;

    address private decentralandEstateRegistry;
    address private decentralandLandRegistry;

    event Stake(
        address staker,
        uint256 amount,
        uint256[] tokenIds,
        uint256 time
    );

    event StakeWithdraw(
        address staker,
        uint256 amount,
        uint256[] tokenIds,
        uint256 time
    );

    event RewardsClaim(
        address staker, 
        uint256 amount, 
        address stakingToken,
        uint256 time);

    constructor(
        address _stakingToken,
        address _rewardsToken,
        uint256 _rewardRate,
        address _decentralandEstateRegistry,
        address _decentralandLandRegistry
    ) {
        stakingToken = IERC721Consumable(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        rewardRate = _rewardRate;
        decentralandEstateRegistry = _decentralandEstateRegistry;
        decentralandLandRegistry = _decentralandLandRegistry;
    }

    /// @notice Stakes user's LandWorks NFTs
    /// @param tokenIds The tokenIds of the LandWorks NFTs which will be staked
    function stake(uint256[] memory tokenIds) external nonReentrant {
        uint256 amount;
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            // Transfer user's LandWorks NFTs to the staking contract
            stakingToken.transferFrom(msg.sender, address(this), tokenIds[i]);
            // Change the consumer of the LandWorks NFT to be the person who staked it
            stakingToken.changeConsumer(msg.sender, tokenIds[i]);
            // Increment the amount which will be staked
            amount = amount.add(getAmountToBeStaked(tokenIds[i]));
            // Save who is the owner of the token
            _stakedAssets[tokenIds[i]] = msg.sender;
        }
        stake(amount);

        emit Stake(msg.sender, amount, tokenIds, block.timestamp);
    }

    /// @notice Withdraws staked user's LandWorks NFTs
    /// @param tokenIds The tokenIds of the LandWorks NFT which will be withdrawn
    function withdraw(uint256[] memory tokenIds) external nonReentrant {
        uint256 amount;
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            // Check if the user who withdraws is the owner
            require(_stakedAssets[tokenIds[i]] == msg.sender, "Not owner of the token");
            // Transfer LandWorks NFTs back to the owner
            stakingToken.transferFrom(address(this), msg.sender, tokenIds[i]);
            // Increment the amount which will be staked
            amount = amount.add(getAmountToBeStaked(tokenIds[i]));
            // Cleanup _stakedAssets for the current tokenId
            _stakedAssets[tokenIds[i]] = address(0);
        }
        withdraw(amount);

        emit StakeWithdraw(msg.sender, amount, tokenIds, block.timestamp);
    }

    /// @notice Gets the represented amount/weight to be staked, based on the LandWorks NFT
    /// @param tokenId The tokenId of the LandWorks NFT
    function getAmountToBeStaked(uint256 tokenId)
        internal
        view
        returns (uint256)
    {
        // Get the asset struct from Landworks
        ILandWorks.Asset memory landworksAsset = ILandWorks(
            address(stakingToken)
        ).assetAt(tokenId);
        uint256 amountToBeStaked;

        // Check if the metaverseId is Decentraland
        // TODO: Check metaverseId from enumeration
        if (landworksAsset.metaverseId == 1) {
            // If metaverse registry is LAND, amount is 1
            if (landworksAsset.metaverseRegistry == decentralandLandRegistry) {
                amountToBeStaked = 1;
                // If metaverse registry is ESTATE, query the amount by calling getEstateSize
            } else if (
                landworksAsset.metaverseRegistry == decentralandEstateRegistry
            ) {
                IDecentralandEstateRegistry estateRegistry = IDecentralandEstateRegistry(
                    landworksAsset.metaverseRegistry
                );
                amountToBeStaked = estateRegistry.getEstateSize(
                    landworksAsset.metaverseAssetId
                );
            }
        }
        return amountToBeStaked;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return 0;
        }
        return
            rewardPerTokenStored.add(
                (
                    (
                        (block.timestamp.sub(lastUpdateTime))
                            .mul(rewardRate)
                            .mul(1e18)
                    ).div(_totalSupply)
                )
            );
    }

    function earned(address account) public view returns (uint256) {
        return
            (
                (
                    _balances[account].mul(
                        (rewardPerToken().sub(userRewardPerTokenPaid[account]))
                    )
                ).div(1e18)
            ).add(rewards[account]);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    function stake(uint256 _amount) internal updateReward(msg.sender) {
        _totalSupply = _totalSupply.add(_amount);
        _balances[msg.sender] = _balances[msg.sender].add(_amount);
    }

    function withdraw(uint256 _amount) internal updateReward(msg.sender) {
        _totalSupply = _totalSupply.sub(_amount);
        _balances[msg.sender] = _balances[msg.sender].sub(_amount);
    }

    function getReward() external updateReward(msg.sender) nonReentrant {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardsToken.transfer(msg.sender, reward);

        emit RewardsClaim(msg.sender, reward, address(stakingToken), block.timestamp);
    }
}
