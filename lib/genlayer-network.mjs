export const BRADBURY_CHAIN_ID = 4221;
export const BRADBURY_GENLAYER_RPC_URL = "https://rpc-bradbury.genlayer.com";
export const BRADBURY_CHAIN_RPC_URL = "https://rpc.testnet-chain.genlayer.com";
export const BRADBURY_GENLAYER_EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
export const BRADBURY_CHAIN_EXPLORER_URL = "https://explorer.testnet-chain.genlayer.com";

export const BRADBURY_WALLET_NETWORK = Object.freeze({
  chainId: "0x107d",
  chainName: "Genlayer Bradbury Testnet",
  nativeCurrency: Object.freeze({ name: "GEN Token", symbol: "GEN", decimals: 18 }),
  // GenLayer's current network docs explicitly say wallets should connect to
  // the GenLayer RPC. It handles Intelligent Contract traffic and proxies eth_*.
  rpcUrls: Object.freeze([BRADBURY_GENLAYER_RPC_URL]),
  blockExplorerUrls: Object.freeze([BRADBURY_GENLAYER_EXPLORER_URL]),
});

export function formatWeiGen(wei) {
  const digits = wei.padStart(19, "0");
  const whole = digits.slice(0, -18).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-18).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function isEvmAddress(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export async function readBradburyNativeBalanceWei(address, fetchImpl = globalThis.fetch) {
  if (!isEvmAddress(address)) throw new Error("A valid wallet address is required.");
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this environment.");

  const response = await fetchImpl(BRADBURY_GENLAYER_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });

  if (!response?.ok) {
    throw new Error(`Bradbury RPC returned HTTP ${response?.status ?? "unknown"}.`);
  }

  const payload = await response.json();
  if (payload?.error) {
    const detail = typeof payload.error?.message === "string" ? payload.error.message : "JSON-RPC error";
    throw new Error(`Bradbury RPC rejected eth_getBalance: ${detail}`);
  }
  if (typeof payload?.result !== "string" || !/^0x[\da-f]+$/i.test(payload.result)) {
    throw new Error("Bradbury RPC returned an invalid native GEN balance.");
  }

  return BigInt(payload.result);
}
