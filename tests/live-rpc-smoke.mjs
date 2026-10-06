import assert from "node:assert/strict";
import {
  BRADBURY_CHAIN_ID,
  BRADBURY_CHAIN_RPC_URL,
  BRADBURY_GENLAYER_RPC_URL,
  readBradburyNativeBalanceWei,
} from "../lib/genlayer-network.mjs";

async function rpc(url, method, params = []) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.ok, true, `${url} returned HTTP ${response.status}`);
  const payload = await response.json();
  assert.equal(payload.error, undefined, `${url} ${method} failed: ${JSON.stringify(payload.error)}`);
  return payload.result;
}

for (const url of [BRADBURY_GENLAYER_RPC_URL, BRADBURY_CHAIN_RPC_URL]) {
  const chainIdHex = await rpc(url, "eth_chainId");
  assert.equal(Number.parseInt(chainIdHex, 16), BRADBURY_CHAIN_ID, `${url} returned the wrong chain ID`);
}

const balance = await readBradburyNativeBalanceWei(
  "0x0000000000000000000000000000000000000000",
  fetch,
);
assert.equal(typeof balance, "bigint");
assert.equal(balance >= 0n, true);

console.log("Bradbury RPC smoke passed for GenLayer and direct Chain endpoints.");
