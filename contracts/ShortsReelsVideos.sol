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

    /// @dev D1DCV2 Token Id -> Alias Name -> User -> Timestamp the user paid for the vanity url
    /// @dev Vanity URL is valid only if nameOwnerUpdateAt <= vanityURLPaidAt
    mapping(bytes32 => mapping(string => mapping(address => uint256))) public vanityURLPaidAt;

    /// @dev Maintainer address
    address public maintainer;

    event UserPaidForVanityURL(
        address indexed user,
        address owner,
        string indexed name,
        string indexed aliasName,
        uint256 price,
        uint256 paidAt
    );

    event DonationSent (
        address indexed sender,
        address owner,
        string indexed name,
        string indexed aliasName,
        uint256 amount,
        uint256 paidAt
    );
    
    event VanityURLAddressChanged(address indexed from, address indexed to);
    event MaintainerChanged(address indexed from, address indexed to);

    modifier onlyMaintainer() {
        require(msg.sender == maintainer, "only maintainer");
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

    function payForVanityURLAccess(string calldata _name, string calldata _aliasName) external payable {
        _payForVanityURLAccess(msg.sender, _name, _aliasName, msg.value, block.timestamp);
    }

    function payForVanityURLAccessFor(address _user, string calldata _name, string calldata _aliasName, uint256 _paidAt) external payable onlyMaintainer {
        // check the payment timestamp
        require(_paidAt <= block.timestamp, "VanityURL: invalid time");

        _payForVanityURLAccess(_user, _name, _aliasName, msg.value, _paidAt);
    }

    function _payForVanityURLAccess(address _user, string calldata _name, string calldata _aliasName, uint256 _paymentAmount, uint256 _paidAt) internal {
        bytes32 tokenId = keccak256(bytes(_name));
        require(
            !checkVanityURLAccess(_user, _name, _aliasName),
            "already paid"
        );
        require(vanityURLAddress.checkURLValidity(_name, _aliasName), "invalid URL");

        // check the payment
        require(vanityURLAddress.vanityURLPrices(tokenId, _aliasName) == _paymentAmount, "wrong payment amount");

        // store the payment timestamp for the vanity URL access
        vanityURLPaidAt[tokenId][_aliasName][_user] = _paidAt;

        address owner = vanityURLAddress.getNameOwner(_name);
        uint256 priceForOwner = _paymentAmount * 90 / 100;
        (bool success, ) = owner.call{value: priceForOwner}("");
        require(success, "error sending ether");

        emit UserPaidForVanityURL(msg.sender, owner, _name, _aliasName, priceForOwner, _paidAt);
    }

    function checkVanityURLAccess(address _user, string memory _name, string memory _aliasName) public view returns (bool) {
        bytes32 tokenId = keccak256(bytes(_name));

        return vanityURLAddress.nameOwnerUpdateAt(tokenId) <
                vanityURLPaidAt[tokenId][_aliasName][_user]
                ? true
                : false;
    }

    function sendDonation(string memory _name, string memory _aliasName) external payable {
        return _sendDonationFrom(msg.sender, _name, _aliasName, msg.value);
    }

    function forceSendDonation(address from, string memory _name, string memory _aliasName) external payable onlyMaintainer {
        return _sendDonationFrom(from, _name, _aliasName, msg.value);
    }

    function _sendDonationFrom(address _from, string memory _name, string memory _aliasName, uint256 _paymentAmount) internal {
        require(vanityURLAddress.checkURLValidity(_name, _aliasName), "invalid URL");

        address owner = vanityURLAddress.getNameOwner(_name);
        uint256 priceForOwner = _paymentAmount * 90 / 100;
        (bool success, ) = owner.call{value: priceForOwner}("");
        require(success, "error sending ether");

        emit DonationSent(_from, owner, _name, _aliasName, _paymentAmount, block.timestamp);
    }
}