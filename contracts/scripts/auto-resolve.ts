import hre from "hardhat";

const CONTRACT = "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3";
const ALPHA_MARKET_ID = "0x1fe5dedefa1235641c90bd8fa60aed75e242cb310c788962ec7bddd81271530c";
const ORACLE = "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3";
const ALPHA_API = "http://localhost:3001/api/alpha/price";

const POLL_INTERVAL = 5_000; // 5 seconds
const RESOLVE_THRESHOLD = 10_000; // resolve when < 10s remaining

let lastResolvedServerRound = 0;

async function poll() {
  try {
    const res = await fetch(ALPHA_API);
    if (!res.ok) return;
    const data = await res.json();

    const { price, targetPrice, roundNumber, roundRemaining } = data;

    // Only resolve if round is nearly over and we haven't resolved this server round yet
    if (roundRemaining > RESOLVE_THRESHOLD || roundNumber === lastResolvedServerRound) {
      const secs = Math.round(roundRemaining / 1000);
      process.stdout.write(`\rRound ${roundNumber} | ${secs}s remaining | $${price.toFixed(2)} vs $${targetPrice.toFixed(2)}  `);
      return;
    }

    // Determine outcome
    const winningChoice = price >= targetPrice ? 0 : 1;
    const outcome = winningChoice === 0 ? "UP" : "DOWN";

    console.log(`\n\nResolving round — server round ${roundNumber}, outcome: ${outcome}`);
    console.log(`  Price: $${price.toFixed(4)}, Target: $${targetPrice.toFixed(4)}`);

    // Read on-chain round
    const signer = await hre.ethers.getImpersonatedSigner(ORACLE);
    const contract = await hre.ethers.getContractAt("PredictionMarket", CONTRACT, signer);
    const currentRound = await contract.getCurrentRound(ALPHA_MARKET_ID);
    console.log(`  On-chain round: ${currentRound}`);

    // Resolve
    const tx = await contract.resolveRound(ALPHA_MARKET_ID, currentRound, winningChoice);
    const receipt = await tx.wait();
    console.log(`  Resolved! tx: ${receipt?.hash}`);

    const newRound = await contract.getCurrentRound(ALPHA_MARKET_ID);
    console.log(`  New on-chain round: ${newRound}\n`);

    lastResolvedServerRound = roundNumber;
  } catch (err: any) {
    console.error(`\nError: ${err.message}`);
  }
}

async function main() {
  console.log("Auto-resolve watcher started");
  console.log(`Polling every ${POLL_INTERVAL / 1000}s, resolving when < ${RESOLVE_THRESHOLD / 1000}s remaining\n`);

  // Initial check to set lastResolvedServerRound
  try {
    const res = await fetch(ALPHA_API);
    const data = await res.json();
    console.log(`Server round: ${data.roundNumber}, ${Math.round(data.roundRemaining / 1000)}s remaining\n`);
  } catch {
    console.log("Warning: Alpha server not reachable\n");
  }

  // Poll forever
  setInterval(poll, POLL_INTERVAL);
}

main().catch(console.error);
