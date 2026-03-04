import { describe, expect } from "bun:test";
import {
  newTestRuntime,
  test,
  HttpActionsMock,
} from "@chainlink/cre-sdk/test";
import { encodeAbiParameters } from "viem";
import {
  onLogTrigger,
  decodeRoundResolved,
  initWorkflow,
  ROUND_RESOLVED_SIG,
  type Config,
} from "./main";

const CHAIN_SELECTOR = BigInt(99911155111);

const makeConfig = (): Config => ({
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  chainSelector: 99911155111,
});

const secrets = new Map([
  [
    "default",
    new Map([
      ["FIREBASE_API_KEY", "fake-api-key"],
      ["FIREBASE_PROJECT_ID", "fake-project-id"],
    ]),
  ],
]);

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

function makeMockLog(
  marketId: string,
  round: bigint,
  winningChoice: number,
  contractAddress: string
) {
  const eventSigBytes = hexToBytes(ROUND_RESOLVED_SIG);
  const marketIdBytes = hexToBytes(marketId);

  // round as bytes32 (uint256 padded to 32 bytes)
  const roundHex = round.toString(16).padStart(64, "0");
  const roundBytes = hexToBytes(roundHex);

  // winningChoice as ABI-encoded uint8
  const encodedChoice = encodeAbiParameters(
    [{ type: "uint8" }],
    [winningChoice]
  );
  const choiceBytes = hexToBytes(encodedChoice);

  return {
    address: hexToBytes(contractAddress),
    topics: [eventSigBytes, marketIdBytes, roundBytes],
    txHash: new Uint8Array(32),
    blockHash: new Uint8Array(32),
    data: choiceBytes,
    eventSig: eventSigBytes,
    blockNumber: BigInt(5000),
    txIndex: 0,
    index: 0,
    removed: false,
  };
}

const mockFirestoreResponse = (docName: string) => ({
  name: `projects/fake-project-id/databases/(default)/documents/audit-log/${docName}`,
  fields: {},
  createTime: "2026-03-07T12:00:00Z",
  updateTime: "2026-03-07T12:00:00Z",
});

describe("decodeRoundResolved", () => {
  test("decodes event fields correctly", () => {
    const marketId =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const log = makeMockLog(marketId, BigInt(3), 1, makeConfig().contractAddress);

    const entry = decodeRoundResolved(log as any, makeConfig().contractAddress);

    expect(entry.marketId).toBe(marketId);
    expect(entry.round).toBe("3");
    expect(entry.winningChoice).toBe(1);
    expect(entry.contractAddress).toBe(makeConfig().contractAddress);
    expect(entry.blockNumber).toBe("5000");
  });

  test("decodes choice 0", () => {
    const marketId =
      "0x0000000000000000000000000000000000000000000000000000000000000002";
    const log = makeMockLog(marketId, BigInt(1), 0, makeConfig().contractAddress);

    const entry = decodeRoundResolved(log as any, makeConfig().contractAddress);

    expect(entry.winningChoice).toBe(0);
    expect(entry.round).toBe("1");
  });
});

describe("onLogTrigger", () => {
  test("writes audit entry to Firestore and returns result", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockFirestoreResponse("abc123"))
      ),
      headers: {},
      multiHeaders: {},
    });

    const marketId =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const log = makeMockLog(marketId, BigInt(5), 1, makeConfig().contractAddress);

    const result = onLogTrigger(runtime, log as any);
    const parsed = JSON.parse(result);

    expect(parsed.marketId).toBe(marketId);
    expect(parsed.round).toBe("5");
    expect(parsed.winningChoice).toBe(1);
    expect(parsed.firestoreDocId).toBe("abc123");
  });

  test("handles Firestore error gracefully", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 403,
      body: new TextEncoder().encode('{"error":"permission denied"}'),
      headers: {},
      multiHeaders: {},
    });

    const marketId =
      "0x0000000000000000000000000000000000000000000000000000000000000001";
    const log = makeMockLog(marketId, BigInt(2), 0, makeConfig().contractAddress);

    expect(() => onLogTrigger(runtime, log as any)).toThrow(
      "Firestore write failed"
    );
  });
});

describe("initWorkflow", () => {
  test("returns one handler with log trigger", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
