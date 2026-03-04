import hre from "hardhat";

const WALLET = "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3";

async function main() {
  // Impersonate wallet (Tenderly virtual testnets allow this — no private key needed)
  await hre.network.provider.request({
    method: "tenderly_setBalance",
    params: [WALLET, "0x1bc16d674ec80000"],
  });

  const signer = await hre.ethers.getImpersonatedSigner(WALLET);
  console.log("Deploying from:", signer.address);

  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket", signer);
  const contract = await PredictionMarket.deploy(WALLET);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("PredictionMarket deployed to:", address);

  // Create all 9 markets
  const marketDefs = [
    { name: "alpha", choices: 2 },       // UP / DOWN
    { name: "btc-usd", choices: 2 },     // UP / DOWN
    { name: "eth-usd", choices: 2 },     // UP / DOWN
    { name: "aapl", choices: 2 },        // UP / DOWN
    { name: "nfl-game", choices: 2 },    // Team A / Team B
    { name: "weather-nyc", choices: 2 }, // Yes / No
    { name: "fed-rate", choices: 3 },    // Cut / Hold / Hike
    { name: "ai-consensus", choices: 2 },// Yes / No
    { name: "ondemand", choices: 2 },    // Yes / No
  ];

  console.log("\nCreating markets...");

  for (const { name, choices } of marketDefs) {
    const tx = await contract.createMarket(name, choices);
    const receipt = await tx.wait();

    const event = receipt?.logs.find((log) => {
      try {
        return contract.interface.parseLog({ topics: [...log.topics], data: log.data })?.name === "MarketCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog({ topics: [...event.topics], data: event.data });
      console.log(`  ${name} (${choices} choices) → ${parsed?.args.marketId}`);
    }
  }

  console.log("\nDone! Save the contract address and market IDs above.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
