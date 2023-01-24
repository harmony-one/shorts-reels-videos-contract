# Harmony Shorts Reels Videos Smart Contract

### Developer instructions

#### Install dependencies
`yarn install`

#### Create .env file and make sure it's having following information:
```
MNEMONIC=YOUR_MAINNET_MNEMONIC
LOCAL_MNEMONIC=YOUR_LOCALNETWORK_MNEMONIC
TEST_MNEMONIC=YOUR_TESTNET_MNEMONIC
TESTNET_URL=TESTNET_RPC_URL
MAINNET_URL=MAINNET_RPC_URL
S1_URL=MAINNET_SHARD1_RPC_URL
VANITY_URL_CONTRACT_ADDRESS=VANITY_URL_CONTRACT_ADDRESS
MAINTAINER=BACKEND_ADDRESS
```

#### Compile code
- `npx hardhat clean` (Clears the cache and deletes all artifacts)
- `npx hardhat compile` (Compiles the entire project, building all artifacts)

#### Deploy code 
- `npx hardhat node` (Starts a JSON-RPC server on top of Hardhat Network)
- `yarn deploy --deploy-scripts ./deploy --network {network_name}`

#### Flatten contracts
- `npx hardhat flatten` (Flattens and prints contracts and their dependencies)

#### Deployed addresses and bytecodes
All deployed addresses and bytecodes can be found inside `deployments/contract-addresses.json` and `deployments/contract-abis.json` files.
