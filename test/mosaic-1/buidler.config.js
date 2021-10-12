usePlugin('@nomiclabs/buidler-truffle5');

const ethWallet = require('ethereumjs-wallet');

// Create 1000 accounts
const acc = []
for(let index=0; index < 1000; index++) {
    let addressData = ethWallet.generate();
    acc.push({
      privateKey: addressData.getPrivateKeyString(),
      balance: "0xfffffffffffffffffffffffff"
    })
}

module.exports = {
  defaultNetwork: 'buidlerevm',
  networks: {
    buidlerevm: {
      accounts: acc
    },
  },
  solc: {
    version: '0.5.13',
    optimizer: {
      enabled: false
    },
    evmVersion: 'istanbul'
  },
  mocha: {
    timeout: 50000
  }
};
