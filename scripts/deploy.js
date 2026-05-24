const hre = require("hardhat");

async function main() {
  console.log("=========================================");
  console.log("EduStream Contract Deployment on Arc L1");
  console.log("=========================================");

  // Arc Testnet USDC contract address
  const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Check deployer balance (in USDC since USDC is native gas on Arc)
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance (USDC Gas):", hre.ethers.formatUnits(balance, 18)); // Arc Native Gas uses 18 decimals

  // 1. Deploy CourseFund
  console.log("\nDeploying CourseFund...");
  const CourseFund = await hre.ethers.getContractFactory("CourseFund");
  const courseFund = await CourseFund.deploy(USDC_ADDRESS);
  await courseFund.waitForDeployment();
  const courseFundAddress = await courseFund.getAddress();
  console.log("CourseFund deployed to:", courseFundAddress);

  // 2. Deploy EduStreamer
  console.log("\nDeploying EduStreamer...");
  const EduStreamer = await hre.ethers.getContractFactory("EduStreamer");
  // Set platform treasury to deployer address for testing, can be updated later
  const eduStreamer = await EduStreamer.deploy(USDC_ADDRESS, deployer.address);
  await eduStreamer.waitForDeployment();
  const eduStreamerAddress = await eduStreamer.getAddress();
  console.log("EduStreamer deployed to:", eduStreamerAddress);

  // 3. Deploy SoulboundCert
  console.log("\nDeploying SoulboundCert...");
  const SoulboundCert = await hre.ethers.getContractFactory("SoulboundCert");
  const soulboundCert = await SoulboundCert.deploy();
  await soulboundCert.waitForDeployment();
  const soulboundCertAddress = await soulboundCert.getAddress();
  console.log("SoulboundCert deployed to:", soulboundCertAddress);

  // 4. Link CourseFund and EduStreamer
  console.log("\nLinking contracts...");
  const tx = await courseFund.setEduStreamer(eduStreamerAddress);
  await tx.wait();
  console.log("CourseFund linked to EduStreamer!");

  console.log("\n=========================================");
  console.log("Deployment Complete!");
  console.log("USDC Token:     ", USDC_ADDRESS);
  console.log("CourseFund:    ", courseFundAddress);
  console.log("EduStreamer:   ", eduStreamerAddress);
  console.log("SoulboundCert: ", soulboundCertAddress);
  console.log("=========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
