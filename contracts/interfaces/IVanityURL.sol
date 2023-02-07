// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IVanityURL {
    function nameOwnerUpdateAt(bytes32 d1dcV2TokenId) external view returns (uint256);
    
    function vanityURLPrices(bytes32 didcV2TokenId, string memory aliasName) external view returns (uint256);

    function getNameOwner(string calldata name) external view returns (address);

    function checkURLValidity(string calldata name, string calldata aliasName) external view returns (bool);
}
