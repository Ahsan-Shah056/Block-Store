const Marketplace = artifacts.require("Marketplace");

module.exports = function (deployer) {
  // Deploy the Marketplace contract with explicit gas settings
  deployer.deploy(Marketplace, { gas: 6721975 }).then(() => {
    console.log("✅ Marketplace contract deployed successfully!");
    console.log("📍 Contract Address:", Marketplace.address);
  });
};
