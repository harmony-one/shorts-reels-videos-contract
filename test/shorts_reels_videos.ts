import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import type { MockVanityURL, ShortsReelsVideos } from "../typechain-types"

let dotName = "https://all.1.country/";
let aliasName = "videos/"

const getTimestamp = async (): Promise<BigNumber> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return BigNumber.from(block.timestamp);
};

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

    // Set the owner revDis percent
    await shortsReelsVideos.updateOwnerRevDisPercent(6000); // 60%
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

  describe("payForVanityURLAccess", () => {
    it("Should be able to store the payment status", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      const paymentStatusBefore = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
      expect(paymentStatusBefore).to.be.false;

      // store the payment status
      await shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price });
      
      const paymentStatusAfter = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
      expect(paymentStatusAfter).to.be.true;
    });

    it("Should revert if the payment was already stored", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      // store the payment status
      await shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price });

      await expect(shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price })).to.be.revertedWith("already paid");
    });

    it("Should revert if the vanity URL is invalid", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.add(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price })).to.be.revertedWith("invalid URL");
    });

    it("Should revert if the payment amount is wrong", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price.sub(1) })).to.be.revertedWith("wrong payment amount");
    });
  });

  // describe("payForVanityURLAccess", () => {
  //   it("Should be able to store the payment status", async () => {
  //     const paymentStatusBefore = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
  //     expect(paymentStatusBefore).to.be.false;

  //     // store the payment status
  //     await shortsReelsVideos.connect(maintainer).payForVanityURLAccess(alice.address, dotName, aliasName);

  //     const paymentStatusAfter = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
  //     expect(paymentStatusAfter).to.be.true;
  //   });

  //   it("Should revert if the payment already stored", async () => {
  //     const aliasName = "aliasName";
  //     const paidAt = await getTimestamp();
  //     await shortsReelsVideos.connect(maintainer).payForVanityURLAccess(alice.address, dotName, aliasName, paidAt);

  //     await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccess(alice.address, dotName, aliasName, paidAt + 1)).to.be.revertedWith("VanityURL: already paid");
  //   })

  //   it("Should revert if the caller is not the maintainer", async () => {
  //     const aliasName = "aliasName";
  //     const paidAt = await getTimestamp();

  //     await expect(shortsReelsVideos.connect(alice).payForVanityURLAccess(alice.address, dotName, aliasName, paidAt)).to.be.revertedWith("VanityURL: only maintainer");
  //   });

  //   it("Should revert if the payment timestamp is invalid", async () => {
  //     const aliasName = "aliasName";
  //     const paidAt = await getTimestamp();

  //     await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccess(alice.address, dotName, aliasName, paidAt + 1)).to.be.revertedWith("VanityURL: invalid time");
  //   });
  // });
});
