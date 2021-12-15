// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IDecentralandEstateRegistry.sol";

contract EstateRegistryMock is IDecentralandEstateRegistry {
    constructor() {}

    function getEstateSize(uint256 estateId) external pure returns (uint256) {
        if (estateId != 0) {
            return 5;
        } else {
            return 0;
        }
    }
}
