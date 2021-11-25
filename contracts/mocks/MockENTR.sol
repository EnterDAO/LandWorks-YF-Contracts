// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockENTR is ERC20 {
    constructor() ERC20("MockENTR", "MOCK-ENTR") {}

    function mint(address _account, uint256 _amount) public {
        super._mint(_account, _amount);
    }
}