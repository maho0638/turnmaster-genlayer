export const BRADBURY_CHAIN_ID = 4221;

export const BRADBURY_WALLET_NETWORK = Object.freeze({
  chainId: "0x107d",
  chainName: "Genlayer Bradbury Testnet",
  nativeCurrency: Object.freeze({ name: "GEN Token", symbol: "GEN", decimals: 18 }),
  // MetaMask handles standard eth_* requests and transaction broadcast here.
  // genlayer-js continues using its testnetBradbury RPC for Intelligent Contracts.
  rpcUrls: Object.freeze(["https://rpc.testnet-chain.genlayer.com"]),
  blockExplorerUrls: Object.freeze(["https://explorer.testnet-chain.genlayer.com"]),
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
