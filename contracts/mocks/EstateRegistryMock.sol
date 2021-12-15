// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IDecentralandEstateRegistry.sol";

contract EstateRegistryMock is IDecentralandEstateRegistry {

    bool public updateSize;

    constructor() {
    }

    function changeSize() public {
        updateSize = true;
    }

    function getEstateSize(uint256 estateId) external view returns (uint256) {
        if (estateId != 0) {
            return !updateSize ? 5 : 6;
        } else {
            return 0;
        }
    }
}
