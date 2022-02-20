/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

const fs = require('fs');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const WalletProvider = require('truffle-wallet-provider');
const Wallet = require('ethereumjs-wallet').default;
const prompt = require('prompt-sync')();

const networkConfig = {
  // Useful for testing. The `development` name is special - truffle uses it by default
  // if it's defined here and no other network is specified at the command line.
  // You should run a client (like ganache-cli, geth or parity) in a separate terminal
  // tab if you use this network and you must also set the `host`, `port` and `network_id`
  // options below to some value.
  development: {
   host: "127.0.0.1",     // Localhost (default: none)
   port: 8545,            // Standard Ethereum port (default: none)
   network_id: "*",       // Any network (default: none)
  },
  rinkeby: {
    provider: null,
    network_id: 4,       // Rinkeby's id
    gas: 5000000,
    gasPrice: '10000000000',
    confirmations: 2,    // # of confs to wait between deployments. (default: 0)
    timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
  },
  mainnet: {
    provider: null,
    network_id: 1,       // Mainnet's id
    gas: 4600000,
    gasPrice: '50000000000',
    confirmations: 6,    // # of confs to wait between deployments. (default: 0)
    timeoutBlocks: 200,  // # of blocks before a deployment times out  (minimum/default: 50)
  },
  'harmony-testnet': {
    provider: null,
    network_id: 1666700000,       // Harmony testnet's id
  }
};

const network = process.argv[process.argv.indexOf('--network') + 1];
let mnemonic;
let privateKey;
let infuraProjectId;
switch(network) {
  case 'development':
    break;
  case 'rinkeby':
    privateKey = Buffer.from(prompt.hide(`${network} private key: `), 'hex');
    infuraProjectId = prompt('infura project id: ');
    networkConfig[network].provider = () => new WalletProvider(
        new Wallet(privateKey), `https://${network}.infura.io/v3/${infuraProjectId}`);
    break;
  case 'mainnet':
    mnemonic = fs.readFileSync('.mainnet.secret').toString().trim();
    infuraProjectId = prompt('infura project id: ');
    networkConfig[network].provider = () => new HDWalletProvider(
        mnemonic, `https://${network}.infura.io/v3/${infuraProjectId}`)
    break;
  case 'harmony-testnet':
    mnemonic = fs.readFileSync('.harmony-testnet.secret').toString().trim();
    networkConfig[network].provider = () => new HDWalletProvider({
      mnemonic,
      providerOrUrl: 'https://api.s0.b.hmny.io',
    });
    break;
  default:
    console.log(`Invalid network: ${network}`);
    process.exit(1);
}

module.exports = {
  networks: networkConfig,
  compilers: {
    solc: {
      version: "0.8.11",
      optimizer: {
        enabled: true,
        runs: 200
      },
    }
  },
};
