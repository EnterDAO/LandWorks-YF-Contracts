// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IDecentralandEstateRegistry.sol";

contract EstateRegistryMock is IDecentralandEstateRegistry {
    constructor() {}

    function getEstateSize(uint256 estateId) external pure returns (uint256) {
        return 5;
    }
}
