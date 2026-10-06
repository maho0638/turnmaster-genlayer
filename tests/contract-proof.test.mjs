import assert from "node:assert/strict";
import test from "node:test";
import { buildContractProofReceipt, buildContractShareUrl, decisionOutcome } from "../lib/contract-proof.mjs";

const ADDRESS = "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482";

test("share links are portable and contract-address based", () => {
  assert.equal(buildContractShareUrl("https://turnmaster-genlayer.vercel.app/", ADDRESS), `https://turnmaster-genlayer.vercel.app/?contract=${ADDRESS}`);
  assert.throws(() => buildContractShareUrl("https://turnmaster-genlayer.vercel.app", "bad"), /valid contract address/i);
});

test("proof receipt summarizes public chain state without inventing evidence", () => {
  const receipt = buildContractProofReceipt(ADDRESS, {
    status: "delivered",
    client: "0x1111111111111111111111111111111111111111",
    worker: "0x2222222222222222222222222222222222222222",
    deadline: 1800000000,
    reward_wei: "1000000000000000000",
    escrow_wei: "1000000000000000000",
    acceptance_criteria: ["A", "B"],
    delivery: { evidence_urls: ["https://example.org/proof"] },
    revision_count: 1,
    decision: "",
  });
  assert.equal(receipt.schema, "turnmaster-proof-v1");
  assert.equal(receipt.criteriaCount, 2);
  assert.equal(receipt.evidenceCount, 1);
  assert.equal(receipt.decisionOutcome, null);
  assert.equal(receipt.contractAddress, ADDRESS);
});

test("decision outcome parser is conservative", () => {
  assert.equal(decisionOutcome('{"outcome":"release_to_worker"}'), "release_to_worker");
  assert.equal(decisionOutcome("{bad"), null);
  assert.equal(decisionOutcome(""), null);
});
