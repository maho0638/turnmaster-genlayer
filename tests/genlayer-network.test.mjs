import assert from "node:assert/strict";
import test from "node:test";
import { testnetBradbury } from "genlayer-js/chains";
import { BRADBURY_CHAIN_ID, BRADBURY_WALLET_NETWORK, formatWeiGen, isEvmAddress } from "../lib/genlayer-network.mjs";

test("wallet and SDK use the official GenLayer Bradbury RPC", () => {
  assert.equal(testnetBradbury.id, BRADBURY_CHAIN_ID);
  assert.equal(Number.parseInt(BRADBURY_WALLET_NETWORK.chainId, 16), testnetBradbury.id);
  assert.equal(BRADBURY_WALLET_NETWORK.chainName, testnetBradbury.name);
  assert.deepEqual(BRADBURY_WALLET_NETWORK.rpcUrls, ["https://rpc-bradbury.genlayer.com"]);
  assert.deepEqual(testnetBradbury.rpcUrls.default.http, ["https://rpc-bradbury.genlayer.com"]);
  assert.deepEqual(BRADBURY_WALLET_NETWORK.rpcUrls, testnetBradbury.rpcUrls.default.http);
  assert.equal(BRADBURY_WALLET_NETWORK.nativeCurrency.symbol, testnetBradbury.nativeCurrency.symbol);
  assert.equal(BRADBURY_WALLET_NETWORK.nativeCurrency.decimals, testnetBradbury.nativeCurrency.decimals);
  assert.equal(BRADBURY_WALLET_NETWORK.blockExplorerUrls[0], "https://explorer-bradbury.genlayer.com");
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
