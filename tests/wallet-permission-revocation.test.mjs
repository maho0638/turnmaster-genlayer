import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { revokeWalletSitePermission } from "../lib/bradbury-wallet.mjs";

const account = "0x1111111111111111111111111111111111111111";

function fakeWallet({ revokeError = null, remaining = [], accountsError = null, malformed = false } = {}) {
  const calls = [];
  const provider = {
    async request(args) {
      calls.push(args);
      if (args.method === "wallet_revokePermissions") {
        assert.deepEqual(args.params, [{ eth_accounts: {} }]);
        if (revokeError) throw revokeError;
        return null;
      }
      if (args.method === "eth_accounts") {
        if (accountsError) throw accountsError;
        return malformed ? {} : remaining;
      }
      throw new Error("Unexpected wallet RPC: " + args.method);
    }
  };
  return { provider, calls };
}

test("revocation is verified by an empty eth_accounts response, without Snaps or transactions", async () => {
  const { provider, calls } = fakeWallet();
  assert.deepEqual(await revokeWalletSitePermission(provider), { status: "revoked" });
  assert.deepEqual(calls.map(x => x.method), ["wallet_revokePermissions", "eth_accounts"]);
  assert.equal(calls.some(x => /snap|sendTransaction/i.test(x.method)), false);
});

test("wallet claiming revocation but retaining account access is not treated as disconnected", async () => {
  const wallet = fakeWallet({ remaining: [account] });
  assert.deepEqual(await revokeWalletSitePermission(wallet.provider), { status: "still_authorized" });
});

test("user-declined MetaMask permission revocation remains a visible warning state", async () => {
  const wallet = fakeWallet({ revokeError: Object.assign(new Error("User rejected"), { code: 4001 }), remaining: [account] });
  assert.deepEqual(await revokeWalletSitePermission(wallet.provider), { status: "rejected" });
  assert.equal(wallet.calls.length, 2);
});

test("unsupported permission RPC does not become a false success", async () => {
  for (const code of [-32601, 4200]) {
    const wallet = fakeWallet({ revokeError: Object.assign(new Error("Unsupported method"), { code }), remaining: [account] });
    assert.deepEqual(await revokeWalletSitePermission(wallet.provider), { status: "unsupported" });
  }
});

test("wallet internal errors, unverifiable responses and rejected account read are not successful revokes", async () => {
  assert.deepEqual(
    await revokeWalletSitePermission(fakeWallet({ revokeError: Object.assign(new Error("Wallet unavailable"), { code: -32603 }), remaining: [account] }).provider),
    { status: "failed" }
  );
  assert.deepEqual(await revokeWalletSitePermission(fakeWallet({ malformed: true }).provider), { status: "unverified" });
  assert.deepEqual(await revokeWalletSitePermission(fakeWallet({ accountsError: new Error("Provider unavailable") }).provider), { status: "unverified" });
});

test("already missing eth_accounts access counts as verified disconnected despite unavailable revocation RPC", async () => {
  const wallet = fakeWallet({ revokeError: Object.assign(new Error("Unsupported method"), { code: -32601 }), remaining: [] });
  assert.deepEqual(await revokeWalletSitePermission(wallet.provider), { status: "revoked" });
});

test("no wallet provider fails closed; connected-site permission never assumed revoked", async () => {
  await assert.rejects(revokeWalletSitePermission(null), /provider/i);
});

test("Disconnect wallet UI calls permission helper, reports retained access, and prevents reconnect race", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const result = await revokeWalletSitePermission\(provider\)/);
  assert.match(page, /if \(result\.status === "revoked"\)/);
  assert.match(page, /result\.status === "still_authorized"/);
  assert.match(page, /result\.status === "unsupported"/);
  assert.match(page, /result\.status === "rejected"/);
  assert.match(page, /setDisconnectPermissionWarning\(true\)/);
  assert.match(page, /if \(walletDisconnectBusy\)/);
  assert.doesNotMatch(page, /wallet_getSnaps|wallet_requestSnaps/);
});
