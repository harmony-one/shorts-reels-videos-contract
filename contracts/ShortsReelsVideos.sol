// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IVanityURL.sol";

contract ShortsReelsVideos is
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    /// @dev VanityURL contract address
    IVanityURL public vanityURLAddress;

    /// @dev D1DCV2 Token Id -> Alias Name -> User -> Timestamp the user paid for the video url
    /// @dev Video vanity URL is valid only if nameOwnerUpdateAt <= videoVanityURLPaidAt
    mapping(bytes32 => mapping(string => mapping(address => uint256))) public videoVanityURLPaidAt;

    /// @dev Maintainer address
    address public maintainer;

    event VideoVanityURLPaid(
        address indexed by,
        string indexed name,
        string indexed aliasNAme,
        uint256 paidAt
    );
    event VanityURLAddressChanged(address indexed from, address indexed to);
    event MaintainerChanged(address indexed from, address indexed to);

    modifier onlyMaintainer() {
        require(msg.sender == maintainer, "VanityURL: only maintainer");
        _;
    }

    function initialize(
        address _vanityURLAddress,
        address _maintainer
    ) external initializer {
        __Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();

        vanityURLAddress = IVanityURL(_vanityURLAddress);
        maintainer = _maintainer;
    }

    function updateVanityURLAddress(address _vanityURLAddress) external onlyOwner {
        emit VanityURLAddressChanged(address(vanityURLAddress), _vanityURLAddress);

        vanityURLAddress = IVanityURL(_vanityURLAddress);
    }

    function updateMaintainer(address _maintainer) external onlyOwner {
        emit MaintainerChanged(maintainer, _maintainer);

        maintainer = _maintainer;
    }

    function payForVideoVanityURLAccess(address _user, string memory _name, string memory _aliasName, uint256 _paidAt) external onlyMaintainer {
        bytes32 tokenId = keccak256(bytes(_name));
        require(
            !checkVideoVanityURLAccess(_user, _name, _aliasName),
            "VanityURL: already paid"
        );

        // check the payment timestamp
        require(_paidAt <= block.timestamp, "VanityURL: invalid time");

        // store the payment for the video vanity URL access
        videoVanityURLPaidAt[tokenId][_aliasName][_user] = _paidAt;

        emit VideoVanityURLPaid(msg.sender, _name, _aliasName, _paidAt);
    }

    function checkVideoVanityURLAccess(address _user, string memory _name, string memory _aliasName) public view returns (bool) {
        bytes32 tokenId = keccak256(bytes(_name));
        return
            vanityURLAddress.nameOwnerUpdateAt(tokenId) <
                videoVanityURLPaidAt[tokenId][_aliasName][_user]
                ? true
                : false;
    }

    function withdraw() external {
        require(
            msg.sender == owner(),
            "D1DC: must be owner or revenue account"
        );
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        require(success, "D1DC: failed to withdraw");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
