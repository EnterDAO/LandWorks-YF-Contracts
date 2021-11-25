// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC721Consumable is IERC721 {
    event ConsumerChanged(address indexed owner, address indexed consumer, uint256 indexed tokenId);

    function consumerOf(uint256 _tokenId) view external returns (address);

    function changeConsumer(address _consumer, uint256 _tokenId) external;
}