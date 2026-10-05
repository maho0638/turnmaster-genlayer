# TurnMaster QA report

Date: 2026-10-05

## Verified locally

| Check | Result | Evidence / limits |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed without findings. |
| TypeScript | PASS | `npx tsc --noEmit` completed without errors. |
| Production build | PASS | `npm run build` completed. Vinext reports a client chunk above 500 kB and a route-classification warning; neither prevents the build. |
| GenLayer contract direct-mode suite | PASS | `HOME=/tmp/turnmaster-gltest-home python -m pytest tests/test_contract_direct.py -q` — 13 passed. |
| Deterministic contract rules | PASS | Creation validation, empty/vague criteria, zero/negative reward, exact funding, client/worker roles, deadline-late funding and delivery, revision, acceptance, cancellation, and settlement idempotency. |
| Dispute contract behavior | PASS (local mocks) | Party-only dispute resolution, criteria-specific report parsing, retrievable and unavailable evidence, no payout on `undetermined`, and no second evaluation after the dispute is terminal. Evidence retrieval and evaluator responses are mocked by the local VM. |
| SDK/network references | CHECKED | The client is configured for the official Bradbury Testnet preset and Explorer. This does not establish live RPC or transaction success. |
| GenLayer SDK | PASS | Lockfile uses stable `genlayer-js` `1.2.0`; the app uses `testnetBradbury`, finalized receipts, and the SDK's EVM gas estimation before wallet approval. |

The direct-mode tests run against a local VM with public evidence and model responses mocked. They do not establish validator consensus, live RPC behavior, wallet signing, gas/protocol fees, queued transfer finalization, or a real Explorer receipt.

## Not verified / remaining blockers

- No TurnMaster contract has been deployed from this build. There is no real contract address, transaction hash, escrow balance, or Explorer activity to display.
- The full `create → fund → deliver → evaluate → release/refund` Bradbury testnet journey was **NOT RUN**. A compatible connected wallet and funded testnet account were not available in the task environment. The app now has the transaction paths, but they remain unverified against the live network.
- Disconnected wallet, wrong network, user signature rejection, failed transaction, unavailable RPC, and live unavailable-evidence outcomes have not been exercised in an actual browser/wallet session. SDK gas estimation and the wallet's fee quote were not exercised against Bradbury.
- Desktop/mobile visual layout, keyboard-only navigation, 200% zoom, assistive technology, overflow, and runtime WebMCP registration have not been browser-tested. Browser interaction is unavailable in this execution environment, so build/type/lint results are not a substitute for this QA.
- The SDK bundle exceeds Vite's 500 kB advisory threshold. Code splitting has not been tuned.
- The board has no indexer or shared persistence. User-created contract addresses must be saved by the user and re-imported after refresh; session drafts are intentionally ephemeral.
- A dispute with inaccessible or unverifiable evidence ends as `undetermined` with funds still held. There is no retry/appeal or recovery action for that terminal state.
- A non-zero fee requires `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT`; no recipient is configured in this build. Zero-fee Bradbury jobs can be created.

## Release status

The project is a buildable, locally tested testnet application with a GenLayer contract and SDK-backed Bradbury actions. The live testnet flow and browser/accessibility checks remain incomplete, and no contract deployment or public site deployment has been made. It is not ready for real funds and does not provide legal arbitration. The current Site remains an owner-private saved draft.
