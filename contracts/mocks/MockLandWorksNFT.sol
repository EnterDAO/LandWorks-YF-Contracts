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

    address landRegistry;
    address estateRegistry;

    constructor(address _landRegistry, address _estateRegistry) ERC721("MockLandWorksNFT", "MOCK-LANDWORKS") {
        landRegistry = _landRegistry;
        estateRegistry = _estateRegistry;
    }

    function mint(address _to, uint256 _tokenId) public {
        _safeMint(_to, _tokenId);
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

    function _beforeTokenTransfer(address _from, address _to, uint256 _tokenId) internal virtual override (ERC721) {
        super._beforeTokenTransfer(_from, _to, _tokenId);

        _consumers[_tokenId] = address(0);
    }

    function generateTestAssets(
        uint256 amount,
        address receiver
    ) external {
        for (uint256 i = 0; i < amount; i++) {
            _total.increment();
            mint(receiver, _total.current());
            _assets[_total.current()].metaverseId = 1;
            if (i % 2 == 0) {
                _assets[_total.current()].metaverseRegistry = landRegistry;
            } else {
                _assets[_total.current()].metaverseRegistry = estateRegistry;
            }
            _assets[_total.current()].metaverseAssetId = i * i;
        }
    }

    function generateWithInvalidMetaverseId(address receiver) external {
        _total.increment();
        mint(receiver, _total.current());
        _assets[_total.current()].metaverseId = 9999;
        _assets[_total.current()].metaverseRegistry = landRegistry;
        _assets[_total.current()].metaverseAssetId = 1;
    }

    function generateWithInvalidRegistry(address receiver) external {
        _total.increment();
        mint(receiver, _total.current());
        _assets[_total.current()].metaverseId = 1;
        _assets[_total.current()].metaverseRegistry = msg.sender;
        _assets[_total.current()].metaverseAssetId = 1;
    }
}
