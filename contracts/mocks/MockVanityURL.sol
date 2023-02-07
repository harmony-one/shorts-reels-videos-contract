// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract MockVanityURL {
    /// @dev D1DCV2 TokenId -> Timestamp the name owner was updated
    mapping(bytes32 => uint256) public nameOwnerUpdateAt;

    /// @dev D1DCV2 TokenId -> Alias Name -> Content Price
    mapping(bytes32 => mapping(string => uint256)) public vanityURLPrices;

    constructor() {}

    function setNameOwnerUpdateAt(bytes32 _d1dcV2TokenId) external {
        nameOwnerUpdateAt[_d1dcV2TokenId] = block.timestamp;
    }

    function setVanityURLPrice(string calldata _name, string calldata _aliasName, uint256 _price) external {
        bytes32 tokenId = keccak256(bytes(_name));
        vanityURLPrices[tokenId][_aliasName] = _price;
    }
}
