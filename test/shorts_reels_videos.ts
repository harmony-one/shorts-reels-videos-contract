import { expect } from "chai";
import { ethers, upgrades } from 'hardhat'

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import type { MockVanityURL, ShortsReelsVideos } from "../typechain-types"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

let url = "https://all.1.country_url/";
let aliasName = "videos/"

async function getTimestamp(): Promise<any> {
  const blockNumber = await ethers.provider.send('eth_blockNumber', []);
  const block = await ethers.provider.send('eth_getBlockByNumber', [blockNumber, false]);
  return block.timestamp;
}

describe('ShortsReelsVideos', () => {
  let accounts: SignerWithAddress;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let maintainer: SignerWithAddress;

  let mockVanityURL: MockVanityURL;
  let shortsReelsVideos: ShortsReelsVideos;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, maintainer] = accounts;

    // Deploy MockVanityURL
    const MockVanityURL = await ethers.getContractFactory("MockVanityURL");
    mockVanityURL = (await MockVanityURL.deploy()) as MockVanityURL

    // Initialize ShortsReelsVideos contract
    const ShortsReelsVideos = await ethers.getContractFactory("ShortsReelsVideos");
    shortsReelsVideos = (await upgrades.deployProxy(ShortsReelsVideos, [mockVanityURL.address, maintainer.address])) as ShortsReelsVideos;
  });

  describe("updateVanityURLAddress", () => {
    it("Should be able set the VanityURL contract", async () => {
      expect(await shortsReelsVideos.vanityURLAddress()).to.equal(mockVanityURL.address);
      
      await shortsReelsVideos.updateVanityURLAddress(alice.address);

      expect(await shortsReelsVideos.vanityURLAddress()).to.equal(alice.address);
    });

    it("Should revert if the caller is not owner", async () => {
      await expect(shortsReelsVideos.connect(alice).vanityURLAddress(alice.address)).to.be.reverted;
    });
  });

  describe("updateMaintainer", () => {
    it("Should be able set the maintainer address", async () => {
      expect(await shortsReelsVideos.maintainer()).to.equal(maintainer.address);
      
      await shortsReelsVideos.updateMaintainer(alice.address);

      expect(await shortsReelsVideos.maintainer()).to.equal(alice.address);
    });

    it("Should revert if the caller is not owner", async () => {
      await expect(shortsReelsVideos.connect(alice).updateMaintainer(alice.address)).to.be.reverted;
    });
  });

  describe("payForVideoVanityURLAccess", () => {
    it("Should be able to store the payment status", async () => {
      const paidAt = await getTimestamp();

      const paymentStatusBefore = await shortsReelsVideos.checkVideoVanityURLAccess(alice.address, url, aliasName);
      expect(paymentStatusBefore).to.be.false;

      // store the payment status
      await shortsReelsVideos.connect(maintainer).payForVideoVanityURLAccess(alice.address, url, aliasName, paidAt);

      const paymentStatusAfter = await shortsReelsVideos.checkVideoVanityURLAccess(alice.address, url, aliasName);
      expect(paymentStatusAfter).to.be.true;
    });

    it("Should revert if the payment already stored", async () => {
      const aliasName = "aliasName";
      const paidAt = await getTimestamp();
      await shortsReelsVideos.connect(maintainer).payForVideoVanityURLAccess(alice.address, url, aliasName, paidAt);

      await expect(shortsReelsVideos.connect(maintainer).payForVideoVanityURLAccess(alice.address, url, aliasName, paidAt + 1)).to.be.revertedWith("VanityURL: already paid");
    })

    it("Should revert if the caller is not the maintainer", async () => {
      const aliasName = "aliasName";
      const paidAt = await getTimestamp();

      await expect(shortsReelsVideos.connect(alice).payForVideoVanityURLAccess(alice.address, url, aliasName, paidAt)).to.be.revertedWith("VanityURL: only maintainer");
    });

    it("Should revert if the payment timestamp is invalid", async () => {
      const aliasName = "aliasName";
      const paidAt = await getTimestamp();

      await expect(shortsReelsVideos.connect(maintainer).payForVideoVanityURLAccess(alice.address, url, aliasName, paidAt + 1)).to.be.revertedWith("VanityURL: invalid time");
    });
  });
});
