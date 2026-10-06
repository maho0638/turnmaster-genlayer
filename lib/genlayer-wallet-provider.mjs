const TRANSACTION_GAS_HEADROOM_BPS = 20_000n;

export function addGenLayerGasHeadroom(gasHex) {
  if (typeof gasHex !== "string" || !/^0x[0-9a-f]+$/i.test(gasHex)) return gasHex;
  const gas = BigInt(gasHex);
  if (gas === 0n) return gasHex;
  const padded = (gas * TRANSACTION_GAS_HEADROOM_BPS + 9_999n) / 10_000n;
  return `0x${padded.toString(16)}`;
}

export function createGenLayerWalletProvider(provider) {
  if (!provider || typeof provider.request !== "function") {
    throw new Error("A valid EIP-1193 provider is required.");
  }

  return {
    request: async ({ method, params }) => {
      if (method !== "eth_sendTransaction" || !Array.isArray(params) || params.length === 0) {
        return provider.request({ method, params });
      }

      const [candidate, ...rest] = params;
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        return provider.request({ method, params });
      }

      const transaction = { ...candidate };
      if (typeof transaction.gas === "string") {
        transaction.gas = addGenLayerGasHeadroom(transaction.gas);
      }

      return provider.request({ method, params: [transaction, ...rest] });
    },
    ...(typeof provider.on === "function" ? { on: provider.on.bind(provider) } : {}),
    ...(typeof provider.removeListener === "function" ? { removeListener: provider.removeListener.bind(provider) } : {}),
  };
}
