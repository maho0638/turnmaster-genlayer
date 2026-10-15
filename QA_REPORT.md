# TurnMaster QA and actual Bradbury evidence — 15 October 2026

This is the current status of the `main`-line TurnMaster on GenLayer Bradbury Testnet (4221). It supersedes the earlier 11 October *local worktree* assessment, which necessarily could not include later signed transactions. No fabricated usage statistics are claimed.

## Live, independently readable evidence

| Item | Verified result | Primary proof |
| --- | --- | --- |
| Public work board | 3 real `get_job()`-verified contracts, including a new job visible to Chrome Incognito without wallet | [New job](https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15), [directory](https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8) |
| New contract deploy | Third on-chain job finalized, reward advertised but never separately funded | [New job](https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15) |
| MetaMask `wallet_getSnaps` | Fresh Chrome+MetaMask connection succeeded with no such console error in tested environment | [Wallet correction and regression](https://github.com/maho0638/turnmaster-genlayer/pull/17) |
| MetaMask disconnect | Actual user MetaMask permissions page empty after TurnMaster disconnected; on-chain actions require reconnect | [Verified revoke helper](https://github.com/maho0638/turnmaster-genlayer/blob/main/lib/bradbury-wallet.mjs) |
| Real disputed escrow | 0.1 test GEN funded, claimed from separate wallet, delivery and both-party evidence, two finalized `undetermined` decisions and one retry | [Escrow](https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950), [review](https://explorer-bradbury.genlayer.com/tx/0xb8415c4497f15fd0d52785dd17f07d4afbeebb20055da3ca0193b6e1f4758744), [retry](https://explorer-bradbury.genlayer.com/tx/0x634bfff46cf3d89e7504195ac38ee7283f4e3183cf7057f2d152cf0a560356b4) |
| **Fixed seven-day full refund** | **Actual client-signed `FINALIZED`** 15 Oct: `resolved`, `escrow_wei=0`, `dispute_timeout_refund`, full 0.1 test GEN, zero platform fee | **[Refund tx](https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5)** |

The original V1 resolved job at `0xAA85A41F899ED569d32B4CF0FDA2C55461d94482` has older immutable rules and must not be confused with the upgraded dispute contract.

## Test layers and limits

- GitHub CI covers ESLint, full TypeScript, wallet/network tests (including rejected/unsupported/unchanged permission states), actual Bradbury RPC smoke, live read-only deployment preflight, regression tests, direct-mode Python contract tests, GenVM lint and Next.js build+HTTP route checks.
- Contract direct-mode uses controlled time to test one-sided early resolution, invalid/mixed `fail` + `unverifiable` evidence, retry limits, early refund rejection and no double settlement. Separately, the actual signed 15 Oct Bradbury refund passed.
- Browser evidence is a user-performed Chrome + MetaMask run, not generalized cross-browser automation.
- New signed jobs require user wallet and test GEN. No mainnet, real-money, usage-analytics, third-party user volume or customer revenue claims.
- All displayed public board data comes from successful live contract reads; failures do not substitute samples.
- Read-only verification: [Reviewer proof](https://turnmaster-genlayer.vercel.app/reviewer) and [machine-readable project evidence](https://turnmaster-genlayer.vercel.app/project-proof.json).
- Detailed per-step evidence and raw hashes: [Steward live evidence](docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md).

## Follow-up distinction

The previous 8–11 October descriptions of the directory as inactive or timeout refund as pending were historical at the time. They are now outdated for the 15 October verified build and chain state. No additional contract deployment is required to inspect existing proofs.
