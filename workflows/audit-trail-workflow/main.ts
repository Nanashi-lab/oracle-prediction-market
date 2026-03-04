import {
  cre,
  type Runtime,
  type HTTPSendRequester,
  consensusIdenticalAggregation,
  Runner,
  bytesToHex,
} from "@chainlink/cre-sdk";
import type { Log } from "@chainlink/cre-sdk/dist/generated/capabilities/blockchain/evm/v1alpha/client_pb";
import { toEventHash, decodeAbiParameters } from "viem";

// --- Config ---
export type Config = {
  contractAddress: string;
  chainSelector: number;
};

// --- Event signature ---
export const ROUND_RESOLVED_EVENT =
  "event RoundResolved(bytes32 indexed marketId, uint256 indexed round, uint8 winningChoice)";
export const ROUND_RESOLVED_SIG = toEventHash(ROUND_RESOLVED_EVENT);

// --- Types ---
export interface AuditEntry {
  marketId: string;
  round: string;
  winningChoice: number;
  contractAddress: string;
  blockNumber: string;
  txHash: string;
  timestamp: string;
}

// --- Decode event from log ---
export const decodeRoundResolved = (
  payload: Log,
  contractAddress: string
): AuditEntry => {
  // topics[0] = event sig, topics[1] = indexed marketId, topics[2] = indexed round
  const marketId = bytesToHex(payload.topics[1]) as `0x${string}`;
  const roundHex = bytesToHex(payload.topics[2]) as `0x${string}`;
  const round = BigInt(roundHex).toString();

  // data = ABI-encoded non-indexed params (uint8 winningChoice)
  const dataHex = bytesToHex(payload.data) as `0x${string}`;
  const [winningChoice] = decodeAbiParameters(
    [{ name: "winningChoice", type: "uint8" }],
    dataHex
  );

  return {
    marketId,
    round,
    winningChoice: Number(winningChoice),
    contractAddress,
    blockNumber: payload.blockNumber.toString(),
    txHash: bytesToHex(payload.txHash),
    timestamp: new Date().toISOString(),
  };
};

// --- Firestore writer ---
export const writeToFirestore = (
  sendRequester: HTTPSendRequester,
  firestoreUrl: string,
  entry: AuditEntry
): { success: boolean; documentId: string } => {
  const document = {
    fields: {
      marketId: { stringValue: entry.marketId },
      round: { stringValue: entry.round },
      winningChoice: { integerValue: entry.winningChoice.toString() },
      contractAddress: { stringValue: entry.contractAddress },
      blockNumber: { stringValue: entry.blockNumber },
      txHash: { stringValue: entry.txHash },
      timestamp: { stringValue: entry.timestamp },
    },
  };

  const response = sendRequester
    .sendRequest({
      method: "POST",
      url: firestoreUrl,
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify(document)).toString("base64"),
    })
    .result();

  if (response.statusCode !== 200) {
    const errorBody = Buffer.from(response.body).toString("utf-8");
    throw new Error(
      `Firestore write failed (${response.statusCode}): ${errorBody}`
    );
  }

  const responseBody = JSON.parse(
    Buffer.from(response.body).toString("utf-8")
  );
  const name: string = responseBody.name || "";
  const documentId = name.split("/").pop() || "";

  return { success: true, documentId };
};

// --- Handler ---
export const onLogTrigger = (
  runtime: Runtime<Config>,
  payload: Log
): string => {
  runtime.log("Audit trail workflow triggered by RoundResolved event");

  const { contractAddress } = runtime.config;

  // 1. Decode event
  const entry = decodeRoundResolved(payload, contractAddress);
  runtime.log(
    `Round resolved: market=${entry.marketId}, round=${entry.round}, choice=${entry.winningChoice}`
  );

  // 2. Get Firestore credentials
  const apiKey = runtime.getSecret({ id: "FIREBASE_API_KEY" }).result();
  const projectId = runtime.getSecret({ id: "FIREBASE_PROJECT_ID" }).result();

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId.value}/databases/(default)/documents/audit-log?key=${apiKey.value}`;

  // 3. Write to Firestore
  const httpClient = new cre.capabilities.HTTPClient();
  const result = httpClient
    .sendRequest(
      runtime,
      writeToFirestore,
      consensusIdenticalAggregation<{ success: boolean; documentId: string }>()
    )(firestoreUrl, entry)
    .result();

  runtime.log(`Audit log written to Firestore: ${result.documentId}`);

  return JSON.stringify({ ...entry, firestoreDocId: result.documentId });
};

// --- Workflow init ---
export const initWorkflow = (config: Config) => {
  const evmClient = new cre.capabilities.EVMClient(
    BigInt(config.chainSelector)
  );

  const logTrigger = evmClient.logTrigger({
    addresses: [config.contractAddress],
    topics: [{ values: [ROUND_RESOLVED_SIG] }],
  });

  return [cre.handler(logTrigger, onLogTrigger)];
};

// --- Entry point ---
export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
