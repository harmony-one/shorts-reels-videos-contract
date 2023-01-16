import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Contract } from '@ethersproject/contracts'
import config from '../config'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre
  const { deploy, get } = deployments

  const { deployer } = await getNamedAccounts()

  const maintainer = config.maintainer

  // get ShortsReelsVideos contract
  const shortsReelsVideosContract: Contract = await ethers.getContract('ShortsReelsVideos')

  // update the maintianer address
  await shortsReelsVideosContract.updateMaintainer(maintainer)

  console.log('Maintainer set done')
}
export default func
func.tags = ['Settings']
