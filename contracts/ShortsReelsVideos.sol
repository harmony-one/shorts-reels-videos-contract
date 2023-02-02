// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

contract ContentManager is
    OwnableUpgradeable,
    PausableUpgradeable
    // ReentrancyGuardUpgradeable
{
    /// @dev VanityURL contract address
    IVanityURL public vanityURLAddress;

    struct ContentRecord {
        address owner;
        uint256 price;
    }

    /// @dev D1DCV2 Token Id -> Alias Name -> User -> Timestamp the user paid for the video url
    /// @dev Video vanity URL is valid only if nameOwnerUpdateAt <= videoVanityURLPaidAt
    mapping(bytes32 => mapping(string => mapping(address => uint256))) public contentPaidAt;

    mapping(bytes32 => mapping(string => ContentRecord)) public contentRecords;

    /// @dev Maintainer address
    address public maintainer;

    event ContentCreated(
        address indexed owner,
        string indexed name,
        string indexed aliasNAme,
        uint256 price
    );

    event UserPaidForContent(
        address indexed owner,
        string indexed name,
        string indexed aliasNAme,
        uint256 price
    );

    event DonationSent (
        string indexed name,
        string indexed aliasNAme,
        address indexed sender,
        address recipient,
        uint256 amount
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

    function payForContentAccess(address _user, string memory _name, string memory _aliasName, uint256 _paidAt) public payable {
        bytes32 tokenId = keccak256(bytes(_name));
        require(
            !checkContentAccess(_user, _name, _aliasName),
            "VanityURL: already paid"
        );

        // check the payment timestamp
        require(_paidAt <= block.timestamp, "VanityURL: invalid time");

        require(contentRecords[tokenId][_aliasName].owner != address(0x0), "Content not created");

        require(contentRecords[tokenId][_aliasName].price == msg.value, "Wrong payment amount");

        // store the payment for the video vanity URL access
        contentPaidAt[tokenId][_aliasName][_user] = _paidAt;

        payable(contentRecords[tokenId][_aliasName].owner).transfer(msg.value);

        emit UserPaidForContent(msg.sender, _name, _aliasName, _paidAt);
    }

    function checkContentAccess(address _user, string memory _name, string memory _aliasName) public view returns (bool) {
        bytes32 tokenId = keccak256(bytes(_name));

        return vanityURLAddress.nameOwnerUpdateAt(tokenId) <
                contentPaidAt[tokenId][_aliasName][_user]
                ? true
                : false;
    }

    function getContentPrice(string memory _name, string memory _aliasName) public view returns (uint256) {
        bytes32 tokenId = keccak256(bytes(_name));

        return contentRecords[tokenId][_aliasName].price;
    }

    function createContent(string memory _name, string memory _aliasName, uint256 price) public {
        string memory ownerName = vanityURLAddress.nameOf(msg.sender);
        require(compareStrings(ownerName, _name), "Sender not owner of this name");

        return _createContent(msg.sender, _name, _aliasName, price);
    }

    function forceCreateContent(address _owner, string memory _name, string memory _aliasName, uint256 price) public onlyMaintainer {
        return _createContent(_owner, _name, _aliasName, price);
    }

    function _createContent(address _owner, string memory _name, string memory _aliasName, uint256 price) internal {
        bytes32 tokenId = keccak256(bytes(_name));
        
        require(contentRecords[tokenId][_aliasName].owner == address(0x0), "Content alreeady created");        
        
        ContentRecord storage content = contentRecords[tokenId][_aliasName];

        content.owner = _owner;
        content.price = price;

        emit ContentCreated(_owner, _name, _aliasName, price);
    }

    function sendDonation(string memory _name, string memory _aliasName) public payable {
        return _sendDonationFrom(msg.sender, _name, _aliasName);
    }

    function forceSendDonation(address from, string memory _name, string memory _aliasName) public payable onlyMaintainer {
        return _sendDonationFrom(from, _name, _aliasName);
    }

    function _sendDonationFrom(address from, string memory _name, string memory _aliasName) internal {
        bytes32 tokenId = keccak256(bytes(_name));
        
        require(contentRecords[tokenId][_aliasName].owner != address(0x0), "Content not created");        

        address recipient = contentRecords[tokenId][_aliasName].owner;

        payable(recipient).transfer(msg.value);

        emit DonationSent(_name, _aliasName, from, recipient, msg.value);
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}