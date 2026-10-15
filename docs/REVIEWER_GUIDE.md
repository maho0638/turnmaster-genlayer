# TurnMaster reviewer guide — updated 15 October 2026

TurnMaster is an escrow and evidence-review workflow on **GenLayer Bradbury Testnet (chain 4221)**. It does not support real funds. Start at https://turnmaster-genlayer.vercel.app or the read-only https://turnmaster-genlayer.vercel.app/reviewer page.

## Steward follow-up: "Deploy terms on Bradbury" does not click

This control used to have a hard `disabled` condition whenever the browser had no connected wallet, had not yet verified native Bradbury GEN, showed an RPC problem, had a pending deployment, or lacked a configured recipient for non-zero release fees. An unfamiliar reviewer therefore saw a non-interactive button without a clear way forward.

**Fixed behavior in the updated web frontend:** the **Deploy terms on Bradbury** button stays clickable except while an operation is already in progress. Clicking it without prerequisites does **not** broadcast a transaction; it displays the specific missing condition. The Create a job dialog also includes contextual actions:
- **Connect wallet** when disconnected.
- **Fix Bradbury RPC** if network or balance checks fail.
- **Official GEN testnet faucet** if the wallet lacks native testnet GEN.
- **Set fee to 0%** if there is no release fee recipient.
- **View a finalized Bradbury deployment** for reviewers without an eligible funded wallet.
- **Open contract** for a wallet-free, read-only on-chain verification flow.

Important security boundary: the clickability fix **does not bypass** checks inside the deployment handler. A real deployment still requires a valid completed form, authorized wallet, chain 4221, verifiable positive native Bradbury GEN, no unresolved previous deployment, valid release-fee configuration, and explicit wallet approval.

## Quick reproduction / review

1. Open https://turnmaster-genlayer.vercel.app in a fresh browser without a wallet connected.
2. Select **Create a job**; confirm **Deploy terms on Bradbury** is clickable, not greyed out.
3. Click Deploy. Observe a clear **Connect wallet** explanation. **No transaction is sent.**
4. Click **Connect wallet**, grant access, and verify Bradbury chain 4221 using the official RPC `https://rpc-bradbury.genlayer.com`.
5. If the wallet has no native GEN, see the inline explanation and official faucet link. Alternatively select **Open contract** or **View a finalized Bradbury deployment**; these do not deploy a contract.
6. With a funded wallet, enter valid job terms (title 4+ characters, description 20+, deliverable 8+, one criterion 18+, future deadline, reward >0, release fee 0%) and click Deploy.
7. Read the wallet's fee and network information before approving. **The job reward is not transferred during deployment**; funding is a separate user-approved action.
8. After finalization, open the live contract and review immutable criteria, fund/claim/deliver/dispute actions, the audit receipt and Explorer.

The automated deploy-readiness regression suite covers disconnected wallet, wrong chain, unreachable RPC, zero native balance, unverified balance, pending transaction, fee policy, and the ready path. Live wallet approval must be performed by the reviewer; the repository cannot sign on their behalf.

## Current verified on-chain evidence

- **Upgraded live contract:** https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950 (full escrow address `0x30D7B14756ED2b062f7f39F8240F0FC0C3533950`).
- **Upgraded deployment:** https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57
- **First inconclusive review:** https://explorer-bradbury.genlayer.com/tx/0xb8415c4497f15fd0d52785dd17f07d4afbeebb20055da3ca0193b6e1f4758744
- **Retry:** https://explorer-bradbury.genlayer.com/tx/0x634bfff46cf3d89e7504195ac38ee7283f4e3183cf7057f2d152cf0a560356b4
- **ACTUAL finalized seven-day refund (15 October):** https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5. Contract reads `resolved`, `escrow_wei=0`, decision `dispute_timeout_refund`; full 0.1 test GEN returned to the client without commission.
- **On-chain shared directory:** https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8. Three genuine jobs visible without wallet in fresh Chrome Incognito, including [newly deployed job](https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15).
- **Old/legacy contract (cannot be upgraded):** https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

The upgraded job **held 0.1 test GEN in escrow before** the fixed deadline, had two finalized `undetermined` decisions, evidence from both parties and one successful retry. At the 15 October deadline it underwent an actual, signed, FINALIZED full refund; the post-settlement escrow is now **0 GEN**.

## Honest limits

The **seven-day timeout refund is proven twice in different ways**: early/late and double-settlement rules in controlled-time direct contract tests, **and a genuine client-signed full refund on Bradbury finalized on 15 October 2026**. The upgraded escrow is resolved and empty. Early one-sided rejection itself is evidenced in direct tests, not as a separate malicious live-chain attempt.

Live signing, testnet GEN acquisition and chain configuration remain external prerequisites for *new* deployments. A read-only on-chain proof cannot replace a new signed deployment. CI results prove code and mock-time recovery paths, not an external reviewer's funded-wallet availability.

## Further links

- Source: https://github.com/maho0638/turnmaster-genlayer/blob/main/contracts/TurnMasterEscrow.py
- Tests: https://github.com/maho0638/turnmaster-genlayer/blob/main/tests/test_contract_direct.py
- CI: https://github.com/maho0638/turnmaster-genlayer/actions
- Current verified user testing and full refund: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md
- Historical steward fix report: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/STEWARD_REMEDIATION_2026_10_08.md
- Network documentation: https://docs.genlayer.com/developers/networks

## Steward follow-up: real data only

As of the real-data remediation, the public dashboard no longer initializes with five illustrative jobs or permits session-only drafts to appear alongside blockchain work. A fresh browser discovers independently confirmed TurnMaster Bradbury addresses from `lib/public-contracts.mjs`; the addresses are pointers, NOT content. Every displayed title, reward, criteria, escrow balance, delivery and status is read using GenLayer `get_job()` directly from that deployed contract. Failed RPC reads display an error/empty state, not fabricated jobs. Visitors can import and inspect additional Bradbury contracts using **Open contract** without a wallet. The production shared directory has since been deployed and activated. It currently indexes three TurnMaster contracts, including a new job automatically visible in an incognito window; the board still only reads verified listed jobs, not every unrelated contract on the chain. No wallet signature is required for read-only inspection.

The pinned `genlayer-js` package contains a Snap request in its separate wallet `connect()` helper. TurnMaster does not call that helper: read-only calls use an account-free client, while signed calls use the normal EIP-1193 `eth_requestAccounts` flow and a provider-backed client. Repository tests assert that application code does not call `connect()` or request wallet Snaps. The steward's `wallet_getSnaps` issue was subsequently retested with a fresh real Chrome+MetaMask connection on the live site, with no such error in the visible console. The site permission revocation was also tested on a real MetaMask UI. These observations are specific to the tested browser configuration, not a guarantee about all extensions.
