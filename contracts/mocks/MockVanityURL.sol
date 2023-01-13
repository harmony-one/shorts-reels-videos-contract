// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract MockVanityURL {
    /// @dev D1DCV2 TokenId -> Timestamp the name owner was updated
    mapping(bytes32 => uint256) public nameOwnerUpdateAt;

    constructor() {}

    function setNameOwnerUpdateAt(bytes32 _d1dcV2TokenId) external {
        nameOwnerUpdateAt[_d1dcV2TokenId] = block.timestamp;
    }
}
