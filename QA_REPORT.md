# TurnMaster QA report

Date: 2026-10-06

## Verified locally and on the deployed app

| Check | Result | Evidence / limits |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed without findings. |
| TypeScript | PASS | `npx tsc --noEmit` completed without errors. |
| Production build | PASS | `npm run build` completed. Contract controls and GenLayer SDK are split from the initial board bundle. Vinext still emits its static route-classification advisory. |
| GenLayer contract direct-mode suite | PASS | `HOME=/tmp/turnmaster-gltest-home python -m pytest tests/test_contract_direct.py -q` — 19 passed. |
| Bradbury network config unit test | PASS | Unit coverage locks the direct Chain RPC used for injected-wallet `eth_*` signing separately from the Bradbury GenLayer RPC used for Intelligent Contract traffic, and verifies the explicit Bradbury native-balance JSON-RPC reader. |
| Contract source publication check | PASS | The publication test confirms the browser-served Python source is byte-identical to `contracts/TurnMasterEscrow.py`. |
| Vercel production deployment | PASS | The current production build reached `READY`; production alias `turnmaster-genlayer.vercel.app` is attached and the work board loaded in a browser. No wallet transaction was submitted during verification. |
| Deterministic contract rules | PASS | Creation validation, empty/vague criteria, zero/negative reward, exact funding, client/worker roles, deadline-late funding and delivery, revision, acceptance, cancellation, and settlement idempotency. |
| Dispute contract behavior | PASS (local mocks) | Party-only dispute resolution, exact frozen-criteria matching, readable decision explanations, malformed/conflicting outcomes, retrievable and unavailable evidence, no payout on `undetermined`, and no second evaluation after the dispute is terminal. Evidence retrieval and evaluator responses are mocked by the local VM. |
| SDK/network references | PASS (configuration) | `genlayer-js` remains on the `testnetBradbury` preset for GenLayer RPC calls. MetaMask is configured with the direct chain-4221 RPC for standard signing, while TurnMaster independently verifies native GEN through `rpc-bradbury.genlayer.com`. |
| GenLayer SDK | PASS | Lockfile uses stable `genlayer-js` `1.2.0`; the app uses `testnetBradbury`, finalized receipts, and the SDK's EVM gas estimation before wallet approval. |

The direct-mode tests run against a local VM with public evidence and model responses mocked. They do not establish validator consensus, live RPC behavior, wallet signing, gas/protocol fees, queued transfer finalization, or a real Explorer receipt.

## Screenshot and transaction-flow diagnosis

The supplied MetaMask screenshots showed two separate facts: deployment carries a 0 GEN transaction value, and the wallet/RPC path had previously failed while trying to submit that consensus interaction. In stable `genlayer-js`, Intelligent Contract deployment sends the Python code and constructor arguments to the consensus contract; the agreed reward is stored in the job terms and is deposited later through `fund()`. A 0 GEN deployment value is therefore expected and does not mean an empty transaction.

TurnMaster now keeps the two network responsibilities explicit. Injected-wallet `eth_*` signing uses the direct GenLayer Chain endpoint on chain 4221, while Intelligent Contract RPC calls use the Bradbury GenLayer endpoint. GenLayer's network documentation states that the Bradbury endpoint can proxy `eth_*` calls too, so this split remains protocol-compatible. The native GEN guard no longer accidentally falls back to `window.ethereum`: it performs an explicit read-only `eth_getBalance` request against the Bradbury RPC. A live RPC smoke test checks chain ID 4221 on both public endpoints before a change is promoted.

## Not verified / remaining blockers

- No TurnMaster contract has been deployed from this build. There is no real contract address, transaction hash, escrow balance, or Explorer activity to display.
- The full `create → fund → deliver → evaluate → release/refund` Bradbury testnet journey was **NOT RUN**. A compatible connected wallet and funded testnet account were not available in the task environment. The app now has the transaction paths, but they remain unverified against the live network.
- Disconnected wallet, wrong network, user signature rejection, failed transaction, unavailable RPC, and live unavailable-evidence outcomes have not been exercised in an actual browser/wallet session. SDK gas estimation and the wallet's fee quote were not exercised against Bradbury.
- The production board was previously loaded in a browser, but wallet-connected end-to-end flows, mobile layout, keyboard-only navigation, 200% zoom, assistive technology, and runtime WebMCP still require manual browser verification.
- Build output has no client chunk size advisory after lazy-loading contract controls and GenLayer transaction modules. Vinext still cannot statically classify the root route and prints its generic route-classification advisory.
- The Git-connected Vercel production build completed successfully. This verifies the deployed Next.js build, not every wallet flow.
- The board has no indexer or shared persistence. User-created contract addresses must be saved by the user and re-imported after refresh; session drafts are intentionally ephemeral.
- A dispute with inaccessible or unverifiable evidence ends as `undetermined` with funds still held. There is no retry/appeal or recovery action for that terminal state.
- A non-zero fee requires `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT`; no recipient is configured in this build. Zero-fee Bradbury jobs can be created.

## Release status

The project is a testnet-only application with a GenLayer contract and SDK-backed Bradbury actions. GitHub verification now covers frontend lint/type/build, network unit tests, live public-RPC smoke checks, a built-site HTTP smoke check, and direct-mode contract tests before changes are promoted to `main`. No TurnMaster job contract has yet completed the full live create → fund → deliver → settle journey. It is not ready for real funds and does not provide legal arbitration.
