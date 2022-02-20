// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AINFT is ERC721, ERC721Enumerable, Pausable, Ownable, ERC721Burnable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using ERC165Checker for address;

    Counters.Counter private _tokenIdCounter;
    string baseURI = "https://your/metadata/api/";

    /**
     * @dev Emitted when `tokenId` token is minted with the `sourceNftAddress` contract's `sourceNftTokenId`.
     */
    event Mint(address indexed sourceNftAddress, uint256 indexed sourceNftTokenId, uint256 indexed tokenId);

    constructor() ERC721("AI NFT", "AINFT") {}

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    // The following functions are required by OpenSea.
    function baseTokenURI() public view returns (string memory) {
        return _baseURI();
    }

    function setBaseURI(string calldata newURI) external onlyOwner {
        require(bytes(newURI).length > 0, "Cannot set as an empty string");
        baseURI = newURI;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address sourceNftAddress, uint256 sourceNftTokenId) public nonReentrant {
        bool isTokenOwner;
        if (sourceNftAddress.supportsInterface(0x80ac58cd)) {
            // ERC721
            isTokenOwner = IERC721(sourceNftAddress).ownerOf(sourceNftTokenId) == msg.sender;
        } else if (sourceNftAddress.supportsInterface(0xd9b67a26)) {
            // ERC1155
            isTokenOwner = IERC1155(sourceNftAddress).balanceOf(msg.sender, sourceNftTokenId) > 0;
        } else {
            revert("Invalid source contract");
        }
        // Check that the msg.sender is the owner of the source nft (could be 721 or 1155)
        require(isTokenOwner == true, "Sender is not the owner of the token");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        emit Mint(sourceNftAddress, sourceNftTokenId, tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}