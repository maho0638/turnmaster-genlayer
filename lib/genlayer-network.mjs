export const BRADBURY_CHAIN_ID = 4221;

export const BRADBURY_WALLET_NETWORK = Object.freeze({
  chainId: "0x107d",
  chainName: "Genlayer Bradbury Testnet",
  nativeCurrency: Object.freeze({ name: "GEN Token", symbol: "GEN", decimals: 18 }),
  // GenLayer's Bradbury RPC supports both Intelligent Contract and standard eth_* wallet calls.
  rpcUrls: Object.freeze(["https://rpc-bradbury.genlayer.com"]),
  blockExplorerUrls: Object.freeze(["https://explorer-bradbury.genlayer.com"]),
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
