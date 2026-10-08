const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployments/addresses.json"));
  const [deployer] = await ethers.getSigners();

  console.log("Upgrading Position implementation (existing user proxies UNAFFECTED)...");
  console.log("Old impl via beacon:", addresses.beacon);

  // OZ validates storage layout safety before upgrading — will throw if you broke layout rules
  const PositionV2 = await ethers.getContractFactory("PositionV2");
  const beacon = await upgrades.upgradeBeacon(addresses.beacon, PositionV2);
  await beacon.waitForDeployment();

  // Get and save new impl address
  const newImplAddr = await upgrades.beacon.getImplementationAddress(addresses.beacon);
  console.log("New impl address:", newImplAddr);

  // Update saved addresses
  addresses.positionImpl       = newImplAddr;
  addresses.positionImplV2     = newImplAddr;
  addresses.lastUpgradedAt     = new Date().toISOString();
  fs.writeFileSync("deployments/addresses.json", JSON.stringify(addresses, null, 2));

  // Point factory to new beacon for future deployments
  // SKIP THIS if you want existing AND new users on same impl,
  // INCLUDE THIS if you deployed a NEW beacon (for new-users-only upgrade)
  // const factory = await ethers.getContractAt("PositionFactory", addresses.factoryProxy);
  // await factory.setBeacon(NEW_BEACON_ADDRESS);

  console.log("✅ Position upgraded. Verify on Etherscan:");
  await hre.run("verify", { address: newImplAddr });
}

main().catch((err) => { console.error(err); process.exit(1); });
