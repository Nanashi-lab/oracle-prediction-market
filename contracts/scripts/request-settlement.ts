import hre from "hardhat";

const CONTRACT = "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3";
const ORACLE = "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3";

// Sports market ID (market 6 in Workflows.md)
const SPORTS_MARKET_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";

async function main() {
  const question = process.env.QUESTION || "Did the Kansas City Chiefs beat the Baltimore Ravens on Feb 15 2026?";
  const marketId = process.env.MARKET_ID || SPORTS_MARKET_ID;

  console.log(`Calling requestSettlement on market ${marketId}`);
  console.log(`Question: ${question}`);

  const signer = await hre.ethers.getImpersonatedSigner(ORACLE);
  const contract = await hre.ethers.getContractAt("PredictionMarket", CONTRACT, signer);

  const tx = await contract.requestSettlement(marketId, question);
  const receipt = await tx.wait();

  console.log(`\nSettlement requested!`);
  console.log(`TX hash: ${receipt?.hash}`);
  console.log(`Block:   ${receipt?.blockNumber}`);
  console.log(`\nUse this tx hash to simulate the sports workflow:`);
  console.log(`  cd demo-cre && cre workflow simulate sports-workflow --target=staging-settings --non-interactive --trigger-index=0 --evm-tx-hash=${receipt?.hash} --evm-event-index=0`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
