module.exports = {
  server: {
    port: 8545,
    hostname: "127.0.0.1"
  },
  chain: {
    allowUnlimitedContractSize: true,  // This is the key setting!
    gasLimit: "0x1fffffffffffff",
    networkId: 1337
  },
  miner: {
    blockGasLimit: "0x1fffffffffffff"
  },
  wallet: {
    totalAccounts: 10,
    defaultBalance: 1000
  }
};
