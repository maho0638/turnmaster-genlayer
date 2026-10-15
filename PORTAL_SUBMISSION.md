# GenLayer Portal — TurnMaster submission copy

## Project name

TurnMaster

## One-sentence summary

TurnMaster is a GenLayer-native work escrow that freezes measurable job terms, verifies public delivery evidence through AI consensus, and releases or refunds testnet rewards only after the contract reaches a defensible outcome.

## Description

TurnMaster solves a real trust problem in freelance and agent work: payment depends on whether a delivery actually satisfies natural-language requirements, something deterministic smart contracts cannot judge on their own. Each job deploys a GenLayer Intelligent Contract with frozen scope, deliverable, acceptance criteria, deadline and reward. The client funds the escrow in a separate transaction, another wallet can claim the job, and the worker submits a delivery with public HTTPS evidence.

If the client accepts the delivery, the contract settles deterministically. If the result is disputed, TurnMaster retrieves the public evidence from inside the Intelligent Contract and uses GenLayer's comparative consensus to produce one verdict per frozen criterion. The contract then validates the result and applies a conservative settlement rule: all criteria pass releases the reward to the worker; a verified failed criterion refunds the client; missing, contradictory, inaccessible or malformed evidence becomes `undetermined` and releases nothing.

The frontend is not a static mock. It uses `genlayer-js` and an EIP-1193 wallet to deploy, fund, claim, submit delivery, request revisions, open disputes, add evidence, run GenLayer review, refund after deadline, cancel unfunded jobs, wait for finalization, re-read contract state, and link the transaction lifecycle to Bradbury Explorer. The repository includes direct-mode contract tests, network tests, a live Bradbury RPC smoke check, a no-broadcast deployment preflight, production build smoke checks, architecture/security documentation, and an explicit QA report.

## Current verified product usage — 15 October 2026

- **No mock records:** three real Bradbury job contracts shown after direct `get_job()` reads. An additional job deployed on 12 October appeared in wallet-free incognito through the on-chain directory.
- **Real signed activity:** 0.1 test GEN escrow funding, second-wallet claim, delivery, evidence from both parties, two finalized undetermined reviews, one retry.
- **Actual final settlement:** the 15 October [7-day full client refund](https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5) FINALIZED; contract `0x30D7B14756ED2b062f7f39F8240F0FC0C3533950` now reads `resolved`, `escrow_wei=0`, `dispute_timeout_refund`; client received 0.1 test GEN with zero platform fee.
- **Snap fix:** SDK Snap-connect path removed from TurnMaster; a fresh real Chrome/MetaMask connection succeeded without `wallet_getSnaps` in inspected console. Site disconnect removes and checks MetaMask account permission where supported.
- **Steward-ready evidence:** https://turnmaster-genlayer.vercel.app/reviewer and [15 October on-chain/browser report](docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md).
- We do not assert real customer analytics, external paying-user counts or mainnet volume.

## Demo URL

https://turnmaster-genlayer.vercel.app

## Reviewer proof URL

https://turnmaster-genlayer.vercel.app/reviewer

## GitHub

https://github.com/maho0638/turnmaster-genlayer

## How to use / review steps

1. Open the production site and confirm Bradbury Testnet / chain 4221 is shown.
2. Click **Create a job** and enter a future deadline, reward, concrete required delivery, and at least one measurable acceptance criterion. Keep release fee at 0% unless a fee recipient is configured.
3. Connect a compatible test wallet. TurnMaster verifies native Bradbury GEN before enabling deployment.
4. Click **Deploy terms on Bradbury**, review the wallet request, and wait for finalization. The reward is not transferred during deployment.
5. Open the deployed job and use **Fund this escrow** from the client wallet to deposit exactly the agreed reward.
6. From a different wallet, claim the job, then submit a delivery description and public HTTPS evidence.
7. Return to the client wallet. Accept directly, request a revision, or open a dispute. During a dispute, either party may add public evidence.
8. Run **GenLayer review**. Inspect the stored decision report, per-criterion verdicts, terminal contract state, Explorer transaction and any triggered settlement transaction.
9. Without connecting a wallet, open an Incognito window and verify the new October 12 job is automatically visible alongside the two older contracts.
10. Open the genuine finalized October 15 refund transaction and verify upgraded contract `resolved`, `escrow_wei=0`, `dispute_timeout_refund`.

## Expected verification result

A reviewer should see a Bradbury Intelligent Contract whose immutable job terms can be re-read by address and whose UI actions are enabled only for the correct role/state. Funding must equal the frozen reward, a non-client wallet can claim, the assigned worker can submit public evidence, and a disputed review must store one verdict per frozen criterion. An all-pass dispute releases to the worker; a verified fail refunds the client; any unverifiable criterion results in `undetermined` with no payout. Every successful write must finalize before the UI reloads state, and known transaction hashes must link to Bradbury Explorer.

## Contract links

Finalized TurnMasterEscrow:
https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

Finalized deployment transaction:
https://explorer-bradbury.genlayer.com/tx/0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403

Shareable TurnMaster contract view:
https://turnmaster-genlayer.vercel.app/?contract=0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

## Finalized 7-day refund transaction

https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5

## Shared directory and new on-chain job

https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8

https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15

## Evidence and supporting information

- Current live-use evidence: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md
- Repository: https://github.com/maho0638/turnmaster-genlayer
- Reviewer guide: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/REVIEWER_GUIDE.md
- Architecture: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/ARCHITECTURE.md
- Security model: https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/SECURITY_MODEL.md
- QA report: https://github.com/maho0638/turnmaster-genlayer/blob/main/QA_REPORT.md
- Public CI: https://github.com/maho0638/turnmaster-genlayer/actions
- GenLayer contract source: https://github.com/maho0638/turnmaster-genlayer/blob/main/contracts/TurnMasterEscrow.py

## Why this is meaningfully different from a starter template

TurnMaster implements a complete domain-specific escrow state machine, wallet-role gating, exact-value funding, evidence submission, revision/dispute paths, GenLayer web evidence retrieval, comparative consensus, conservative verdict validation, release/refund settlement, unknown-transaction recovery, Bradbury gas-cap handling, live network preflight checks, direct-mode Intelligent Contract tests and reviewer-facing proof documentation. Its core value is the end-to-end adjudication workflow, not a generic chat or sample contract UI.
