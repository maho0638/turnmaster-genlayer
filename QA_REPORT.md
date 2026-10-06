# TurnMaster QA report

Date: 2026-10-06

## Verified locally and on the deployed app

| Check | Result | Evidence / limits |
| --- | --- | --- |
| ESLint | PASS | `npm run lint` completed without findings. |
| TypeScript | PASS | `npx tsc --noEmit` completed without errors. |
| Production build | PASS | `npm run build` completed. Contract controls and GenLayer SDK are split from the initial board bundle. Vinext still emits its static route-classification advisory. |
| GenLayer contract direct-mode suite | PASS | `HOME=/tmp/turnmaster-gltest-home python -m pytest tests/test_contract_direct.py -q` — 19 passed. |
| Bradbury network config unit test | PASS | `node --test` on the updated network test plus the contract-source publication test — checks confirm MetaMask uses the documented GenLayer Chain RPC for standard wallet calls while the SDK uses the Bradbury GenLayer RPC; also validates chain metadata, formatting, and address rules. This does not establish live RPC availability. |
| Contract source publication check | PASS | The publication test confirms the browser-served Python source is byte-identical to `contracts/TurnMasterEscrow.py`. |
| Vercel production deployment | PASS | The current production build reached `READY`; production alias `turnmaster-genlayer.vercel.app` is attached and the work board loaded in a browser. No wallet transaction was submitted during verification. |
| Deterministic contract rules | PASS | Creation validation, empty/vague criteria, zero/negative reward, exact funding, client/worker roles, deadline-late funding and delivery, revision, acceptance, cancellation, and settlement idempotency. |
| Dispute contract behavior | PASS (local mocks) | Party-only dispute resolution, exact frozen-criteria matching, readable decision explanations, malformed/conflicting outcomes, retrievable and unavailable evidence, no payout on `undetermined`, and no second evaluation after the dispute is terminal. Evidence retrieval and evaluator responses are mocked by the local VM. |
| SDK/network references | PASS (configuration) | Wallet metadata uses the documented GenLayer Chain RPC (`rpc.testnet-chain.genlayer.com`) for MetaMask writes; a read-only `genlayer-js` client reads native GEN through Bradbury GenLayer RPC (`rpc-bradbury.genlayer.com`). Both use chain ID 4221. This does not establish live RPC or transaction success. |
| GenLayer SDK | PASS | Lockfile uses stable `genlayer-js` `1.2.0`; the app uses `testnetBradbury`, finalized receipts, and the SDK's EVM gas estimation before wallet approval. |

The direct-mode tests run against a local VM with public evidence and model responses mocked. They do not establish validator consensus, live RPC behavior, wallet signing, gas/protocol fees, queued transfer finalization, or a real Explorer receipt.

## Screenshot and transaction-flow diagnosis

The supplied screenshots show a MetaMask attempt marked failed with `-0 GEN` and a later submission prompt showing `0 GEN`, while TurnMaster displayed an RPC/balance error. In the installed `genlayer-js` 1.2.0 implementation, `deployContract` sends contract bytecode and constructor arguments to the GenLayer consensus contract and does not set an EVM `value`; the reward amount is stored in the job terms and is funded separately through `fund()`. Therefore MetaMask's 0 GEN is the transaction value, not the entire transaction payload or the later escrow deposit. The screenshots contain no transaction hash, so neither screenshot proves whether the later request finalized. The app was also leaving the deploy button available while its own native-balance RPC read had failed; the UI now pauses deploy/fund actions until MetaMask can read a positive native GEN balance and explains the 0-value deployment.

## Not verified / remaining blockers

- No TurnMaster contract has been deployed from this build. There is no real contract address, transaction hash, escrow balance, or Explorer activity to display.
- The full `create → fund → deliver → evaluate → release/refund` Bradbury testnet journey was **NOT RUN**. A compatible connected wallet and funded testnet account were not available in the task environment. The app now has the transaction paths, but they remain unverified against the live network.
- Disconnected wallet, wrong network, user signature rejection, failed transaction, unavailable RPC, and live unavailable-evidence outcomes have not been exercised in an actual browser/wallet session. SDK gas estimation and the wallet's fee quote were not exercised against Bradbury.
- The production board was loaded in a browser, but wallet-connected flows, mobile layout, keyboard-only navigation, 200% zoom, assistive technology, and runtime WebMCP were not fully tested.
- Build output has no client chunk size advisory after lazy-loading contract controls and GenLayer transaction modules. Vinext still cannot statically classify the root route and prints its generic route-classification advisory.
- The Git-connected Vercel production build completed successfully. This verifies the deployed Next.js build, not every wallet flow.
- The board has no indexer or shared persistence. User-created contract addresses must be saved by the user and re-imported after refresh; session drafts are intentionally ephemeral.
- A dispute with inaccessible or unverifiable evidence ends as `undetermined` with funds still held. There is no retry/appeal or recovery action for that terminal state.
- A non-zero fee requires `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT`; no recipient is configured in this build. Zero-fee Bradbury jobs can be created.

## Release status

The project is a deployed, testnet-only application with a GenLayer contract and SDK-backed Bradbury actions. The public site is live, but no TurnMaster job contract has been deployed and the full live testnet flow remains unverified. It is not ready for real funds and does not provide legal arbitration.
