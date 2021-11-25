// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/ILandWorks.sol";

contract MockLandWorksNFT is ILandWorks, ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter internal _total;
    mapping(uint256 => address) private _consumers;
    mapping(uint256 => Asset) private _assets;

    constructor() ERC721("MockLandWorksNFT", "MOCK-LANDWORKS") {}

    function mint(address _to, uint256 _tokenId) public {
        _safeMint(_to, _tokenId);
        _consumers[_tokenId] = _to;
    }

    function consumerOf(uint256 _tokenId) external view returns (address) {
        return _consumers[_tokenId];
    }

    function changeConsumer(address _consumer, uint256 _tokenId) external {
        require(
            ownerOf(_tokenId) == msg.sender,
            "Only token owner can set consumer"
        );
        _consumers[_tokenId] = _consumer;

        emit ConsumerChanged(ownerOf(_tokenId), _consumer, _tokenId);
    }

    function assetAt(uint256 _assetId) external view returns (Asset memory) {
        return _assets[_assetId];
    }

    function generateTestAssets(
        uint256 amount,
        address receiver,
        address metaverseLandRegistry,
        address metaverseEstateRegistry
    ) external {
        for (uint256 i = 0; i < amount; i++) {
            _total.increment();
            mint(receiver, _total.current());
            _assets[_total.current()].metaverseId = 1;
            if (i % 2 == 0) {
                _assets[_total.current()]
                    .metaverseRegistry = metaverseLandRegistry;
            } else {
                _assets[_total.current()]
                    .metaverseRegistry = metaverseEstateRegistry;
            }
            _assets[_total.current()].metaverseAssetId = i * i;
        }
    }
}
