import { describe, expect } from "bun:test";
import {
  newTestRuntime,
  test,
  HttpActionsMock,
  EvmMock,
} from "@chainlink/cre-sdk/test";
import {
  encodeFunctionResult,
  encodeAbiParameters,
  keccak256,
  toBytes,
} from "viem";
import {
  onLogTrigger,
  initWorkflow,
  SETTLEMENT_REQUESTED_SIG,
  type Config,
} from "./main";

const CHAIN_SELECTOR = BigInt(99911155111);

const ABI = [
  {
    name: "getCurrentRound",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function setupEvmMock(roundNumber: bigint) {
  const evmMock = EvmMock.testInstance(CHAIN_SELECTOR);

  const encodedRound = encodeFunctionResult({
    abi: ABI,
    functionName: "getCurrentRound",
    result: roundNumber,
  });
  const hexBytes = encodedRound.slice(2);
  const bytes = new Uint8Array(
    hexBytes.match(/.{2}/g)!.map((b) => parseInt(b, 16))
  );
  const base64Data = Buffer.from(bytes).toString("base64");

  evmMock.callContract = (_input) => ({
    data: base64Data,
  });

  evmMock.writeReport = (_input) => ({
    txStatus: "TX_STATUS_SUCCESS",
    txHash: Buffer.from(new Uint8Array(32)).toString("base64"),
  });
}

const mockGeminiResponse = (result: string, confidence: number) => ({
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({ result, confidence }),
          },
        ],
      },
    },
  ],
});

const makeConfig = (): Config => ({
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  chainSelector: 99911155111,
  geminiModel: "gemini-2.5-flash",
});

const secrets = new Map([
  ["default", new Map([["GEMINI_API_KEY", "fake-test-key"]])],
]);

// Helper: convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

// Build a mock Log payload matching the SettlementRequested event
function makeMockLog(
  marketId: string,
  question: string,
  contractAddress: string
) {
  const eventSigBytes = hexToBytes(SETTLEMENT_REQUESTED_SIG);
  const marketIdBytes = hexToBytes(marketId);
  const encodedQuestion = encodeAbiParameters(
    [{ type: "string" }],
    [question]
  );
  const questionDataBytes = hexToBytes(encodedQuestion);

  return {
    address: hexToBytes(contractAddress),
    topics: [eventSigBytes, marketIdBytes],
    txHash: new Uint8Array(32),
    blockHash: new Uint8Array(32),
    data: questionDataBytes,
    eventSig: eventSigBytes,
    blockNumber: BigInt(1000),
    txIndex: 0,
    index: 0,
    removed: false,
  };
}

describe("onLogTrigger", () => {
  test("resolves YES when Gemini confirms sports result", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockGeminiResponse("YES", 9800))
      ),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const config = makeConfig();
    const log = makeMockLog(
      config.marketId,
      "Did the Kansas City Chiefs beat the Baltimore Ravens on Feb 15 2026?",
      config.contractAddress
    );

    const result = onLogTrigger(runtime, log as any);
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("YES");
    expect(parsed.confidence).toBe(9800);
    expect(parsed.winningChoice).toBe(0);
  });

  test("resolves NO with choice 1", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockGeminiResponse("NO", 7500))
      ),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(3));

    const config = makeConfig();
    const log = makeMockLog(
      config.marketId,
      "Did the Lakers win against the Celtics on March 1 2026?",
      config.contractAddress
    );

    const result = onLogTrigger(runtime, log as any);
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("NO");
    expect(parsed.confidence).toBe(7500);
    expect(parsed.winningChoice).toBe(1);
  });

  test("skips resolution when INCONCLUSIVE", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockGeminiResponse("INCONCLUSIVE", 0))
      ),
      headers: {},
      multiHeaders: {},
    });

    // No EVM mock — should skip onchain
    const config = makeConfig();
    const log = makeMockLog(
      config.marketId,
      "Who will win the Super Bowl in 2027?",
      config.contractAddress
    );

    const result = onLogTrigger(runtime, log as any);
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("INCONCLUSIVE");
    expect(parsed.confidence).toBe(0);
    expect(parsed.winningChoice).toBeUndefined();
  });

  test("handles malformed Gemini response gracefully", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Sorry, I cannot determine the result" }],
              },
            },
          ],
        })
      ),
      headers: {},
      multiHeaders: {},
    });

    const config = makeConfig();
    const log = makeMockLog(
      config.marketId,
      "Some sports question",
      config.contractAddress
    );

    const result = onLogTrigger(runtime, log as any);
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("INCONCLUSIVE");
    expect(parsed.confidence).toBe(0);
  });
});

describe("initWorkflow", () => {
  test("returns one handler with log trigger", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
