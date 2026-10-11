import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PUBLIC_TURNMASTER_CONTRACTS } from "../lib/public-contracts.mjs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

test("published contract pointers are real-shaped Bradbury addresses, not jobs", () => {
  assert.ok(PUBLIC_TURNMASTER_CONTRACTS.length >= 2);
  assert.equal(new Set(PUBLIC_TURNMASTER_CONTRACTS.map((address) => address.toLowerCase())).size, PUBLIC_TURNMASTER_CONTRACTS.length);
  for (const address of PUBLIC_TURNMASTER_CONTRACTS) assert.match(address, /^0x[0-9a-f]{40}$/i);
});

test("a clean visitor starts with no fabricated jobs and loads chain-backed records", () => {
  assert.match(page, /useState<Job\[\]>\(\[\]\)/);
  assert.match(page, /PUBLIC_TURNMASTER_CONTRACTS/);
  assert.match(page, /readOnchainJob\(address as Address\)/);
  assert.doesNotMatch(page, /starterJobs|SAMPLE DATA|Add session draft|sample: true|TM-024|TM-023|TM-022|TM-021|TM-020/);
  assert.match(page, /Could not read Bradbury contracts/);
  assert.match(page, /No contract selected/);
  assert.match(page, /className="chain-status-label"/);
  assert.doesNotMatch(page, /className="sample-label"/);
  assert.doesNotMatch(readFileSync(new URL("../app/globals.css", import.meta.url), "utf8"), /\.(?:sample-label|sample-mini|sample-outline)\b/);
  assert.doesNotMatch(readFileSync(new URL("../app/premium.module.css", import.meta.url), "utf8"), /sample-(?:label|mini|outline)/);
});

test("contract registry pointers never contain demo job descriptions, rewards or statuses", () => {
  const pointers = readFileSync(new URL("../lib/public-contracts.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(pointers, /Northstar DAO|320 GEN|status:|reward:|criteria:/);
});


test("real contracts are re-polled, without a Snap-only wallet dependency", () => {
  assert.match(page, /setInterval\(\(\) => \{ void refreshFromChain\(\); \}, 45_000\)/);
  assert.doesNotMatch(page, /\.connect\("testnetBradbury"\)|wallet_getSnaps|wallet_requestSnaps/);
  const chainSource = readFileSync(new URL("../lib/turnmaster-chain.ts", import.meta.url), "utf8");
  assert.doesNotMatch(chainSource, /\.connect\("testnetBradbury"\)|wallet_getSnaps|wallet_requestSnaps/);
  assert.match(chainSource, /assertBradburyWallet\(input\.provider, input\.walletAddress\)/);
});

test("stale chain records are discarded on read failure and deploy hashes persist", () => {
  assert.match(page, /reconcileVerifiedJobs\(current, live, addresses, !directoryReadFailed\)/);
  assert.match(page, /reconcileVerifiedJobs\(current, \[\], \[\], false\)/);
  assert.match(page, /Bradbury contract read timed out/);
  assert.match(page, /if \(live.length === 0\) \{ setBoardLoadState\(\"error\"\); setSelected\(null\); return; \}/);
  const chainSource = readFileSync(new URL("../lib/turnmaster-chain.ts", import.meta.url), "utf8");
  assert.match(chainSource, /return \{ address, tx:/);
  assert.match(chainSource, /throw new SubmittedTransactionError\(hash, error\)/);
  const readiness = readFileSync(new URL("../lib/deploy-readiness.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(readiness, /browser-only draft/);
});

test("pending deployment is recovered on-chain, not blindly cleared", () => {
  assert.match(page, /recoverPendingDeployment/);
  assert.match(page, /inspectSubmittedDeployment\(pendingDeployHash, walletAddress\)/);
  assert.doesNotMatch(page, /Explorer confirms failure — allow retry/);
  const workflow = readFileSync(new URL("../app/contract-workflow.tsx", import.meta.url), "utf8");
  assert.match(workflow, /clearFailedTransaction/);
  assert.match(workflow, /status !== "failed"/);
  assert.doesNotMatch(workflow, /Clear only if Explorer shows failure/);
});
