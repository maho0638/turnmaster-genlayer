import assert from "node:assert/strict";
import test from "node:test";
import { getDeployReadiness } from "../lib/deploy-readiness.mjs";

const base = {
  walletConnected: true,
  wrongNetwork: false,
  balanceError: false,
  nativeBalance: "1.2",
  pendingHash: "",
  releaseFee: "0",
  feeRecipientConfigured: false,
};

test("deployment works with a funded Bradbury wallet and 0% release fee", () => {
  assert.equal(getDeployReadiness(base).kind, "ready");
});

test("missing wallet is explained instead of silently disabling the button", () => {
  const result = getDeployReadiness({ ...base, walletConnected: false });
  assert.equal(result.kind, "wallet");
  assert.match(result.message, /connect a wallet/i);
  assert.match(result.message, /verified by reading Bradbury contracts/i);
});

test("wrong network remains blocked before wallet approval", () => {
  assert.equal(getDeployReadiness({ ...base, wrongNetwork: true }).kind, "network");
});

test("unavailable RPC and unverified balances remain safe", () => {
  assert.equal(getDeployReadiness({ ...base, balanceError: true }).kind, "rpc");
  assert.equal(getDeployReadiness({ ...base, nativeBalance: null }).kind, "checking");
  assert.equal(getDeployReadiness({ ...base, nativeBalance: undefined }).kind, "checking");
  assert.equal(getDeployReadiness({ ...base, nativeBalance: "not-a-number" }).kind, "funds");
});

test("zero native testnet GEN explains how to obtain network fees", () => {
  assert.equal(getDeployReadiness({ ...base, nativeBalance: "0" }).kind, "funds");
  assert.equal(getDeployReadiness({ ...base, nativeBalance: "0.000000000000000000" }).kind, "funds");
  assert.equal(getDeployReadiness({ ...base, nativeBalance: "-1" }).kind, "funds");
});

test("unconfigured fee recipient requires a zero-fee job", () => {
  assert.equal(getDeployReadiness({ ...base, releaseFee: "1.5" }).kind, "fee");
  assert.equal(getDeployReadiness({ ...base, releaseFee: "1.5", feeRecipientConfigured: true }).kind, "ready");
});

test("unverified prior deployment takes precedence and cannot be resent", () => {
  assert.equal(getDeployReadiness({ ...base, pendingHash: "0x" + "a".repeat(64) }).kind, "pending");
  assert.equal(getDeployReadiness({ ...base, walletConnected: false, pendingHash: "0x" + "a".repeat(64) }).kind, "pending");
});
