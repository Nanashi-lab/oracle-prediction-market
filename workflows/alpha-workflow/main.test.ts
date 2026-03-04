import { describe, expect } from "bun:test";
import { newTestRuntime, test, HttpActionsMock, EvmMock } from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import { onCronTrigger, initWorkflow, type Config, type AlphaPriceResponse } from "./main";

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
  // Convert hex string to base64 for the JSON reply
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

const mockAlphaResponse = (price: number, targetPrice: number, roundNumber: number): AlphaPriceResponse => ({
  price,
  targetPrice,
  roundNumber,
  roundRemaining: 120000,
  roundDuration: 300000,
  time: Date.now(),
});

describe("onCronTrigger", () => {
  test("returns UP when price > targetPrice", async () => {
    const config: Config = {
      schedule: "*/5 * * * *",
      alphaApiUrl: "http://localhost:3001/api/alpha/price",
      contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
      marketId: "0xf51f0e5026d7806e998aad6d06d8cd4a8dbe7457a67e26a4332fa272474d4dbc",
      chainSelector: 99911155111,
    };
    const runtime = newTestRuntime();
    runtime.config = config;

    const httpMock = HttpActionsMock.testInstance();
    const mockData = mockAlphaResponse(1050, 1000, 1);
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockData)),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.outcome).toBe("UP");
    expect(parsed.price).toBe(1050);
    expect(parsed.roundNumber).toBe(1);
  });

  test("returns DOWN when price < targetPrice", async () => {
    const config: Config = {
      schedule: "*/5 * * * *",
      alphaApiUrl: "http://localhost:3001/api/alpha/price",
      contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
      marketId: "0xf51f0e5026d7806e998aad6d06d8cd4a8dbe7457a67e26a4332fa272474d4dbc",
      chainSelector: 99911155111,
    };
    const runtime = newTestRuntime();
    runtime.config = config;

    const httpMock = HttpActionsMock.testInstance();
    const mockData = mockAlphaResponse(950, 1000, 2);
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockData)),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(2));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.outcome).toBe("DOWN");
    expect(parsed.price).toBe(950);
    expect(parsed.roundNumber).toBe(2);
  });
});

describe("initWorkflow", () => {
  test("returns one handler with correct cron schedule", async () => {
    const config: Config = {
      schedule: "0 */5 * * * *",
      alphaApiUrl: "http://localhost:3001/api/alpha/price",
      contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
      marketId: "0xf51f0e5026d7806e998aad6d06d8cd4a8dbe7457a67e26a4332fa272474d4dbc",
      chainSelector: 99911155111,
    };
    const handlers = initWorkflow(config);

    expect(handlers).toBeArray();
    expect(handlers).toHaveLength(1);
    expect(handlers[0].trigger.config.schedule).toBe("0 */5 * * * *");
  });
});
