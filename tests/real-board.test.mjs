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
});

test("contract registry pointers never contain demo job descriptions, rewards or statuses", () => {
  const pointers = readFileSync(new URL("../lib/public-contracts.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(pointers, /Northstar DAO|320 GEN|status:|reward:|criteria:/);
});
