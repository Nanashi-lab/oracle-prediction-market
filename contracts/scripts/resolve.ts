import hre from "hardhat";

const CONTRACT = "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3";
const ALPHA_MARKET_ID = "0x1fe5dedefa1235641c90bd8fa60aed75e242cb310c788962ec7bddd81271530c";
const ORACLE = "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3";
const ALPHA_API = "http://localhost:3001/api/alpha/price";

async function main() {
  // 1. Fetch price from Alpha server
  const res = await fetch(ALPHA_API);
  if (!res.ok) throw new Error(`Server responded ${res.status} — is the Alpha server running?`);
  const data = await res.json();

  const { price, targetPrice, roundNumber: serverRound } = data;
  console.log(`Server round: ${serverRound}`);
  console.log(`Price: ${price.toFixed(4)}, Target: ${targetPrice.toFixed(4)}`);

  // 2. Determine outcome: UP=0, DOWN=1
  const winningChoice = price >= targetPrice ? 0 : 1;
  console.log(`Outcome: ${winningChoice === 0 ? "UP" : "DOWN"} (choice ${winningChoice})`);

  // 3. Connect to contract
  const signer = await hre.ethers.getImpersonatedSigner(ORACLE);
  const contract = await hre.ethers.getContractAt("PredictionMarket", CONTRACT, signer);

  // 4. Read current on-chain round
  const currentRound = await contract.getCurrentRound(ALPHA_MARKET_ID);
  console.log(`On-chain round: ${currentRound}`);

  // 5. Resolve
  console.log(`\nResolving round ${currentRound} with choice ${winningChoice}...`);
  const tx = await contract.resolveRound(ALPHA_MARKET_ID, currentRound, winningChoice);
  const receipt = await tx.wait();
  console.log(`Resolved! tx: ${receipt?.hash}`);

  // 6. Confirm new round
  const newRound = await contract.getCurrentRound(ALPHA_MARKET_ID);
  console.log(`New on-chain round: ${newRound}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
