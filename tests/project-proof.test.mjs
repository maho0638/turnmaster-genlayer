import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("project proof manifest exposes the public reviewer surface", () => {
  const proof = JSON.parse(read("public/project-proof.json"));
  assert.equal(proof.name, "TurnMaster");
  assert.equal(proof.network.chainId, 4221);
  assert.equal(proof.network.rpc, "https://rpc-bradbury.genlayer.com");
  assert.equal(proof.production, "https://turnmaster-genlayer.vercel.app");
  assert.equal(proof.reviewerProof, "https://turnmaster-genlayer.vercel.app/reviewer");
  assert.ok(proof.contract.consensusPrimitives.includes("gl.nondet.web.get"));
  assert.ok(proof.contract.consensusPrimitives.includes("gl.eq_principle.prompt_comparative"));
  assert.ok(proof.lifecycle.length >= 8);
  assert.ok(proof.automatedEvidence.length >= 8);
});

test("reviewer page covers GenLayer differentiation and the full lifecycle", () => {
  const page = read("app/reviewer/page.tsx");
  for (const phrase of ["WHY THIS NEEDS GENLAYER", "FULL LIFECYCLE", "CONSENSUS PATH", "SAFETY & CORRECTNESS", "VERIFIABLE ARTIFACTS", "REVIEW WALKTHROUGH", "EXPECTED RESULT"]) {
    assert.ok(page.includes(phrase), `missing reviewer phrase: ${phrase}`);
  }
  assert.ok(page.includes("gl.nondet.web.get"));
  assert.ok(page.includes("gl.eq_principle.prompt_comparative"));
});

test("portal submission document contains every required reviewer field", () => {
  const submission = read("PORTAL_SUBMISSION.md");
  for (const heading of ["## Project name", "## One-sentence summary", "## Description", "## Demo URL", "## GitHub", "## How to use / review steps", "## Expected verification result", "## Evidence and supporting information"]) {
    assert.ok(submission.includes(heading), `missing portal field: ${heading}`);
  }
  assert.ok(submission.includes("https://turnmaster-genlayer.vercel.app"));
  assert.ok(submission.includes("https://github.com/maho0638/turnmaster-genlayer"));
});

test("reviewer documentation states the final end-to-end limitation instead of overstating it", () => {
  const guide = read("docs/REVIEWER_GUIDE.md");
  const security = read("docs/SECURITY_MODEL.md");
  assert.match(guide, /still required to close the final end-to-end gap/i);
  assert.match(security, /still needs to be demonstrated/i);
});
