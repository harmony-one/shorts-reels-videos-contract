// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

interface IVanityURL {
    function setNameOwnerUpdateAt(bytes32 d1dcV2TokenId) external;

    function nameOwnerUpdateAt(bytes32 d1dcV2TokenId) external view returns (uint256);
    
    function nameOf(address addr) external view returns (string memory);
}
