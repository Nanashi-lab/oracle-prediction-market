import { describe, expect } from "bun:test";
import {
  newTestRuntime,
  test,
  HttpActionsMock,
  EvmMock,
} from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import {
  onCronTrigger,
  initWorkflow,
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

const mockYahooResponse = (
  symbol: string,
  price: number,
  previousClose: number
) => ({
  chart: {
    result: [
      {
        meta: {
          symbol,
          regularMarketPrice: price,
          chartPreviousClose: previousClose,
        },
      },
    ],
  },
});

const makeConfig = (): Config => ({
  schedule: "0 0 16 * * 1-5",
  symbol: "AAPL",
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  marketId:
    "0x0000000000000000000000000000000000000000000000000000000000000007",
  chainSelector: 99911155111,
});

describe("onCronTrigger", () => {
  test("returns UP when stock price is above previous close", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockYahooResponse("AAPL", 185.5, 182.0))
      ),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(1));

    const result = onCronTrigger(runtime, {
      scheduledExecutionTime: new Date(),
    });
    const parsed = JSON.parse(result);

    expect(parsed.symbol).toBe("AAPL");
    expect(parsed.price).toBe(185.5);
    expect(parsed.previousClose).toBe(182.0);
    expect(parsed.outcome).toBe("UP");
    expect(parsed.winningChoice).toBe(0);
  });

  test("returns DOWN when stock price is below previous close", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig();

    const httpMock = HttpActionsMock.testInstance();
    httpMock.sendRequest = (_input) => ({
      statusCode: 200,
      body: new TextEncoder().encode(
        JSON.stringify(mockYahooResponse("AAPL", 178.2, 182.0))
      ),
      headers: {},
      multiHeaders: {},
    });

    setupEvmMock(BigInt(2));

    const result = onCronTrigger(runtime, {
      scheduledExecutionTime: new Date(),
    });
    const parsed = JSON.parse(result);

    expect(parsed.symbol).toBe("AAPL");
    expect(parsed.price).toBe(178.2);
    expect(parsed.outcome).toBe("DOWN");
    expect(parsed.winningChoice).toBe(1);
  });
});

describe("initWorkflow", () => {
  test("returns one handler with cron trigger", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
