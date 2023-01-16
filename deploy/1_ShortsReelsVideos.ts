import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import config from '../config'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre
  const { deploy, get } = deployments

  const { deployer } = await getNamedAccounts()

  const vanityURLAddress = config.vanityURLContractAddress
  const maintainer = config.maintainer

  const ShortsReelsVideos = await deploy("ShortsReelsVideos", {
    from: deployer,
    args: [],
    log: true,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      viaAdminContract: "DefaultProxyAdmin",
      execute: {
        init: {
          methodName: "initialize",
          args: [vanityURLAddress, maintainer],
        },
      },
    },
  });
  console.log('ShortsReelsVideos address:', ShortsReelsVideos.address)
}
export default func
func.tags = ['ShortsReelsVideos']
