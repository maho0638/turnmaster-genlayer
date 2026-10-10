# TurnMaster reviewer guide — 10 October 2026

TurnMaster is an escrow and evidence-review workflow on **GenLayer Bradbury Testnet (chain 4221)**. It does not support real funds. Start at https://turnmaster-genlayer.vercel.app or the read-only https://turnmaster-genlayer.vercel.app/reviewer page.

## Steward follow-up: "Deploy terms on Bradbury" does not click

This control used to have a hard `disabled` condition whenever the browser had no connected wallet, had not yet verified native Bradbury GEN, showed an RPC problem, had a pending deployment, or lacked a configured recipient for non-zero release fees. An unfamiliar reviewer therefore saw a non-interactive button without a clear way forward.

**Fixed behavior in the updated web frontend:** the **Deploy terms on Bradbury** button stays clickable except while an operation is already in progress. Clicking it without prerequisites does **not** broadcast a transaction; it displays the specific missing condition. The Create a job dialog also includes contextual actions:
- **Connect wallet** when disconnected.
- **Fix Bradbury RPC** if network or balance checks fail.
- **Official GEN testnet faucet** if the wallet lacks native testnet GEN.
- **Set fee to 0%** if there is no release fee recipient.
- **View a finalized Bradbury deployment** for reviewers without an eligible funded wallet.
- **Add session draft** for a no-wallet, clearly non-on-chain workflow.

Important security boundary: the clickability fix **does not bypass** checks inside the deployment handler. A real deployment still requires a valid completed form, authorized wallet, chain 4221, verifiable positive native Bradbury GEN, no unresolved previous deployment, valid release-fee configuration, and explicit wallet approval.

## Quick reproduction / review

1. Open https://turnmaster-genlayer.vercel.app in a fresh browser without a wallet connected.
2. Select **Create a job**; confirm **Deploy terms on Bradbury** is clickable, not greyed out.
3. Click Deploy. Observe a clear **Connect wallet** explanation. **No transaction is sent.**
4. Click **Connect wallet**, grant access, and verify Bradbury chain 4221 using the official RPC `https://rpc-bradbury.genlayer.com`.
5. If the wallet has no native GEN, see the inline explanation and official faucet link. Alternatively select **Add session draft** or **View a finalized Bradbury deployment**; these do not deploy a contract.
6. With a funded wallet, enter valid job terms (title 4+ characters, description 20+, deliverable 8+, one criterion 18+, future deadline, reward >0, release fee 0%) and click Deploy.
7. Read the wallet's fee and network information before approving. **The job reward is not transferred during deployment**; funding is a separate user-approved action.
8. After finalization, open the live contract and review immutable criteria, fund/claim/deliver/dispute actions, the audit receipt and Explorer.

The automated deploy-readiness regression suite covers disconnected wallet, wrong chain, unreachable RPC, zero native balance, unverified balance, pending transaction, fee policy, and the ready path. Live wallet approval must be performed by the reviewer; the repository cannot sign on their behalf.

## Current verified on-chain evidence

- **Upgraded live contract:** use the verified full contract address from the GenLayer Portal submission or the wallet-confirmed deploy receipt. Do not reconstruct it from the shortened UI label.
- **Upgraded deployment:** https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57
- **First inconclusive review:** https://explorer-bradbury.genlayer.com/tx/0xb8415c4497f15fd0d52785dd17f07d4afbeebb20055da3ca0193b6e1f4758744
- **Retry:** https://explorer-bradbury.genlayer.com/tx/0x634bfff46cf3d89e7504195ac38ee7283f4e3183cf7057f2d152cf0a560356b4
- **Old/legacy contract (cannot be upgraded):** https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

The upgraded job had **0.1 test GEN in escrow**, two finalized `undetermined` decisions, evidence submitted by both parties, and one successful retry. An undetermined verdict did not release the funds; the recovery deadline remained unchanged.

## Honest limits

The **seven-day timeout refund** and early one-sided resolution rejections were proven in **controlled-time direct contract tests**, not by waiting seven real days and signing a live refund. The testnet escrow still awaiting that deadline must not be misrepresented as already refunded.

Live signing, testnet GEN acquisition and chain configuration remain external prerequisites for *new* deployments. A read-only on-chain proof or browser session draft cannot replace a new signed deployment. CI results prove code and mock-time recovery paths, not an external reviewer's funded-wallet availability.

## Further links

- Source: https://github.com/maho0638/turnmaster-genlayer/blob/main/contracts/TurnMasterEscrow.py
- Tests: https://github.com/maho0638/turnmaster-genlayer/blob/main/tests/test_contract_direct.py
- CI: https://github.com/maho0638/turnmaster-genlayer/actions
- Steward fix report: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/STEWARD_REMEDIATION_2026_10_08.md
- Network documentation: https://docs.genlayer.com/developers/networks
