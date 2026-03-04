import { describe, expect } from "bun:test";
import { newTestRuntime, test, HttpActionsMock, EvmMock } from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import { onCronTrigger, initWorkflow, type Config } from "./main";

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
  const bytes = new Uint8Array(hexBytes.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
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
  schedule: "0 0 12 8 3 *",
  question: "Did the Federal Reserve cut interest rates in March 2026?",
  geminiModel: "gemini-2.5-flash",
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId: "0x0000000000000000000000000000000000000000000000000000000000000003",
  chainSelector: 99911155111,
});

// Secrets: map of secretKey -> map of envVar -> value
// Secrets: namespace -> id -> value
const secrets = new Map([
  ["default", new Map([["GEMINI_API_KEY", "fake-test-key"]])],
]);

describe("onCronTrigger", () => {
  test("returns YES and resolves onchain when Gemini confirms", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockGeminiResponse("YES", 9500))),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("YES");
    expect(parsed.confidence).toBe(9500);
    expect(parsed.winningChoice).toBe(0);
  });

  test("returns NO and resolves onchain with choice 1", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockGeminiResponse("NO", 8200))),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("NO");
    expect(parsed.confidence).toBe(8200);
    expect(parsed.winningChoice).toBe(1);
  });

  test("returns INCONCLUSIVE and skips onchain resolution", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockGeminiResponse("INCONCLUSIVE", 0))),
      headers: {},
      multiHeaders: {},
    });

    // No EVM mock needed — should skip onchain

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
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
      body: new TextEncoder().encode(JSON.stringify({
        candidates: [{ content: { parts: [{ text: "I don't know, here's some random text" }] } }],
      })),
      headers: {},
      multiHeaders: {},
    });

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.result).toBe("INCONCLUSIVE");
    expect(parsed.confidence).toBe(0);
  });
});

describe("initWorkflow", () => {
  test("returns one handler", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
