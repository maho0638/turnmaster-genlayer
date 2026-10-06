# TurnMaster QA report

Date: 2026-10-06

## Verified locally and on the deployed app

| Check | Result | Evidence / limits |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed without findings. |
| TypeScript | PASS | `npx tsc --noEmit` completed without errors. |
| Production build | PASS | `npm run build` completed. Contract controls and GenLayer SDK are split from the initial board bundle. Vinext still emits its static route-classification advisory. |
| GenLayer contract direct-mode suite | PASS | `HOME=/tmp/turnmaster-gltest-home python -m pytest tests/test_contract_direct.py -q` — 19 passed. |
| Bradbury network config unit test | PASS | Unit coverage locks MetaMask and `testnetBradbury` to `https://rpc-bradbury.genlayer.com`, verifies independent native-GEN reads, and verifies the 2× outer EVM gas-headroom wrapper used before wallet submission. |
| Contract source publication check | PASS | The publication test confirms the browser-served Python source is byte-identical to `contracts/TurnMasterEscrow.py`. |
| Vercel production deployment | PASS | The current production build reached `READY`; production alias `turnmaster-genlayer.vercel.app` is attached and the work board loaded in a browser. No wallet transaction was submitted during verification. |
| Deterministic contract rules | PASS | Creation validation, empty/vague criteria, zero/negative reward, exact funding, client/worker roles, deadline-late funding and delivery, revision, acceptance, cancellation, and settlement idempotency. |
| Dispute contract behavior | PASS (local mocks) | Party-only dispute resolution, exact frozen-criteria matching, readable decision explanations, malformed/conflicting outcomes, retrievable and unavailable evidence, no payout on `undetermined`, and no second evaluation after the dispute is terminal. Evidence retrieval and evaluator responses are mocked by the local VM. |
| SDK/network references | PASS (configuration) | The wallet and SDK now follow GenLayer's documented Bradbury wallet endpoint. The direct Chain RPC remains diagnostic-only. The app compensates for the stable SDK's exact-gas submission behavior with the upstream 2× headroom rule. |
| GenLayer SDK | PASS | Lockfile uses stable `genlayer-js` `1.2.0`; the app uses `testnetBradbury`, finalized receipts, and the SDK's EVM gas estimation before wallet approval. |

The direct-mode tests run against a local VM with public evidence and model responses mocked. They do not establish validator consensus, live RPC behavior, wallet signing, gas/protocol fees, queued transfer finalization, or a real Explorer receipt.

## Screenshot and transaction-flow diagnosis

The 2026-10-06 browser screenshot shows the wallet connected on chain 4221 with 105 GEN visible in TurnMaster, while MetaMask records repeated failed interactions with ConsensusMain `0x0112…4271d`. The app itself displayed the diagnostic saying MetaMask used `rpc.testnet-chain.genlayer.com` for signing. That configuration was incorrect for TurnMaster: GenLayer's current Networks documentation explicitly says the wallet connects to the GenLayer RPC `https://rpc-bradbury.genlayer.com`; the Bradbury endpoint also proxies standard `eth_*` calls.

There is a second Bradbury-specific failure mode relevant to the screenshot. Public GenLayer CLI issue #402 documents valid `addTransaction` calls reverting before GenVM when the exact `eth_estimateGas` value is used; replaying the same calldata with more outer gas succeeds. Upstream GenLayerJS work uses a 20,000-bps (2×) transaction gas headroom. TurnMaster now applies that same 2× headroom at the EIP-1193 boundary for `eth_sendTransaction`, while leaving reads and the SDK-calculated transaction payload unchanged.

The corrected browser flow therefore has two guards: MetaMask is requested/configured with the official Bradbury RPC, and ConsensusMain submissions get 2× outer-EVM gas headroom before the wallet approval prompt.

## Not verified / remaining blockers

- No TurnMaster contract has been deployed from this build. There is no real contract address, transaction hash, escrow balance, or Explorer activity to display.
- The full `create → fund → deliver → evaluate → release/refund` Bradbury testnet journey was **NOT RUN**. A compatible connected wallet and funded testnet account were not available in the task environment. The app now has the transaction paths, but they remain unverified against the live network.
- A real browser/wallet failure was reproduced by the user on the previous build and used to identify the wrong MetaMask RPC plus the stable-SDK gas-headroom risk. The corrected build still needs one successful signed Bradbury deployment to close the end-to-end verification gap.
- The production board was previously loaded in a browser, but wallet-connected end-to-end flows, mobile layout, keyboard-only navigation, 200% zoom, assistive technology, and runtime WebMCP still require manual browser verification.
- Build output has no client chunk size advisory after lazy-loading contract controls and GenLayer transaction modules. Vinext still cannot statically classify the root route and prints its generic route-classification advisory.
- The Git-connected Vercel production build completed successfully. This verifies the deployed Next.js build, not every wallet flow.
- The board has no indexer or shared persistence. User-created contract addresses must be saved by the user and re-imported after refresh; session drafts are intentionally ephemeral.
- A dispute with inaccessible or unverifiable evidence ends as `undetermined` with funds still held. There is no retry/appeal or recovery action for that terminal state.
- A non-zero fee requires `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT`; no recipient is configured in this build. Zero-fee Bradbury jobs can be created.

## Release status

The project is a testnet-only application with a GenLayer contract and SDK-backed Bradbury actions. GitHub verification now covers frontend lint/type/build, network unit tests, live public-RPC smoke checks, a built-site HTTP smoke check, and direct-mode contract tests before changes are promoted to `main`. No TurnMaster job contract has yet completed the full live create → fund → deliver → settle journey. It is not ready for real funds and does not provide legal arbitration.
