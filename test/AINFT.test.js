const _ = require('lodash');
const BN = require('bn.js');
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bn')(BN))
  .should();

const AINFT = artifacts.require('AINFT');
const DummyERC721 = artifacts.require('DummyERC721');
const DummyERC1155 = artifacts.require('DummyERC1155');

contract('AINFT', (accounts) => {
  const [ owner, user1, user2 ] = accounts;
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  beforeEach(async () => {
    this.ainft = await AINFT.new({ from: owner });
    this.erc721 = await DummyERC721.new({ from: owner }); // another erc721
    this.erc1155 = await DummyERC1155.new({ from: owner });
  });

  describe('Initialization', async () => {
    it('supportsInterface', async () => {
      (await this.ainft.supportsInterface('0x80ac58cd')).should.be.equal(true);
    });

    it('totalSupply', async () => {
      (await this.ainft.totalSupply()).should.be.bignumber.equal(new BN(0));
    });

    it('paused', async () => {
      (await this.ainft.paused()).should.be.equal(false);
    });
  });

  describe('Owners', () => {
    it('ownerOf: non-existent token', async () => {
      await this.ainft.ownerOf(0).should.be.rejected;
    });

    it('ownerOf: existing token', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      (await this.ainft.ownerOf(ainftTokenId)).should.be.equal(user1);
    });
  });

  describe('Balance', () => {
    it('balanceOf: zero address', async () => {
      await this.ainft.balanceOf(ZERO_ADDRESS).should.be.rejected;
    });

    it('balanceOf: non-owner', async () => {
      (await this.ainft.balanceOf(user1)).should.be.bignumber.equal(new BN(0));
    });

    it('balanceOf: owner', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      (await this.ainft.balanceOf(user1)).should.be.bignumber.equal(new BN(1));
    });
  });

  describe('Mint', () => {
    it('Cannot mint with a non-nft contract', async () => {
      await this.ainft.mint(ZERO_ADDRESS, 0, { from: user1 }).should.be.rejected;
    });

    it('Cannot mint with a token that user does not own', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user2 }).should.be.rejected;
    });

    it('Can mint with another AINFT', async () => {
      // Mint a regular ERC721
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      // Mint a source AINFT
      const ainftMintRes1 = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const sourceAinftTokenId = new BN(_.get(ainftMintRes1, 'logs.1.args.tokenId'));
      // Mint a new AINFT with the source AINFT
      const balanceBefore = await this.ainft.balanceOf(user1);
      const ainftMintRes2 = await this.ainft.mint(this.ainft.address, sourceAinftTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes2, 'logs.1.args.tokenId'));
      (ainftMintRes2.logs.length).should.be.equal(2);
      (ainftMintRes2.logs[0].event).should.be.equal('Transfer');
      (ainftMintRes2.logs[0].args).should.deep.equal({
        "0": ZERO_ADDRESS,
        "1": user1,
        "2": ainftTokenId,
        "__length__": 3,
        "from": ZERO_ADDRESS,
        "to": user1,
        "tokenId": ainftTokenId
      });
      (ainftMintRes2.logs[1].event).should.be.equal('Mint');
      (ainftMintRes2.logs[1].args.sourceNftAddress).should.be.equal(this.ainft.address);
      (ainftMintRes2.logs[1].args.sourceNftTokenId).should.be.deep.equal(sourceAinftTokenId);
      (await this.ainft.tokenURI(ainftTokenId)).should.be.equal(`https://your/metadata/api/${ainftTokenId}`);
      (await this.ainft.balanceOf(user1)).should.be.bignumber.equal(balanceBefore.add(new BN(1)));
      (await this.ainft.ownerOf(ainftTokenId)).should.be.equal(user1);
    });

    it('Can mint with an ERC721 token', async () => {
      const balanceBefore = await this.ainft.balanceOf(user1);
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      (ainftMintRes.logs.length).should.be.equal(2);
      (ainftMintRes.logs[0].event).should.be.equal('Transfer');
      (ainftMintRes.logs[0].args).should.deep.equal({
        "0": ZERO_ADDRESS,
        "1": user1,
        "2": ainftTokenId,
        "__length__": 3,
        "from": ZERO_ADDRESS,
        "to": user1,
        "tokenId": ainftTokenId
      });
      (ainftMintRes.logs[1].event).should.be.equal('Mint');
      (ainftMintRes.logs[1].args.sourceNftAddress).should.be.equal(this.erc721.address);
      (ainftMintRes.logs[1].args.sourceNftTokenId).should.be.deep.equal(sourceTokenId);
      (await this.ainft.tokenURI(ainftTokenId)).should.be.equal(`https://your/metadata/api/${ainftTokenId}`);
      (await this.ainft.balanceOf(user1)).should.be.bignumber.equal(balanceBefore.add(new BN(1)));
      (await this.ainft.ownerOf(ainftTokenId)).should.be.equal(user1);
    });

    it('Can mint with an ERC1155 token', async () => {
      const balanceBefore = await this.ainft.balanceOf(user1);
      const sourceTokenMintRes = await this.erc1155.mint(0, { from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.id'));
      const ainftMintRes = await this.ainft.mint(this.erc1155.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      (ainftMintRes.logs.length).should.be.equal(2);
      (ainftMintRes.logs[0].event).should.be.equal('Transfer');
      (ainftMintRes.logs[0].args).should.deep.equal({
        "0": ZERO_ADDRESS,
        "1": user1,
        "2": ainftTokenId,
        "__length__": 3,
        "from": ZERO_ADDRESS,
        "to": user1,
        "tokenId": ainftTokenId
      });
      (ainftMintRes.logs[1].event).should.be.equal('Mint');
      (ainftMintRes.logs[1].args.sourceNftAddress).should.be.equal(this.erc1155.address);
      (ainftMintRes.logs[1].args.sourceNftTokenId).should.be.deep.equal(sourceTokenId);
      (await this.ainft.tokenURI(ainftTokenId)).should.be.equal(`https://your/metadata/api/${ainftTokenId}`);
      (await this.ainft.balanceOf(user1)).should.be.bignumber.equal(balanceBefore.add(new BN(1)));
      (await this.ainft.ownerOf(ainftTokenId)).should.be.equal(user1);
    });
  });

  describe('Burn', () => {
    it('Cannot burn a non-existent token', async () => {
      await this.ainft.burn(100, { from: user1 }).should.be.rejected;
    });

    it('Cannot burn a token that user does not own', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      await this.ainft.burn(ainftTokenId, { from: user2 }).should.be.rejected;
    });

    it('Can burn a token that user owns', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      await this.ainft.burn(ainftTokenId, { from: user1 }).should.be.fulfilled;
    });

    it('Can burn a token if approved by the token owner', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      await this.ainft.approve(user2, ainftTokenId, { from: user1 });
      await this.ainft.burn(ainftTokenId, { from: user2 }).should.be.fulfilled;
    });
  });

  describe('Pause', () => {
    it('Cannot pause if not the owner of the contract', async () => {
      await this.ainft.pause({ from: user1 }).should.be.rejected;
    });

    it('Can pause if the owner of the contract', async () => {
      await this.ainft.pause({ from: owner }).should.be.fulfilled;
      (await this.ainft.paused()).should.be.equal(true);
    });

    it('Can unpause if the owner of the contract', async () => {
      await this.ainft.pause({ from: owner }).should.be.fulfilled;
      (await this.ainft.paused()).should.be.equal(true);
      await this.ainft.unpause({ from: owner }).should.be.fulfilled;
      (await this.ainft.paused()).should.be.equal(false);
    });

    it('Cannot transfer tokens when paused', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      await this.ainft.pause({ from: owner }).should.be.fulfilled;
      await this.ainft.safeTransferFrom(user1, user2, ainftTokenId).should.be.rejected;
    });

    it('Cannot mint tokens when paused', async () => {
      await this.ainft.pause({ from: owner }).should.be.fulfilled;
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 }).should.be.rejected;
    });

    it('Can burn tokens when paused', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      await this.ainft.pause({ from: owner }).should.be.fulfilled;
      await this.ainft.burn(ainftTokenId, { from: user1 }).should.be.rejected;
    });
  });

  describe('Token URI', () => {
    it('Cannot set baseTokenURI if not the owner of the contract', async () => {
      await this.ainft.setBaseURI('https://some/token/uri/', { from: user1 }).should.be.rejected;
    });

    it('Can set an empty string as baseTokenURI', async () => {
      await this.ainft.setBaseURI('', { from: owner }).should.be.rejected;
      await this.ainft.setBaseURI(0, { from: owner }).should.be.rejected;
      await this.ainft.setBaseURI(null, { from: owner }).should.be.rejected;
    });

    it('Can set baseTokenURI if the owner of the contract', async () => {
      const sourceTokenMintRes = await this.erc721.mint({ from: user1 });
      const sourceTokenId = new BN(_.get(sourceTokenMintRes, 'logs.0.args.tokenId'));
      const ainftMintRes = await this.ainft.mint(this.erc721.address, sourceTokenId, { from: user1 });
      const ainftTokenId = new BN(_.get(ainftMintRes, 'logs.1.args.tokenId'));
      (await this.ainft.tokenURI(ainftTokenId)).should.be.equal(`https://your/metadata/api/${ainftTokenId}`);
      await this.ainft.setBaseURI('https://new/token/uri/', { from: owner }).should.be.fulfilled;
      (await this.ainft.tokenURI(ainftTokenId)).should.be.equal(`https://new/token/uri/${ainftTokenId}`);
    });
  });
});

