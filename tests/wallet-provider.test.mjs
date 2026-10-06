import assert from "node:assert/strict";
import test from "node:test";
import { addGenLayerGasHeadroom, createGenLayerWalletProvider } from "../lib/genlayer-wallet-provider.mjs";

test("GenLayer outer EVM transactions receive bounded Bradbury gas headroom", () => {
  assert.equal(addGenLayerGasHeadroom("0x5208"), "0x8340");
  assert.equal(addGenLayerGasHeadroom("0x142a3d"), "0x204395");
  assert.equal(addGenLayerGasHeadroom("0xa13536"), "0xfed260");
  assert.equal(addGenLayerGasHeadroom("0x1000000"), "0xfed260");
  assert.equal(addGenLayerGasHeadroom(undefined), undefined);
});

test("wallet provider adjusts gas only for eth_sendTransaction and does not mutate the SDK request", async () => {
  const calls = [];
  const provider = {
    async request(args) {
      calls.push(args);
      return "0xresult";
    },
  };
  const wrapped = createGenLayerWalletProvider(provider);
  const original = { from: "0x1111111111111111111111111111111111111111", gas: "0x5208", value: "0x0" };

  const result = await wrapped.request({ method: "eth_sendTransaction", params: [original] });
  assert.equal(result, "0xresult");
  assert.equal(original.gas, "0x5208");
  assert.equal(calls[0].params[0].gas, "0x8340");

  await wrapped.request({ method: "eth_getBalance", params: [original.from, "latest"] });
  assert.equal(calls[1].method, "eth_getBalance");
  assert.deepEqual(calls[1].params, [original.from, "latest"]);
});
