import assert from "node:assert/strict";
import test from "node:test";
import { testnetBradbury } from "genlayer-js/chains";
import {
  BRADBURY_CHAIN_EXPLORER_URL,
  BRADBURY_CHAIN_ID,
  BRADBURY_CHAIN_RPC_URL,
  BRADBURY_GENLAYER_EXPLORER_URL,
  BRADBURY_GENLAYER_RPC_URL,
  BRADBURY_WALLET_NETWORK,
  formatWeiGen,
  isEvmAddress,
  readBradburyNativeBalanceWei,
} from "../lib/genlayer-network.mjs";

test("MetaMask and the SDK use the official Bradbury GenLayer RPC", () => {
  assert.equal(testnetBradbury.id, BRADBURY_CHAIN_ID);
  assert.equal(Number.parseInt(BRADBURY_WALLET_NETWORK.chainId, 16), testnetBradbury.id);
  assert.equal(BRADBURY_WALLET_NETWORK.chainName, testnetBradbury.name);
  assert.deepEqual(BRADBURY_WALLET_NETWORK.rpcUrls, [BRADBURY_GENLAYER_RPC_URL]);
  assert.deepEqual(BRADBURY_WALLET_NETWORK.rpcUrls, testnetBradbury.rpcUrls.default.http);
  assert.equal(BRADBURY_WALLET_NETWORK.nativeCurrency.symbol, testnetBradbury.nativeCurrency.symbol);
  assert.equal(BRADBURY_WALLET_NETWORK.nativeCurrency.decimals, testnetBradbury.nativeCurrency.decimals);
  assert.equal(BRADBURY_WALLET_NETWORK.blockExplorerUrls[0], BRADBURY_GENLAYER_EXPLORER_URL);
  assert.equal(testnetBradbury.blockExplorers.default.url.replace(/\/$/, ""), BRADBURY_GENLAYER_EXPLORER_URL);
  assert.notEqual(BRADBURY_CHAIN_RPC_URL, BRADBURY_GENLAYER_RPC_URL);
  assert.notEqual(BRADBURY_CHAIN_EXPLORER_URL, BRADBURY_GENLAYER_EXPLORER_URL);
});

test("Bradbury balance verification bypasses the injected wallet provider", async () => {
  const wallet = "0x1111111111111111111111111111111111111111";
  let request;
  const balance = await readBradburyNativeBalanceWei(wallet, async (url, init) => {
    request = { url, init };
    return {
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: "2.0", id: 1, result: "0xde0b6b3a7640000" };
      },
    };
  });

  assert.equal(balance, 1_000_000_000_000_000_000n);
  assert.equal(request.url, BRADBURY_GENLAYER_RPC_URL);
  assert.equal(request.init.method, "POST");
  const payload = JSON.parse(request.init.body);
  assert.equal(payload.method, "eth_getBalance");
  assert.deepEqual(payload.params, [wallet, "latest"]);
});

test("Bradbury balance verification rejects malformed or RPC-error responses", async () => {
  const wallet = "0x1111111111111111111111111111111111111111";

  await assert.rejects(
    readBradburyNativeBalanceWei(wallet, async () => ({
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: "2.0", id: 1, error: { message: "temporarily unavailable" } };
      },
    })),
    /temporarily unavailable/,
  );

  await assert.rejects(
    readBradburyNativeBalanceWei(wallet, async () => ({
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: "2.0", id: 1, result: "not-a-balance" };
      },
    })),
    /invalid native GEN balance/,
  );
});

test("GEN formatting handles integer and fractional wei amounts", () => {
  assert.equal(formatWeiGen("1000000000000000000"), "1");
  assert.equal(formatWeiGen("1250000000000000000"), "1.25");
  assert.equal(formatWeiGen("1"), "0.000000000000000001");
});

test("address input requires a 20-byte hexadecimal EVM address", () => {
  assert.equal(isEvmAddress("0x1111111111111111111111111111111111111111"), true);
  assert.equal(isEvmAddress("0x111"), false);
  assert.equal(isEvmAddress("1111111111111111111111111111111111111111"), false);
});
