import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from "ethers";

import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

import type { MockVanityURL, ShortsReelsVideos } from "../typechain-types"

let dotName = "https://all.1.country/";
let aliasName = "videos/"
let ownerRevDisPercent = 6000;  // 60%

const getTimestamp = async (): Promise<BigNumber> => {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  return BigNumber.from(block.timestamp);
};

describe('ShortsReelsVideos', () => {
  let accounts: SignerWithAddress;
  let deployer: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let maintainer: SignerWithAddress;

  let mockVanityURL: MockVanityURL;
  let shortsReelsVideos: ShortsReelsVideos;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [deployer, alice, bob, maintainer] = accounts;

    // Deploy MockVanityURL
    const MockVanityURL = await ethers.getContractFactory("MockVanityURL");
    mockVanityURL = (await MockVanityURL.deploy()) as MockVanityURL

    // Initialize ShortsReelsVideos contract
    const ShortsReelsVideos = await ethers.getContractFactory("ShortsReelsVideos");
    shortsReelsVideos = (await upgrades.deployProxy(ShortsReelsVideos, [mockVanityURL.address, maintainer.address])) as ShortsReelsVideos;

    // Set the owner revDis percent
    await shortsReelsVideos.updateOwnerRevDisPercent(ownerRevDisPercent);
  });

  describe("updateVanityURLAddress", () => {
    it("Should be able set the VanityURL contract", async () => {
      expect(await shortsReelsVideos.vanityURLAddress()).to.equal(mockVanityURL.address);
      
      await shortsReelsVideos.updateVanityURLAddress(alice.address);

      expect(await shortsReelsVideos.vanityURLAddress()).to.equal(alice.address);
    });

    it("Should revert if the caller is not owner", async () => {
      await expect(shortsReelsVideos.connect(alice).updateVanityURLAddress(alice.address)).to.be.reverted;
    });
  });

  describe("updateOwnerRevDisPercent", () => {
    it("Should be able set the owner revDis percent", async () => {
      expect(await shortsReelsVideos.owneRevDisPercent()).to.equal(ownerRevDisPercent);
      
      const newOwnerRevDisPercent = 5000; // 50%
      await shortsReelsVideos.updateOwnerRevDisPercent(newOwnerRevDisPercent);

      expect(await shortsReelsVideos.owneRevDisPercent()).to.equal(newOwnerRevDisPercent);
    });

    it("Should revert if the caller is not owner", async () => {
      const newOwnerRevDisPercent = 5000; // 50%
      await expect(shortsReelsVideos.connect(alice).updateOwnerRevDisPercent(newOwnerRevDisPercent)).to.be.reverted;
    });

    it("Should revert if the percent is greater than 100%", async () => {
      const newOwnerRevDisPercent = 10001; // 50%
      await expect(shortsReelsVideos.updateOwnerRevDisPercent(newOwnerRevDisPercent)).to.be.revertedWith("exceeded 100%");
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

      const lockedBalanceBefore = await ethers.provider.getBalance(shortsReelsVideos.address);
      const paymentStatusBefore = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
      expect(paymentStatusBefore).to.be.false;

      // store the payment status
      await shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price });
      
      const lockedBalanceAfter = await ethers.provider.getBalance(shortsReelsVideos.address);
      expect(lockedBalanceAfter).gt(lockedBalanceBefore);
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

  describe("payForVanityURLAccessFor", () => {
    it("Should be able to store the payment status", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      const lockedBalanceBefore = await ethers.provider.getBalance(shortsReelsVideos.address);
      const paymentStatusBefore = await shortsReelsVideos.checkVanityURLAccess(alice.address, dotName, aliasName);
      expect(paymentStatusBefore).to.be.false;

      // store the payment status
      await shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price });
      
      const lockedBalanceAfter = await ethers.provider.getBalance(shortsReelsVideos.address);
      expect(lockedBalanceAfter).gt(lockedBalanceBefore);
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
      await shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price });

      await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price })).to.be.revertedWith("already paid");
    });

    it("Should revert if the vanity URL is invalid", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.add(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price })).to.be.revertedWith("invalid URL");
    });

    it("Should revert if the payment amount is wrong", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price.sub(1) })).to.be.revertedWith("wrong payment amount");
    });

    it("Should revert if the payment timestamp is greater than the current timestamp", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(maintainer).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp.add(100), { value: price })).to.be.revertedWith("invalid time");
    });

    it("Should revert if the caller is not the maintainer", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(alice).payForVanityURLAccessFor(alice.address, dotName, aliasName, currentTimestamp, { value: price })).to.be.revertedWith("only maintainer");
    });
  });

  describe("sendDonation", () => {
    it("Should be able to send the donation", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      // donate
      await mockVanityURL.setNameOwner(bob.address);
      const nameOwnerBalanceBefore = await ethers.provider.getBalance(bob.address);

      await shortsReelsVideos.connect(alice).sendDonation(dotName, aliasName, { value: price });

      const nameOwnerBalanceAfter = await ethers.provider.getBalance(bob.address);
      expect(nameOwnerBalanceAfter).gt(nameOwnerBalanceBefore);
    });

    it("Should revert if the vanity URL is invalid", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.add(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(alice).sendDonation(dotName, aliasName, { value: price })).to.be.revertedWith("invalid URL");
    });
  });

  describe("sendDonationFor", () => {
    it("Should be able to send the donation", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      // donate
      await mockVanityURL.setNameOwner(bob.address);
      const nameOwnerBalanceBefore = await ethers.provider.getBalance(bob.address);

      await shortsReelsVideos.connect(maintainer).sendDonationFor(alice.address, dotName, aliasName, { value: price });

      const nameOwnerBalanceAfter = await ethers.provider.getBalance(bob.address);
      expect(nameOwnerBalanceAfter).gt(nameOwnerBalanceBefore);
    });

    it("Should revert if the vanity URL is invalid", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.add(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(maintainer).sendDonationFor(alice.address, dotName, aliasName, { value: price })).to.be.revertedWith("invalid URL");
    });

    it("Should revert if the caller is not the maintainer", async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      await expect(shortsReelsVideos.connect(alice).sendDonationFor(alice.address, dotName, aliasName, { value: price })).to.be.revertedWith("only maintainer");
    });
  });

  describe("withdraw", () => {
    beforeEach(async () => {
      // set the vanity URL price
      const price = ethers.utils.parseEther("1");
      await mockVanityURL.setVanityURLPrice(dotName, aliasName, price);

      // set the url info
      const currentTimestamp = await getTimestamp();
      await mockVanityURL.setNameOwnerUpdateAt(dotName, currentTimestamp.sub(1));
      await mockVanityURL.setVanityURLUpdateAt(dotName, aliasName, currentTimestamp);

      // store the payment status
      await shortsReelsVideos.connect(alice).payForVanityURLAccess(dotName, aliasName, { value: price });
    });

    it("should be able to withdraw ONE tokens", async () => {
      const ownerBalanceBefore = await ethers.provider.getBalance(deployer.address);
      
      // withdraw ONE tokens
      await shortsReelsVideos.withdraw();

      const ownerBalanceAfter = await ethers.provider.getBalance(deployer.address);
      expect(ownerBalanceAfter).gt(ownerBalanceBefore);
    });

    it("Should revert if the caller is not the owner", async () => {
      await expect(shortsReelsVideos.connect(alice).withdraw()).to.be.reverted;
    });
  });
});
