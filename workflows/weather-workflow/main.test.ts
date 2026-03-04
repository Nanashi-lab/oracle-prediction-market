import { describe, expect } from "bun:test";
import { newTestRuntime, test, ConfidentialHttpMock, EvmMock } from "@chainlink/cre-sdk/test";
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

const mockWeatherResponse = (weatherId: number, description: string) => ({
  weather: [{ id: weatherId, description }],
  main: { temp: 15 },
  name: "New York",
});

const makeConfig = (): Config => ({
  schedule: "0 0 12 * * *",
  city: "New York",
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId: "0x0000000000000000000000000000000000000000000000000000000000000004",
  chainSelector: 99911155111,
});

const secrets = new Map([
  ["default", new Map([["OPEN_WEATHER_API_KEY", "fake-test-key"]])],
]);

describe("onCronTrigger", () => {
  test("resolves YES (choice 0) when it is raining", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = ConfidentialHttpMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockWeatherResponse(500, "moderate rain"))),
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.isRaining).toBe(true);
    expect(parsed.weatherCode).toBe(500);
    expect(parsed.winningChoice).toBe(0);
  });

  test("resolves NO (choice 1) when it is clear", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = ConfidentialHttpMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockWeatherResponse(800, "clear sky"))),
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.isRaining).toBe(false);
    expect(parsed.weatherCode).toBe(800);
    expect(parsed.winningChoice).toBe(1);
  });

  test("resolves YES for thunderstorm (code 200)", async () => {
    const runtime = newTestRuntime(secrets);
    runtime.config = makeConfig();

    const httpMock = ConfidentialHttpMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(JSON.stringify(mockWeatherResponse(211, "thunderstorm"))),
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, { scheduledExecutionTime: new Date() });
    const parsed = JSON.parse(result);

    expect(parsed.isRaining).toBe(true);
    expect(parsed.weatherCode).toBe(211);
    expect(parsed.winningChoice).toBe(0);
  });
});

describe("initWorkflow", () => {
  test("returns one handler", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
