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
  assert.ok(proof.automatedEvidence.length >= 11);
  assert.equal(proof.verifiedDeployment.status, "FINALIZED");
  assert.equal(proof.verifiedDeployment.address, "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482");
  assert.equal(proof.verifiedDeployment.transaction, "0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403");
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
  assert.match(guide, /remaining end-to-end gap is the complete multi-wallet lifecycle/i);
  assert.match(security, /remaining live gap is exercising the full multi-wallet/i);
});

test("transient information notices auto-dismiss", () => {
  const page = read("app/page.tsx");
  assert.ok(page.includes('window.setTimeout(() => setNotice(""), 5_000)'));
  assert.ok(page.includes("window.clearTimeout(timer)"));
});

test("reviewer proof links the finalized Bradbury deployment", () => {
  const page = read("app/reviewer/page.tsx");
  assert.ok(page.includes("0xAA85A41F899ED569d32B4CF0FDA2C55461d94482"));
  assert.ok(page.includes("0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403"));
  assert.ok(page.includes("FINALIZED DEPLOYMENT"));
});

test("premium dashboard keeps the TurnMaster logo and dark verification UI", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  assert.ok(page.includes("/turnmaster-logo.webp"));
  assert.ok(page.includes("premium-hero"));
  assert.ok(page.includes("hero-globe"));
  assert.ok(page.includes("detail-tabs"));
  assert.ok(css.includes("TurnMaster Premium Dark UI"));
  assert.ok(css.includes(".verified-mini"));
  assert.ok(css.includes(".hero-globe"));
});

test("wallet notices auto-dismiss and dark dialog outline buttons remain readable", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  assert.ok(page.includes('window.setTimeout(() => setWalletMessage(""), delay)'));
  assert.ok(page.includes("wrongNetwork || walletBalanceError ? 12_000 : 5_000"));
  assert.ok(css.includes('data-variant="outline"'));
  assert.ok(css.includes("background:#0a2946!important"));
  assert.ok(css.includes("color:#dce9f7!important"));
  assert.ok(css.includes('[data-slot="dialog-close"]'));
});

test("wallet session silently restores after refresh and modal controls have explicit contrast", () => {
  const page = read("app/page.tsx");
  const workflow = read("app/contract-workflow.tsx");
  assert.ok(page.includes('method: "eth_accounts"'));
  assert.ok(page.includes('method: "eth_chainId"'));
  assert.ok(page.includes("setWalletProvider(provider)"));
  assert.ok(page.includes("Connected wallet restored."));
  assert.ok(page.includes('backgroundColor: "#0a2946"'));
  assert.ok(page.includes('style={modalSecondaryStyle} onClick={() => setDetailOpen(false)}>Close'));
  assert.ok(workflow.includes('style={modalSecondaryStyle} disabled={busy}'));
});

test("workspace selector opens a functional navigation menu", () => {
  const page = read("app/page.tsx");
  const premium = read("app/premium.module.css");
  assert.ok(page.includes("workspaceMenuOpen"));
  assert.ok(page.includes("workspaceMenuRef"));
  assert.ok(page.includes('event.key === "Escape"'));
  assert.ok(page.includes('document.addEventListener("pointerdown", onPointerDown)'));
  assert.ok(page.includes('aria-haspopup="menu"'));
  assert.ok(page.includes('role="menu"'));
  assert.ok(page.includes(">Reviewer proof<"));
  assert.ok(page.includes(">Open contract<"));
  assert.ok(premium.includes(".workspace-menu-shell"));
  assert.ok(premium.includes(".workspace-chevron-open"));
});
