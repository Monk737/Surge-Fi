const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployments/addresses.json"));

  console.log("Upgrading PositionFactory logic...");
  console.log("Proxy address (unchanged):", addresses.factoryProxy);

  const PositionFactoryV2 = await ethers.getContractFactory("PositionFactoryV2");

  // OZ validates storage layout before upgrade — throws on slot collision
  const factory = await upgrades.upgradeProxy(
    addresses.factoryProxy,     // proxy address stays the same
    PositionFactoryV2,
    { kind: "uups" }
  );
  await factory.waitForDeployment();

  const newImplAddr = await upgrades.erc1967.getImplementationAddress(addresses.factoryProxy);
  console.log("New factory impl:", newImplAddr);

  addresses.factoryImpl        = newImplAddr;
  addresses.factoryLastUpgrade = new Date().toISOString();
  fs.writeFileSync("deployments/addresses.json", JSON.stringify(addresses, null, 2));

  console.log("✅ Factory upgraded. Proxy address unchanged — no frontend changes needed.");
  await hre.run("verify", { address: addresses.factoryProxy });
}

main().catch((err) => { console.error(err); process.exit(1); });
