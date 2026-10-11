import assert from "node:assert/strict";
import test from "node:test";
import { directoryReadPlan, isValidOnchainJob, normalizeDirectoryAddresses } from "../lib/job-directory.mjs";

const A = "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482";
const B = "0x1111111111111111111111111111111111111111";

test("public directory results retain valid unique addresses only", () => {
  assert.deepEqual(normalizeDirectoryAddresses([A, A.toLowerCase(), "bad", B, null]), [A, B]);
  assert.deepEqual(normalizeDirectoryAddresses({ addresses: [A] }), []);
});

test("board fetch is bounded to the latest 100 directory entries", () => {
  assert.deepEqual(directoryReadPlan(0), []);
  assert.deepEqual(directoryReadPlan(4), [{ offset: 0, limit: 4 }]);
  assert.deepEqual(directoryReadPlan(4_000), [{ offset: 0, limit: 100 }]);
  assert.throws(() => directoryReadPlan(-1), /Invalid directory count/);
});

const validJob = {
  client: A,
  worker: B,
  title: "Valid work item",
  description: "A complete job description.",
  delivery_definition: "A public report link.",
  acceptance_criteria: ["The report contains the required checked result."],
  proof_type: "Public URL",
  deadline: 1_800_000_000,
  reward_wei: "1000000000000000000",
  commission_bps: 0,
  status: "open",
  funded: false,
  revision_count: 0,
  decision: "{}",
  payout_queued: false,
  escrow_wei: "0",
  delivery: { description: "", evidence_urls: [] },
  dispute: {
    reason: "", evidence_deadline: 0, recovery_deadline: 0,
    client_responded: false, worker_responded: false, retry_count: 0,
    round: 0, client_evidence_urls: [], worker_evidence_urls: [],
  },
};

test("on-chain job reader rejects malformed values before UI rendering", () => {
  assert.equal(isValidOnchainJob(validJob), true);
  for (const candidate of [
    { ...validJob, acceptance_criteria: null },
    { ...validJob, client: "not-an-address" },
    { ...validJob, reward_wei: "not-a-number" },
    { ...validJob, delivery: { description: "", evidence_urls: null } },
    { ...validJob, dispute: { reason: "", client_evidence_urls: null } },
  ]) assert.equal(isValidOnchainJob(candidate), false);
});
