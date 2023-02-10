import * as dotenv from 'dotenv'
const debug = (process.env.DEBUG === '1') || process.env.DEBUG === 'true'
dotenv.config()

export default {
  vanityURLContractAddress: process.env.VANITY_URL_CONTRACT_ADDRESS,
  maintainer: process.env.MAINTAINER,
  ownerRevDisPercent: process.env.OWNER_REVDIS_PERCENT,
}
