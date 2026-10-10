# TurnMaster QA report — 10 October 2026

## Current verified baseline

TurnMaster is testnet-only, never a production-money escrow or legal arbitration service.

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Last released web and contract CI | PASS | https://github.com/maho0638/turnmaster-genlayer/actions/runs/37843152167 |
| Direct contract suite (dispute/recovery) | 25 PASS | `tests/test_contract_direct.py`, with controlled time and mocked evidence |
| GenVM lint and deployed source integrity | PASS | GitHub Actions contract workflow and `tests/contract-source.test.mjs` |
| Live deployed new escrow | FINALIZED | https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57 |
| Live wallet lifecycle | PARTIAL, VERIFIED | A new 0.1 test-GEN job funded, claimed and delivered, with both parties' dispute evidence, two inconclusive reviews and one finalized retry. Funds remained locked. |
| Live seven-day recovery | NOT YET TESTED LIVE | Automated time-advanced tests verified 100% recovery to client without double settlement. Real Bradbury escrow must reach the seven-day deadline before a signed live refund is provable. |
| New steward deployment-button issue | FIX IN REVIEW | Fresh code makes the button clickable and explains unmet wallet/RPC/native-GEN/fee/pending conditions. New regression checks run in PR CI before promotion. No deployment is sent merely by clicking without a wallet. |

## October 10 steward usability regression

Steward reported: **"this button is not clickable Deploy terms on Bradbury / i want to create a job and the button refused to click"**.

Root cause identified in `app/page.tsx`: the action was strictly disabled by wallet connectivity, balance-fetch state, native GEN amount, network mismatch, pending hash, and fee-recipient configuration. In a disconnected or unfunded review browser it was inert, even when the rest of the form was accessible.

Fix behavior:

1. **Deploy terms on Bradbury** is clickable unless another on-chain operation is actively in progress.
2. The click yields a specific reason when requirements are missing, with in-dialog **Connect wallet**, **Fix Bradbury RPC**, **official faucet**, **Set fee to 0%**, or a verified deployment proof link.
3. **Add session draft** remains independent of wallet state; it does not claim on-chain deployment.
4. The transaction handler still verifies wallet, correct Bradbury chain 4221, positive native GEN, valid terms, supported fee setup and no unresolved prior deployment before submitting to the wallet.
5. A true signed deployment still requires the reviewer to possess an eligible wallet and approve the transaction. The software cannot provide signing rights to someone else's wallet.

Regression coverage: `tests/deploy-readiness.test.mjs` and the on-page audit assertions in `tests/project-proof.test.mjs`. Lint, type check, build, RPC smoke, no-broadcast deploy preflight, GenVM lint and direct contract tests must pass before a main-branch deployment.

## Historic gas failure, resolved before this change

An earlier Bradbury deploy failed when the original contract approached/exceeded the 16,777,216 gas cap. A compact contract, official GenLayer RPC and bounded gas headroom were implemented and successfully verified before the October 8 live deployment. This latest usability fix **does not modify the GenLayer Python contract or gas handling**.

## Residual limits

- No central indexer: app jobs are re-importable by full on-chain address. Example board cards are visually marked SAMPLE.
- Web-based evidence URLs can change externally; TurnMaster does not archive their content.
- No live signed timeout refund can be represented until the seven-day period passes.
- End-user wallets need native testnet GEN for transaction network fees. Official faucet: https://testnet-faucet.genlayer.foundation/.
- There is no substitute for a wallet-connected human to test actual wallet permission dialogs; CI verifies source and a no-broadcast preflight, not every external browser extension state.
