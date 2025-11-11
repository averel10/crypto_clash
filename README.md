URL: https://averel10.github.io/crypto_clash/
=> The live env uses a Reverse-Proxy-Setup to interact with the RPC endpoint: https://rpc.hasrv.averel10.app/, this is needed because we use https in prod so we can't use an http rpc endpoint. This is not an issue in local setup. The proxy is hosted on my NAS and not available over night.


# Local Setup
- Add a .env-File into crypto_clash_contract containing the following data:
API_URL="http://185.48.228.49:8545"
WALLET_PRIVATE_KEY=REDACTED

=> Wallet will be used to deploy contracts

## Deploy Contract (crypto_clash_contract)
- Use npm run compile to compile all solid files
- Use npm run deploy to deploy all contracts

=> Contract information is written to config.json in root (ABI, Adresses)

## Run Frontend locally
- Use npm run dev. It is accessible under localhost:3000/crypto_clash

=> This will copy the config.json file into the public assets (where it can be used by the frontend)
=> The whole site is hosted on a subpath /crypto_clash. Use paths accordingly

# GH Actions
=> All actions run on main push
=> On Contract-Changes, the contracts are rebuilt and redeployed and the new config.json is commited
=> This triggers also a frontend build to deploy a new Version to GH Pages
