const AINFT = artifacts.require("AINFT");

module.exports = function (deployer) {
  deployer.deploy(AINFT).then(() => AINFT.deployed());
};
