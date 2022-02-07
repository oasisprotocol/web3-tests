require('@nomiclabs/hardhat-truffle5');

const ethWallet = require('ethereumjs-wallet');

// Create 1000 accounts
const acc = []
for(let index=0; index < 1000; index++) {
    let addressData = ethWallet.generate();
    acc.push({
      privateKey: addressData.getPrivateKeyString(),
      balance: "1267650600228229401496703205375", //0xfffffffffffffffffffffffff
    })
}

module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: acc
    },
    emerald_local: {
      url: "http://127.0.0.1:8545",
      accounts: { mnemonic: "tray ripple elevator ramp insect butter top mouse old cinnamon panther chief" }
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      accounts: "remote"
    }
  },
  solidity: {
    version: '0.5.13',
    settings: {
      optimizer: {
        enabled: false
      },
      evmVersion: 'istanbul'
    },
  },
  paths: {
    sources: "./contracts/**/*",
    tests: "./test/**/*",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 50000
  }
};
