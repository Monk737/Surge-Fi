const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // ── STEP 1: Deploy Position implementation
  // _disableInitializers() runs in constructor → bare impl permanently locked
  console.log("1/3 Deploying Position implementation...");
  const Position = await ethers.getContractFactory("Position");
  const positionImpl = await Position.deploy();
  await positionImpl.waitForDeployment();
  const positionImplAddr = await positionImpl.getAddress();
  console.log("    Position impl deployed:", positionImplAddr);

  // ── STEP 2: Deploy UpgradeableBeacon pointing to Position impl
  // OZ plugin handles beacon deployment and validates upgrade safety
  console.log("2/3 Deploying UpgradeableBeacon...");
  const beacon = await upgrades.deployBeacon(Position, {
    initialOwner: deployer.address  // platform wallet owns the beacon
  });
  await beacon.waitForDeployment();
  const beaconAddr = await beacon.getAddress();
  console.log("    Beacon deployed:", beaconAddr);

  // ── STEP 3: Deploy PositionFactory as a UUPS Proxy
  // upgrades.deployProxy handles:
  //   - deploying the PositionFactory implementation
  //   - deploying an ERC1967Proxy pointing to it
  //   - calling initialize(beaconAddr, deployer.address) on the proxy
  console.log("3/3 Deploying PositionFactory (UUPS Proxy)...");
  const PositionFactory = await ethers.getContractFactory("PositionFactory");
  const factory = await upgrades.deployProxy(
    PositionFactory,
    [beaconAddr, deployer.address],  // initialize(beacon, initialOwner)
    { kind: "uups", initializer: "initialize" }
  );
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("    PositionFactory proxy deployed:", factoryAddr);

  // ── Save addresses (commit this file to git — required for upgrades)
  const addresses = {
    network:             (await ethers.provider.getNetwork()).name,
    deployedAt:          new Date().toISOString(),
    positionImpl:        positionImplAddr,
    beacon:              beaconAddr,
    factoryProxy:        factoryAddr,
    platformFeeWallet:   "0xC7046Dc1d29E4460b2B5c197598dA524971910F7"
  };
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync("deployments/addresses.json", JSON.stringify(addresses, null, 2));
  console.log("\n✅ All deployed. Addresses saved to deployments/addresses.json\n");
  console.table(addresses);

  // ── STEP 4: Verify on Etherscan
  // OZ verify task handles all 4 contracts: impl + beacon + factory impl + factory proxy
  console.log("Verifying on Etherscan...");
  await hre.run("verify", { address: factoryAddr });
  await hre.run("verify", { address: beaconAddr });
  console.log("✅ Verification complete");
}

main().catch((err) => { console.error(err); process.exit(1); });
