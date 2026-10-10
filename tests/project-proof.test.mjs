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
  assert.match(guide, /seven-day timeout refund/i);
  assert.match(security, /remaining live gap is the \*\*seven-day full-refund transition\*\*/i);
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

test("premium dashboard keeps a high-contrast TurnMaster brand and dark verification UI", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  const premium = read("app/premium.module.css");
  assert.ok(page.includes('className="brand-wordmark"'));
  assert.ok(page.includes('className="brand-turn">Turn'));
  assert.ok(page.includes('className="brand-master">Master'));
  assert.ok(premium.includes(".brand-turn"));
  assert.ok(premium.includes("color:#f5f9ff!important"));
  assert.ok(premium.includes(".brand-master"));
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
  assert.ok(page.includes("workspaceAutoCloseRef"));
  assert.ok(page.includes("onMouseLeave={scheduleWorkspaceAutoClose}"));
  assert.ok(page.includes("window.setTimeout(() =>"));
  assert.ok(page.includes('event.key === "Escape"'));
  assert.ok(page.includes('document.addEventListener("pointerdown", onPointerDown)'));
  assert.ok(page.includes('aria-haspopup="menu"'));
  assert.ok(page.includes('role="menu"'));
  assert.ok(page.includes(">Reviewer proof<"));
  assert.ok(page.includes(">Open contract<"));
  assert.ok(premium.includes(".workspace-menu-shell"));
  assert.ok(premium.includes(".workspace-chevron-open"));
  assert.ok(page.includes("workspace-menu-item-active"));
  assert.ok(page.includes("workspace-menu-chain"));
  assert.ok(premium.includes(".workspace-menu-topline"));
  assert.ok(premium.includes(".workspace-menu-item-icon"));
});


test("status filter is a readable custom menu instead of the native select", () => {
  const page = read("app/page.tsx");
  const premium = read("app/premium.module.css");
  assert.ok(page.includes("statusFilterOpen"));
  assert.ok(page.includes('aria-label="Status filters"'));
  assert.ok(page.includes('role="menuitemradio"'));
  assert.ok(page.includes("status-filter-option-active"));
  assert.ok(!page.includes('<select value={activeStatus}'));
  assert.ok(premium.includes(".status-filter-menu"));
  assert.ok(premium.includes("color:#c8daea!important"));
});

test("release fee summary card opens a real policy dialog", () => {
  const page = read("app/page.tsx");
  const premium = read("app/premium.module.css");
  const css = read("app/globals.css");
  assert.ok(page.includes('aria-label="Open release fee policy"'));
  assert.ok(page.includes("setFeePolicyOpen(true)"));
  assert.ok(page.includes("Release fee policy"));
  assert.ok(page.includes("Refunds are charged 0%."));
  assert.ok(premium.includes(".summary-action-card"));
  assert.ok(css.includes(".fee-policy-body"));
});


test("live contract card contains long addresses and preserves dark hover contrast", () => {
  const workflow = read("app/contract-workflow.tsx");
  const premium = read("app/premium.module.css");
  assert.ok(workflow.includes('className="contract-address-link"'));
  assert.ok(workflow.includes('className="chain-proof-actions"'));
  assert.ok(workflow.includes('className="chain-secondary-action chain-native-action"'));
  assert.ok(workflow.includes('className="primary-action"'));
  assert.ok(premium.includes("Live contract overflow + hover contrast hardening"));
  assert.ok(premium.includes("word-break:break-all!important"));
  assert.ok(premium.includes(".chain-actions .chain-secondary-action:hover"));
  assert.ok(premium.includes("background:#123b61!important"));
  assert.ok(premium.includes(".chain-proof-actions button:hover"));
  assert.ok(premium.includes("color:#ffffff!important"));
});


test("live contract modal keeps readable hover states and a two-column proof grid", () => {
  const css = read("app/globals.css");
  assert.ok(css.includes("Live Contract narrow-panel layout + portal-safe contrast"));
  assert.ok(css.includes(".detail-dialog .chain-proof-grid"));
  assert.ok(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))!important"));
  assert.ok(css.includes(".detail-dialog .chain-actions .chain-secondary-action:hover"));
  assert.ok(css.includes("background:#123b61!important"));
  assert.ok(css.includes("color:#fff!important"));
  assert.ok(css.includes("white-space:normal!important"));
  assert.ok(css.includes("overflow-wrap:anywhere!important"));
});


test("secondary Live Contract actions do not inherit the shared primary Button hover", () => {
  const workflow = read("app/contract-workflow.tsx");
  const css = read("app/globals.css");
  assert.ok(workflow.includes('className="chain-secondary-action chain-native-action"'));
  assert.ok(workflow.includes('? <Button key={item} type="button" className="primary-action"'));
  assert.ok(css.includes(".chain-secondary-action{border:1px solid #315b7e!important;background:#0a2946!important"));
  assert.ok(css.includes(".chain-secondary-action:hover,.chain-secondary-action:focus-visible"));
  assert.ok(css.includes("background:#123b61!important"));
  assert.ok(css.includes(".chain-native-action{appearance:none;font:inherit}"));
});

test("Live Contract proof summary uses two columns and never ellipsizes role or status", () => {
  const css = read("app/globals.css");
  const premium = read("app/premium.module.css");
  assert.ok(css.includes(".chain-proof-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))"));
  assert.ok(css.includes("white-space:normal;overflow-wrap:anywhere;line-height:1.25"));
  assert.ok(premium.includes("grid-template-columns:repeat(2,minmax(0,1fr))!important"));
  assert.ok(premium.includes("white-space:normal!important"));
  assert.ok(premium.includes("text-overflow:clip!important"));
  assert.ok(!premium.includes("white-space:nowrap!important;\n  color:#f1f7fd!important;"));
});


test("processing transaction dialog can always close from the X button", () => {
  const workflow = read("app/contract-workflow.tsx");
  assert.ok(workflow.includes('onOpenChange={(open) => { if (!open) setAction(null); }}'));
  assert.ok(!workflow.includes('if (!open && !busy) setAction(null)'));
});

test("topbar wallet chevron opens a real accessible wallet menu", () => {
  const page = read("app/page.tsx");
  const premium = read("app/premium.module.css");
  assert.ok(page.includes("walletMenuOpen"));
  assert.ok(page.includes('aria-haspopup="menu"'));
  assert.ok(page.includes('aria-label="Wallet menu"'));
  assert.ok(page.includes("Refresh balance"));
  assert.ok(page.includes("Copy address"));
  assert.ok(page.includes("Open in Explorer"));
  assert.ok(page.includes("walletMenuRef"));
  assert.ok(premium.includes(".wallet-menu-shell"));
  assert.ok(premium.includes(".wallet-menu-actions"));
  assert.ok(premium.includes(".wallet-chevron-open"));
});


test("Bradbury RPC repair button only appears for an actual network or RPC problem", () => {
  const page = read("app/page.tsx");
  assert.ok(page.includes('walletAddress && (wrongNetwork || walletBalanceError || networkRepairBusy)'));
  assert.ok(page.includes('"Fix Bradbury RPC"'));
});

test("steward can click Deploy even without a funded wallet, with safe inline guidance", () => {
  const page = read("app/page.tsx");
  const css = read("app/globals.css");
  assert.ok(page.includes('onClick={createOnchain} disabled={chainBusy}'));
  assert.ok(page.includes('deployReadiness.kind !== "ready"'));
  assert.ok(page.includes('if (!walletAddress || !walletProvider)'));
  assert.ok(page.includes('if (wrongNetwork)'));
  assert.ok(page.includes('if (Number(walletBalance) <= 0)'));
  assert.ok(page.includes('role="status" aria-live="polite"'));
  assert.ok(page.includes('onClick={connectWallet}>Connect wallet'));
  assert.ok(page.includes('href="https://testnet-faucet.genlayer.foundation/"'));
  assert.ok(page.includes('View a finalized Bradbury deployment'));
  assert.ok(css.includes('.deploy-readiness-blocked'));
});
