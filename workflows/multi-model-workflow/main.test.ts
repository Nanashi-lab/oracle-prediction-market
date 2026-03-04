import { describe, expect } from "bun:test";
import { newTestRuntime, test, HttpActionsMock, EvmMock } from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import { onCronTrigger, initWorkflow, parseAIResponse, type Config } from "./main";

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

// Gemini response format
const mockGeminiResponse = (result: string, confidence: number) => ({
  candidates: [
    { content: { parts: [{ text: JSON.stringify({ result, confidence }) }] } },
  ],
});

// OpenAI response format
const mockOpenAIResponse = (result: string, confidence: number) => ({
  choices: [
    { message: { content: JSON.stringify({ result, confidence }) } },
  ],
});

const makeConfig = (): Config => ({
  schedule: "0 0 12 8 3 *",
  question: "Did the Federal Reserve cut interest rates in March 2026?",
  geminiModel: "gemini-2.5-flash",
  openaiModel: "gpt-4o",
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId: "0x0000000000000000000000000000000000000000000000000000000000000005",
  chainSelector: 99911155111,
});

const secrets = new Map([
  ["default", new Map([
    ["GEMINI_API_KEY", "fake-gemini-key"],
    ["OPENAI_API_KEY", "fake-openai-key"],
  ])],
]);

// Track which API is being called to return the right mock
function setupHttpMock(geminiResult: string, geminiConfidence: number, openaiResult: string, openaiConfidence: number) {
  const httpMock = HttpActionsMock.testInstance();
  let callCount = 0;
  httpMock.sendRequest = (_input) => {
    callCount++;
    // First HTTP call = Gemini, second = OpenAI
    const isGemini = callCount <= 1;
    const responseBody = isGemini
      ? mockGeminiResponse(geminiResult, geminiConfidence)
      : mockOpenAIResponse(openaiResult, openaiConfidence);

    return {
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(responseBody)),
      headers: {},
      multiHeaders: {},
    };
  };
}

describe("parseAIResponse", () => {
  test("parses valid JSON", async () => {
    const result = parseAIResponse('{"result":"YES","confidence":9500}');
    expect(result.result).toBe("YES");
    expect(result.confidence).toBe(9500);
  });

  test("returns INCONCLUSIVE for garbage", async () => {
    const result = parseAIResponse("random text without json");
    expect(result.result).toBe("INCONCLUSIVE");
    expect(result.confidence).toBe(0);
  });
});

describe("onCronTrigger", () => {
  test("resolves onchain when both models agree YES", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    setupHttpMock("YES", 9500, "YES", 8800);
    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.modelsAgree).toBe(true);
    expect(parsed.finalResult).toBe("YES");
    expect(parsed.finalConfidence).toBe(8800); // min of both
    expect(parsed.winningChoice).toBe(0);
    expect(parsed.txHash).toBeDefined();
  });

  test("resolves onchain when both models agree NO", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    setupHttpMock("NO", 9000, "NO", 7500);
    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.modelsAgree).toBe(true);
    expect(parsed.finalResult).toBe("NO");
    expect(parsed.finalConfidence).toBe(7500);
    expect(parsed.winningChoice).toBe(1);
  });

  test("skips onchain when models disagree", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    setupHttpMock("YES", 9000, "NO", 8500);
    // No EVM mock — should not touch chain

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.modelsAgree).toBe(false);
    expect(parsed.finalResult).toBe("INCONCLUSIVE");
    expect(parsed.finalConfidence).toBe(0);
    expect(parsed.winningChoice).toBeUndefined();
    expect(parsed.txHash).toBeUndefined();
  });

  test("skips onchain when one model is INCONCLUSIVE", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    setupHttpMock("YES", 9000, "INCONCLUSIVE", 0);

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.modelsAgree).toBe(false);
    expect(parsed.finalResult).toBe("INCONCLUSIVE");
  });
});

describe("initWorkflow", () => {
  test("returns one handler", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
