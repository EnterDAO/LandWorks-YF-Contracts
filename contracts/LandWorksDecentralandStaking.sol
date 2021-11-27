// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/ILandWorks.sol";
import "./interfaces/IDecentralandEstateRegistry.sol";
import "./interfaces/IERC721Consumable.sol";

contract LandWorksDecentralandStaking is ERC721Holder, ReentrancyGuard {
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

    // MetaverseId as per LandWorks protocol
    uint256 public metaverseId;
    address public decentralandLandRegistry;
    address public decentralandEstateRegistry;

    event Stake(
        address staker,
        uint256 amount,
        uint256[] tokenIds
    );

    event StakeWithdraw(
        address staker,
        uint256 amount,
        uint256[] tokenIds
    );

    event RewardsClaim(
        address staker,
        uint256 amount,
        address stakingToken
    );

    constructor(
        address _stakingToken,
        address _rewardsToken,
        uint256 _rewardRate,
        uint256 _metaverseId,
        address _decentralandLandRegistry,
        address _decentralandEstateRegistry
    ) {
        stakingToken = IERC721Consumable(_stakingToken);
        rewardsToken = IERC20(_rewardsToken);
        rewardRate = _rewardRate;

        metaverseId = _metaverseId;
        decentralandLandRegistry = _decentralandLandRegistry;
        decentralandEstateRegistry = _decentralandEstateRegistry;
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
            amount += getAmountToBeStaked(tokenIds[i]);
            // Save who is the owner of the token
            _stakedAssets[tokenIds[i]] = msg.sender;
        }
        stake(amount);

        emit Stake(msg.sender, amount, tokenIds);
    }

    /// @notice Withdraws staked user's LandWorks NFTs
    /// @param tokenIds The tokenIds of the LandWorks NFT which will be withdrawn
    function withdraw(uint256[] memory tokenIds) external nonReentrant {
        uint256 amount;
        for (uint256 i = 0; i < tokenIds.length; i += 1) {
            // Check if the user who withdraws is the owner
            require(
                _stakedAssets[tokenIds[i]] == msg.sender,
                "Staking: Not owner of the token"
            );
            // Transfer LandWorks NFTs back to the owner
            stakingToken.transferFrom(address(this), msg.sender, tokenIds[i]);
            // Increment the amount which will be withdrawn
            amount += getAmountToBeStaked(tokenIds[i]);
            // Cleanup _stakedAssets for the current tokenId
            _stakedAssets[tokenIds[i]] = address(0);
        }
        withdraw(amount);

        emit StakeWithdraw(msg.sender, amount, tokenIds);
    }

    /// @notice Gets the represented amount to be staked, based on the LandWorks NFT
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
        require(landworksAsset.metaverseId == metaverseId, "Staking: Invalid metaverseId");
        require(landworksAsset.metaverseRegistry == decentralandLandRegistry
            || landworksAsset.metaverseRegistry == decentralandEstateRegistry,
            "Staking: Invalid metaverseRegistry");

        // If the asset is LAND, amount is 1
        uint256 amountToBeStaked = 1;
        // If the asset is ESTATE, query the number of LAND's that it represents
        if (landworksAsset.metaverseRegistry == decentralandEstateRegistry) {
            IDecentralandEstateRegistry estateRegistry = IDecentralandEstateRegistry(
                landworksAsset.metaverseRegistry
            );
            amountToBeStaked = estateRegistry.getEstateSize(
                landworksAsset.metaverseAssetId
            );
        }
        return amountToBeStaked;
    }

    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return 0;
        }
        return
            rewardPerTokenStored +
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) /
                _totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        return
            ((_balances[account] *
                ((rewardPerToken() - (userRewardPerTokenPaid[account])))) /
                1e18) + rewards[account];
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;

        rewards[account] = earned(account);
        userRewardPerTokenPaid[account] = rewardPerTokenStored;
        _;
    }

    function stake(uint256 _amount) internal updateReward(msg.sender) {
        _totalSupply += _amount;
        _balances[msg.sender] += _amount;
    }

    function withdraw(uint256 _amount) internal updateReward(msg.sender) {
        _totalSupply -= _amount;
        _balances[msg.sender] -= _amount;
    }

    function getReward() external updateReward(msg.sender) nonReentrant {
        uint256 reward = rewards[msg.sender];
        rewards[msg.sender] = 0;
        rewardsToken.transfer(msg.sender, reward);

        emit RewardsClaim(
            msg.sender,
            reward,
            address(stakingToken)
        );
    }
}
