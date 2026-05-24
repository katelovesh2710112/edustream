// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulboundCert is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Course structure to log on-chain details
    struct CertificateDetails {
        uint256 courseId;
        string courseName;
        uint256 issueTimestamp;
    }

    // Maps tokenId => Certificate details
    mapping(uint256 => CertificateDetails) public certificates;
    
    // Maps student => courseId => hasCertificate
    mapping(address => mapping(uint256 => bool)) public hasCertificate;

    // Custom errors
    error TransactBlockedSoulbound();
    error DuplicateCertificate();

    event CertificateMinted(address indexed student, uint256 indexed tokenId, uint256 indexed courseId, string courseName);

    constructor() ERC721("EduStream Soulbound Credentials", "ESTSBT") Ownable(msg.sender) {}

    // Overriding transfer functions to make this token Soulbound (Non-Transferable)
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        revert TransactBlockedSoulbound();
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721, IERC721) {
        revert TransactBlockedSoulbound();
    }

    /**
     * @dev Mint certificate for a student when courseCompleted == true.
     * Callable by owner (or in real scenario, an authorized quiz validator or system router).
     */
    function mintCertificate(
        address _student,
        uint256 _courseId,
        string calldata _courseName,
        string calldata _tokenURI
    ) external onlyOwner returns (uint256) {
        if (hasCertificate[_student][_courseId]) {
            revert DuplicateCertificate();
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(_student, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        certificates[tokenId] = CertificateDetails({
            courseId: _courseId,
            courseName: _courseName,
            issueTimestamp: block.timestamp
        });

        hasCertificate[_student][_courseId] = true;

        emit CertificateMinted(_student, tokenId, _courseId, _courseName);
        return tokenId;
    }

    // Custom view helper to fetch all certificates owned by a user
    function getCertificateDetails(uint256 _tokenId) external view returns (uint256 courseId, string memory courseName, uint256 issueTimestamp) {
        CertificateDetails memory cert = certificates[_tokenId];
        return (cert.courseId, cert.courseName, cert.issueTimestamp);
    }
}
