# TurnMaster QA report

Date: 2026-10-06

## Verified locally and on the deployed app

| Check | Result | Evidence / limits |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed without findings. |
| TypeScript | PASS | `npx tsc --noEmit` completed without errors. |
| Production build | PASS | `npm run build` completed. Contract controls and GenLayer SDK are split from the initial board bundle. Vinext still emits its static route-classification advisory. |
| GenLayer contract direct-mode suite | PASS | `HOME=/tmp/turnmaster-gltest-home python -m pytest tests/test_contract_direct.py -q` — 19 passed. |
| Bradbury network config unit test | PASS | MetaMask and `testnetBradbury` are locked to `https://rpc-bradbury.genlayer.com`; native-GEN reads are independent; bounded gas headroom is capped at 16,700,000. |
| Contract source publication check | PASS | The publication test confirms the browser-served Python source is byte-identical to `contracts/TurnMasterEscrow.py`. |
| Vercel production deployment | PASS | The current production build reached `READY`; production alias `turnmaster-genlayer.vercel.app` is attached and the work board loaded in a browser. No wallet transaction was submitted during verification. |
| Deterministic contract rules | PASS | Creation validation, empty/vague criteria, zero/negative reward, exact funding, client/worker roles, deadline-late funding and delivery, revision, acceptance, cancellation, and settlement idempotency. |
| Dispute contract behavior | PASS (local mocks) | Party-only dispute resolution, exact frozen-criteria matching, readable decision explanations, malformed/conflicting outcomes, retrievable and unavailable evidence, no payout on `undetermined`, and no second evaluation after the dispute is terminal. Evidence retrieval and evaluator responses are mocked by the local VM. |
| SDK/network references | PASS (configuration) | Wallet and SDK follow the Bradbury GenLayer RPC. The direct Chain RPC is diagnostic-only. TurnMaster compensates for estimate-edge failures without exceeding Bradbury's 16,777,216 current per-transaction gas ceiling. |
| GenLayer SDK | PASS | Lockfile uses stable `genlayer-js` `1.2.0`; the app uses `testnetBradbury`, finalized receipts, and the SDK's EVM gas estimation before wallet approval. |
| Reviewer proof / Portal evidence | PASS | Dedicated `/reviewer` route, Portal submission copy, reviewer guide, architecture, security model, machine-readable proof manifest, and a Node regression test cover all required review fields without claiming an unverified signed lifecycle. |

The direct-mode tests run against a local VM with public evidence and model responses mocked. They do not establish validator consensus, live RPC behavior, wallet signing, gas/protocol fees, queued transfer finalization, or a real Explorer receipt.

## Screenshot and transaction-flow diagnosis

The 2026-10-06 browser screenshots show two successive failure modes. First, an older TurnMaster build configured MetaMask with the direct Chain RPC; that was corrected to the official Bradbury GenLayer RPC. After that correction MetaMask successfully opened a Bradbury ConsensusMain transaction request, showed GenLayer Wallet fee insights, and TurnMaster verified 105 native GEN, but the outer transaction still failed.

The remaining failure was reproduced without spending GEN by a live deploy preflight. The original TurnMaster contract required roughly 17.27M gas, already above Bradbury's current 16,777,216 per-transaction ceiling. The temporary 2× gas headroom made the submitted limit even larger, guaranteeing rejection. The contract was compacted while preserving the tested escrow/dispute lifecycle. The final live preflight estimated 10,608,123 gas, bounded the wallet request to 16,700,000 gas, and a live `eth_call` of that exact capped transaction succeeded with `0x`. The preflight intercepts `eth_sendTransaction`, so it does not broadcast or spend GEN.

The final browser flow therefore uses the official Bradbury RPC, a deployable-size contract, bounded gas headroom below the current chain cap, and the existing duplicate-submission guard.

## Not verified / remaining blockers

- No TurnMaster contract has been deployed from this build. There is no real contract address, transaction hash, escrow balance, or Explorer activity to display.
- The exact deployment transaction now passes a live read-only Bradbury preflight, but a signed deployment has not yet been confirmed after the compact-contract fix. The full `create → fund → deliver → evaluate → release/refund` journey therefore remains incomplete.
- The user's real browser/wallet failures identified both the earlier RPC mistake and the Bradbury transaction-gas ceiling. One successful signed deployment on the corrected build is still needed to close the deployment verification gap.
- The production board was previously loaded in a browser, but wallet-connected end-to-end flows, mobile layout, keyboard-only navigation, 200% zoom, assistive technology, and runtime WebMCP still require manual browser verification.
- Build output has no client chunk size advisory after lazy-loading contract controls and GenLayer transaction modules. Vinext still cannot statically classify the root route and prints its generic route-classification advisory.
- The Git-connected Vercel production build completed successfully. This verifies the deployed Next.js build, not every wallet flow.
- The board has no indexer or shared persistence. User-created contract addresses must be saved by the user and re-imported after refresh; session drafts are intentionally ephemeral.
- A dispute with inaccessible or unverifiable evidence ends as `undetermined` with funds still held. There is no retry/appeal or recovery action for that terminal state.
- A non-zero fee requires `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT`; no recipient is configured in this build. Zero-fee Bradbury jobs can be created.

## Portal submission readiness

The public site now contains a dedicated `/reviewer` route designed for a steward to verify the project quickly without reading the entire repository first. It links directly to the production app, full source, Intelligent Contract, architecture, security model, QA report, public CI history, and official GenLayer network documentation.

`PORTAL_SUBMISSION.md` mirrors the Portal fields visible in the current Project submission form: project name, one-sentence summary, detailed description, demo URL, GitHub URL, exact review steps, expected verification result, optional contract-link guidance, and supporting evidence. The evidence test fails if these required sections or the core GenLayer consensus primitives disappear.

This improves reviewability but does not guarantee a 4,000-point award; scoring remains a steward decision. A real TurnMasterEscrow deployment is finalized on Bradbury at `0xAA85A41F899ED569d32B4CF0FDA2C55461d94482` with deployment transaction `0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403`. The remaining live gap is the later multi-wallet lifecycle, not deployment.

## Release status

The project is a testnet-only application with a GenLayer contract and SDK-backed Bradbury actions. GitHub verification now covers frontend lint/type/build, network unit tests, live public-RPC checks, a no-broadcast live deployment preflight, a built-site HTTP smoke check, and direct-mode contract tests before changes are promoted to `main`. No TurnMaster job contract has yet completed the full live create → fund → deliver → settle journey. It is not ready for real funds and does not provide legal arbitration.


## Pro upgrade verification

The upgrade branch adds portable contract deep links (`?contract=0x…`), a public-state audit receipt, role/status/evidence verification controls, a finalized deployment proof block for reviewers, official GenVM contract linting in CI, and stronger production-route smoke checks.

Finalized deployment proof:
- Contract: https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482
- Transaction: https://explorer-bradbury.genlayer.com/tx/0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403
- Shareable app view: https://turnmaster-genlayer.vercel.app/?contract=0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

Production deployment remains intentionally blocked until the upgrade branch CI is fully green.
