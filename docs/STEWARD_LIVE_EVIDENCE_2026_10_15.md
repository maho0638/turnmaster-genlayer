# TurnMaster — verified steward evidence (15 October 2026)

This is a **testnet-only** account of actions actually performed on GenLayer Bradbury (chain 4221). It replaces the earlier **pending refund** language in historical 8–11 October evidence. It does **not** claim active-user analytics or real-money transfers.

## Steward issue 1 — `wallet_getSnaps`

- Root cause: the installed `genlayer-js` package includes a separate MetaMask/Snap helper that requests `wallet_getSnaps`. TurnMaster does **not** call that helper. Ordinary connection uses EIP-1193 `eth_requestAccounts`, Bradbury network validation and an authorized wallet-backed client.
- **Actual browser check:** after removing the previous MetaMask site permission, a fresh Chrome + MetaMask connection displayed the connected Bradbury 4221 wallet, read its native test GEN balance and produced **no `wallet_getSnaps` error in the inspected console**.
- **Disconnect regression:** [PR #17](https://github.com/maho0638/turnmaster-genlayer/pull/17) adds `wallet_revokePermissions` for `eth_accounts` with `eth_accounts` readback. The actual tested MetaMask permissions list was empty after disconnect. Wallets that refuse/omit this RPC show explicit guidance rather than false success.
- Tests include normal, unsupported, user-rejected, failed, and still-authorized cases. A successful test on this browser does not certify every wallet extension.

## Steward issue 2 — no mock/sample jobs

- The public board does not initialize any fabricated jobs. Every title, reward, status, role, and escrow is reconstructed from a successful GenLayer `get_job()` read. An RPC error is not silently replaced with sample content.
- The shared on-chain directory is [`0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8`](https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8); it publishes contract addresses only, not fabricated job content.
- On **12 October 2026**, the client created the genuine new Bradbury job [`0xee6548ca1becb6797bd3a96b5249159c740f7c15`](https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15), **TurnMaster Public Directory Test 03**. After finalization, a fresh Chrome Incognito visitor without a connected wallet saw **three** on-chain contracts in the public work board. The new job's 0.1 GEN reward is an *offered reward*; it was not separately funded. Do not mistake the three contracts for three paying customers or three funded escrows.
- The other two real jobs are [`0x30D7B14756ED2b062f7f39F8240F0FC0C3533950`](https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950) (upgraded dispute/refund escrow) and [`0xAA85A41F899ED569d32B4CF0FDA2C55461d94482`](https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482) (older resolved immutable V1).

## Steward issue 3 — actual signed GenLayer product use

- The user manually deployed and verified contracts using a real MetaMask Bradbury test wallet; the upgrade escrow was funded with **0.1 test GEN**. A different worker wallet claimed the work, submitted delivery and evidence.
- Both parties submitted dispute evidence, with a 48-hour response rule; one authorized retry reopened a new round without extending the seven-day recovery date. **Two actual finalized GenLayer consensus reviews returned `undetermined`, leaving the 0.1 test GEN locked before deadline.**
- [First finalized review](https://explorer-bradbury.genlayer.com/tx/0xb8415c4497f15fd0d52785dd17f07d4afbeebb20055da3ca0193b6e1f4758744); [single retry](https://explorer-bradbury.genlayer.com/tx/0x634bfff46cf3d89e7504195ac38ee7283f4e3183cf7057f2d152cf0a560356b4). Other history is available from the contract and UI.

## Steward issue 4 — real seven-day **FULL client refund**

- Contract: [`0x30D7B14756ED2b062f7f39F8240F0FC0C3533950`](https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950)
- **Fixed recovery deadline:** 15 October 2026, 18:43:49 (local Europe/Istanbul time); it did not move when retried.
- **Refund call:** `refund_after_dispute_timeout()`, originating from the **client wallet** `0x341D64930E59D630FC89Bb24B116a183883D34b4`.
- **Signed finalized proof:** [GenLayer Explorer transaction `0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5`](https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5).
- **Direct RPC readback after finalization:** `status="resolved"`, `escrow_wei="0"`, `decision.outcome="dispute_timeout_refund"`, retry count `1`, dispute review round `2`.
- **Amount:** escrow originally contained `100000000000000000` wei = **0.1 test GEN**. The contract's balance is now **0 GEN**; the original client's test GEN balance increased consistently with receipt of the full refund less its network transaction fee. No platform refund fee.
- This is actual signed testnet execution, **not** a simulated-time contract test. Direct contract test coverage separately checks unauthorized/early transitions, mixed evidence, retry limits, and no double settlement.
- The historical V1 resolved contract is separate and immutable; do not attribute the upgraded refund rules to it.

## Reproduce without relying on screenshots

1. Open [the public board](https://turnmaster-genlayer.vercel.app) in a clean browser. It should show three verified on-chain jobs; no wallet is needed to view them.
2. Inspect [the new job](https://turnmaster-genlayer.vercel.app/?contract=0xee6548ca1becb6797bd3a96b5249159c740f7c15) and [the on-chain directory](https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8).
3. Inspect [the refunded work item](https://turnmaster-genlayer.vercel.app/?contract=0x30D7B14756ED2b062f7f39F8240F0FC0C3533950), click its live contract details and read `resolved`, `0 GEN` escrow and the settlement decision report.
4. Open [the finalized refund transaction](https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5) and compare the `get_job()` state with the recorded origin and method.
5. For development evidence, inspect [CI](https://github.com/maho0638/turnmaster-genlayer/actions), [Python escrow contract](https://github.com/maho0638/turnmaster-genlayer/blob/main/contracts/TurnMasterEscrow.py), [wallet permission tests](https://github.com/maho0638/turnmaster-genlayer/blob/main/tests/wallet-permission-revocation.test.mjs) and [this reviewer page](https://turnmaster-genlayer.vercel.app/reviewer).

## Explicit limits

Only three deployed jobs and the described manual wallet/testing lifecycle are claimed, not production usage statistics, anonymous traffic tracking, recurring external customers, real-money revenue or verified success in all wallet extensions. Third-party reviewers still need to provide their own MetaMask approvals if they wish to create new transactions. No funds or new transactions should be sent simply to read the proof.
