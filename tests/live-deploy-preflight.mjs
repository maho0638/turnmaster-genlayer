import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { createGenLayerWalletProvider } from "../lib/genlayer-wallet-provider.mjs";

const RPC = "https://rpc-bradbury.genlayer.com";
const ZERO = "0x0000000000000000000000000000000000000000";

async function rpc(method, params = []) {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    const error = new Error(`${method} failed: ${JSON.stringify(payload.error ?? { status: response.status })}`);
    error.rpcError = payload.error;
    throw error;
  }
  return payload.result;
}

async function findFundedSender() {
  let blockHex = await rpc("eth_blockNumber");
  let block = BigInt(blockHex);
  for (let i = 0; i < 40 && block >= 0n; i++, block--) {
    const record = await rpc("eth_getBlockByNumber", [`0x${block.toString(16)}`, true]);
    for (const tx of record?.transactions ?? []) {
      if (!tx?.from) continue;
      try {
        const balance = BigInt(await rpc("eth_getBalance", [tx.from, "latest"]));
        if (balance > 10n ** 18n) return tx.from;
      } catch {}
    }
  }
  throw new Error("Could not find a funded public sender for read-only preflight.");
}

const account = await findFundedSender();
const source = await fs.readFile(new URL("../contracts/TurnMasterEscrow.py", import.meta.url), "utf8");
const deadline = BigInt(Math.floor(Date.now() / 1000) + 86_400);
let captured;

const forwardProvider = {
  async request({ method, params = [] }) {
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "eth_sendTransaction") {
      captured = params?.[0];
      const stop = new Error("TURNMASTER_PREFLIGHT_CAPTURED");
      stop.code = -32099;
      throw stop;
    }
    return rpc(method, params);
  },
};

const provider = createGenLayerWalletProvider(forwardProvider);
const client = createClient({
  chain: testnetBradbury,
  account,
  provider,
});

try {
  await client.deployContract({
    code: source,
    args: [
      "TurnMaster live preflight",
      "Read-only Bradbury deployment preflight for TurnMaster transaction compatibility.",
      "A contract deployment request that is never broadcast.",
      JSON.stringify(["The preflight must reach live gas estimation without broadcasting any transaction."]),
      "Public URL",
      deadline,
      1_000_000_000_000_000_000n,
      0,
      ZERO,
    ],
  });
  throw new Error("Preflight unexpectedly completed instead of stopping before broadcast.");
} catch (error) {
  if (!captured) throw error;
  if (!String(error?.message ?? error).includes("TURNMASTER_PREFLIGHT_CAPTURED")) throw error;
}

assert.equal(captured.to?.toLowerCase(), testnetBradbury.consensusMainContract.address.toLowerCase());
assert.ok(BigInt(captured.gas) <= 16_700_000n, "Wallet gas must stay below the Bradbury transaction cap.");
assert.equal(captured.from?.toLowerCase(), account.toLowerCase());

const callTx = { ...captured };
delete callTx.nonce;
delete callTx.chainId;
delete callTx.type;

let estimate;
let callResult;
try {
  estimate = await rpc("eth_estimateGas", [callTx]);
  assert.ok(BigInt(estimate) <= 16_700_000n, "Live deployment estimate must fit below the Bradbury safety cap.");
} catch (error) {
  console.error("PREFLIGHT_ESTIMATE_ERROR", error.message);
  throw error;
}

console.log("PREFLIGHT_LIVE_ESTIMATE", estimate);
console.log("PREFLIGHT_WALLET_VALUE", captured.value);
console.log("PREFLIGHT_WALLET_GAS", captured.gas);
console.log("PREFLIGHT_WALLET_GAS_PRICE", captured.gasPrice ?? null);

try {
  callResult = await rpc("eth_call", [callTx, "latest"]);
} catch (error) {
  console.error("PREFLIGHT_CALL_ERROR", error.message);
  throw error;
}

console.log(JSON.stringify({
  account,
  to: captured.to,
  value: captured.value,
  gasSentToWallet: captured.gas,
  liveEstimate: estimate,
  ethCallResult: callResult,
  dataBytes: Math.max(0, (captured.data.length - 2) / 2),
}, null, 2));
console.log("TurnMaster live deploy preflight passed without broadcasting a transaction.");
