import { describe, expect } from "bun:test";
import { newTestRuntime, test, EvmMock } from "@chainlink/cre-sdk/test";
import { encodeFunctionResult } from "viem";
import {
  onHttpTrigger,
  parseSettlementRequest,
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

const makeConfig = (): Config => ({
  contractAddress: "0xE9170EfBDB9B1B11d155B047a62EFfCCB09080F3",
  chainSelector: 99911155111,
  authorizedPublicKey: "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3",
});

function makeMockPayload(input: object) {
  const inputBytes = new TextEncoder().encode(JSON.stringify(input));
  return {
    input: inputBytes,
    key: {
      type: 1, // ECDSA_EVM
      publicKey: "0x3ee04776dd69D5D0E1E9D18e9D1012F271808eF3",
    },
  };
}

describe("parseSettlementRequest", () => {
  test("parses valid request", () => {
    const payload = makeMockPayload({
      marketId:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      roundNum: 5,
      winningChoice: 1,
    });

    const result = parseSettlementRequest(payload as any);
    expect(result.marketId).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(result.roundNum).toBe(5);
    expect(result.winningChoice).toBe(1);
  });

  test("throws on missing marketId", () => {
    const payload = makeMockPayload({ roundNum: 1, winningChoice: 0 });
    expect(() => parseSettlementRequest(payload as any)).toThrow("marketId");
  });

  test("throws on missing roundNum", () => {
    const payload = makeMockPayload({
      marketId:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      winningChoice: 0,
    });
    expect(() => parseSettlementRequest(payload as any)).toThrow("roundNum");
  });

  test("throws on missing winningChoice", () => {
    const payload = makeMockPayload({
      marketId:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      roundNum: 1,
    });
    expect(() => parseSettlementRequest(payload as any)).toThrow(
      "winningChoice"
    );
  });
});

describe("onHttpTrigger", () => {
  test("resolves round onchain with choice 0", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig();
    setupEvmMock(BigInt(3));

    const payload = makeMockPayload({
      marketId:
        "0x0000000000000000000000000000000000000000000000000000000000000001",
      roundNum: 3,
      winningChoice: 0,
    });

    const result = onHttpTrigger(runtime, payload as any);
    const parsed = JSON.parse(result);

    expect(parsed.marketId).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000001"
    );
    expect(parsed.roundNum).toBe(3);
    expect(parsed.winningChoice).toBe(0);
    expect(parsed.txHash).toBeDefined();
  });

  test("resolves round onchain with choice 1", async () => {
    const runtime = newTestRuntime();
    runtime.config = makeConfig();
    setupEvmMock(BigInt(7));

    const payload = makeMockPayload({
      marketId:
        "0x0000000000000000000000000000000000000000000000000000000000000002",
      roundNum: 7,
      winningChoice: 1,
    });

    const result = onHttpTrigger(runtime, payload as any);
    const parsed = JSON.parse(result);

    expect(parsed.marketId).toBe(
      "0x0000000000000000000000000000000000000000000000000000000000000002"
    );
    expect(parsed.roundNum).toBe(7);
    expect(parsed.winningChoice).toBe(1);
    expect(parsed.txHash).toBeDefined();
  });
});

describe("initWorkflow", () => {
  test("returns one handler with HTTP trigger", async () => {
    const handlers = initWorkflow(makeConfig());
    expect(handlers).toHaveLength(1);
  });
});
