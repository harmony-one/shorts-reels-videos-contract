// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract MockVanityURL {
    /// @dev D1DCV2 Name owner)
    address public nameOwner;

    /// @dev D1DCV2 TokenId -> Timestamp the name owner was updated
    mapping(bytes32 => uint256) public nameOwnerUpdateAt;

    /// @dev D1DCV2 Token Id -> Alias Name -> Timestamp the URL was updated
    /// @dev Vanity URL is valid only if nameOwnerUpdateAt <= vanityURLUpdatedAt
    mapping(bytes32 => mapping(string => uint256)) public vanityURLUpdatedAt;

    /// @dev D1DCV2 TokenId -> Alias Name -> Content Price
    mapping(bytes32 => mapping(string => uint256)) public vanityURLPrices;

    constructor() {}

    function setNameOwner(address _nameOwner) external {
        nameOwner = _nameOwner;
    }
    
    function getNameOwner(string calldata /* _name */) external view returns (address) {
        return nameOwner;
    }

    function setNameOwnerUpdateAt(string calldata _name, uint256 _at) external {
        bytes32 tokenId = keccak256(bytes(_name));
        nameOwnerUpdateAt[tokenId] = _at;
    }

    function setVanityURLUpdateAt(string calldata _name, string calldata _aliasName, uint256 _at) external {
        bytes32 tokenId = keccak256(bytes(_name));
        vanityURLUpdatedAt[tokenId][_aliasName] = _at;
    }

    function setVanityURLPrice(string calldata _name, string calldata _aliasName, uint256 _price) external {
        bytes32 tokenId = keccak256(bytes(_name));
        vanityURLPrices[tokenId][_aliasName] = _price;
    }

    function checkURLValidity(string memory _name, string memory _aliasName)
        external
        view
        returns (bool)
    {
        bytes32 tokenId = keccak256(bytes(_name));
        return
            nameOwnerUpdateAt[tokenId] <
                vanityURLUpdatedAt[tokenId][_aliasName]
                ? true
                : false;
    }
}
