# TurnMaster

TurnMaster is a testnet-only escrow workflow for work with explicit, measurable acceptance criteria. The client fixes job terms before deployment and funds the escrow in a separate transaction. A worker claims the funded job and submits public evidence. The client can accept or request a criterion-linked revision; either party can open a dispute. Only dispute evaluation uses GenLayer's nondeterministic evidence retrieval and interpretation. Balance, role, deadline, state-transition, and single-settlement rules are deterministic contract checks.

This repository contains a newly implemented application based on the TurnMaster V1 scope. It does not claim that the supplied GitHub repository had an existing contract or running product.

## Current application scope

- The board has no illustrative or placeholder jobs. It starts empty, then shows a record only after reading and verifying that Bradbury contract with `get_job()`. Existing published contracts are included as addresses; users can also open another contract by address.
- A connected wallet can deploy one immutable-terms `TurnMasterEscrow` contract per job. Deployment and escrow funding are separate transactions. A new contract is displayed as unfunded until its funding transaction finalizes.
- Job terms, delivery, criteria, reward, deadline, current state, escrow balance, decision report, and relevant transaction links are read from the Bradbury contract. Users can re-import a contract by address after a page refresh.
- Wallet actions include fund, claim, submit delivery, accept, request revision, open dispute, submit dispute evidence, evaluate a dispute, refund an undelivered job after deadline, and cancel an unfunded job. Actions are enabled based on the connected wallet role and on-chain state.
- The board contains only verified on-chain jobs; it does not put local drafts on the board. The app can read a shared, on-chain job directory when `NEXT_PUBLIC_TURNMASTER_DIRECTORY_ADDRESS` is configured; without that deployment setting, newly created addresses remain local to the creator's browser.
- The app does not store private keys, seed phrases, or uploaded documents. Evidence is supplied as public HTTPS links.
- The planned release fee is shown before contract deployment and applies only when a reward is released to a worker. Refunds have a zero fee. The default form value is 1.5%, but a non-zero fee cannot be deployed unless `NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT` contains a valid address. This build has no configured recipient; set the fee to 0% for a test deployment.

## Requirements and local run

- Node.js `>=22.13.0`
- Python 3.12+ for GenLayer contract tests
- An EIP-1193 wallet configured for Bradbury Testnet and test GEN for transactions

```bash
npm ci
npm run dev
```

The app is English-only and responsive. GenLayer operations use the `genlayer-js` 1.2.0 package pinned by the lockfile and the `testnetBradbury` preset (Bradbury Testnet, chain ID 4221, native currency GEN). Per GenLayer's current network configuration, MetaMask and the SDK use the GenLayer RPC (`https://rpc-bradbury.genlayer.com`), which handles Intelligent Contract methods and proxies standard `eth_*` calls. The direct chain RPC (`https://rpc.testnet-chain.genlayer.com`) is retained only for diagnostics/direct L2 access. Native GEN verification uses a separate read-only request to the Bradbury RPC. The current Bradbury sequencer enforces a 16,777,216 per-transaction gas ceiling, while exact `eth_estimateGas` values can be too tight for ConsensusMain submissions. TurnMaster therefore uses bounded gas headroom with a 16,700,000 safety cap. The TurnMaster contract was compacted so a live read-only deploy preflight estimates about 10.6M gas and succeeds under that capped transaction envelope. Deployment sends 0 GEN as the job-value portion of the outer transaction; the agreed reward is funded later with the separate Fund action.

## Deploy a preview on Vercel

The repository includes `vercel.json` and a Next.js production build script. It is connected to GitHub and automatically deploys `main` to [turnmaster-genlayer.vercel.app](https://turnmaster-genlayer.vercel.app). Changes are verified in GitHub before they are merged to `main`; deployment remains Git-driven rather than being changed manually in Vercel. The regular Sites preview continues to use its Cloudflare Worker adapter. Contract source is copied from the tested Python source into `public/` before development and builds so both Next.js and the Sites/Vite build can load it. No environment variables are required to test zero-fee Bradbury jobs. Keep the wallet on Bradbury Testnet and use only test GEN.

## GenLayer network and SDK

- Network: Bradbury Testnet
- Chain ID: `4221`
- Native currency: `GEN`
- MetaMask default RPC and Intelligent Contract RPC: `https://rpc-bradbury.genlayer.com`
- Direct GenLayer Chain RPC (diagnostics/direct L2 only): `https://rpc.testnet-chain.genlayer.com`
- Bradbury Explorer: <https://explorer-bradbury.genlayer.com>
- GenLayer Chain Explorer: <https://explorer.testnet-chain.genlayer.com>
- Faucet: <https://testnet-faucet.genlayer.foundation>
- SDK dependency: [`genlayer-js`](https://www.npmjs.com/package/genlayer-js) `1.2.0`, pinned by the lockfile. The v2.0 release candidate targets the separate Consensus v0.6 preview and is not used for Bradbury.

The integration uses the stable SDK's Bradbury preset and methods for contract deployment, reads, writes, finalized receipts, transaction details, and triggered-transaction lookup. The SDK estimates EVM gas before opening the wallet; the wallet shows the fee quote for approval. The UI treats a transaction as successful only after the SDK reports `FINALIZED` and `FINISHED_WITH_RETURN`, then reloads contract state. Deployment address is taken from decoded transaction data/recipient and checked by reading the created job and verifying its client address. Explorer links use returned transaction hashes and imported contract addresses; no address or hash is generated by the UI.

## Contract behavior

`contracts/TurnMasterEscrow.py` implements a single milestone and immutable job terms per deployment. It checks positive reward, nonempty and sufficiently specific criteria, valid deadline, exact client funding, role authorization, delivery and evidence shape, and one settlement. Release commission is configured in basis points at deployment. The contract queues transfers through GenLayer's EVM recipient interface. The seven-day refund path was subsequently exercised as an actual finalized Bradbury client refund on 15 October 2026; other payout paths are not claimed live unless separately evidenced.

For disputes, the contract retrieves the public evidence URLs and asks GenLayer to evaluate each frozen criterion. If evidence cannot be retrieved, responds with HTTP 4xx/5xx, is empty, or the output is unusable, it records `undetermined` and queues no immediate payout. Upgraded contracts permit one retry and eventually a fixed-time full refund. Resolution requires one of the job's parties. A successful release pays the worker less the configured fee; a refund pays the client without a fee. A second settlement attempt is rejected.

## Tests

Install the test-only dependency and run GenLayer's direct-mode tests:

```bash
python -m pip install -r requirements-test.txt
python -m pytest tests/test_contract_direct.py -q
npm run test:network
```

The suite pins the direct runner to runtime `v0.2.12` because the then-current tool default attempted to fetch an unavailable `v0.3.0-rc7` artifact. Tests cover creation, invalid terms, exact funding, unauthorized actions, claim, deadline restrictions, delivery, revisions, acceptance, dispute evidence, evidence retrieval/evaluator outcomes, malformed or unverifiable adjudication reports, undetermined results, payment/refund idempotency, and cancellation. Network tests lock MetaMask and the SDK to the official Bradbury RPC, verify independent native-GEN reads, and verify bounded transaction gas headroom. A live read-only deploy preflight builds the exact ConsensusMain deployment, intercepts it before broadcast, confirms the live estimate fits below the Bradbury cap, and verifies the capped transaction with `eth_call`. The direct-mode VM mocks evidence retrieval and evaluator responses; this is not a substitute for a signed Bradbury consensus transaction. See [`QA_REPORT.md`](QA_REPORT.md) for the checks completed in this build.

## Testnet use and fee configuration

1. Install Node dependencies and start the app.
2. In the app, connect an EIP-1193 wallet and approve the official Bradbury network (`https://rpc-bradbury.genlayer.com`, chain 4221). If MetaMask already has chain 4221 from an older TurnMaster build, use **Fix Bradbury RPC** and make the Bradbury URL the network's Default RPC URL.
3. Create a job with measurable criteria and a future deadline. Choose 0% release fee unless a valid fee recipient has been deliberately configured.
4. Review the deployment network, contract purpose, terms, reward amount (not deposited during deployment), fee, and wallet network fee. Approve in the wallet and wait for finalization.
5. Review the deployed contract address and Explorer transaction link. Use the separate **Fund** action to deposit exactly the agreed reward; the app then verifies the finalized transaction and re-reads escrow state.
6. Continue with claim, delivery, review, and dispute actions. Each signed action shows the network, contract address, value, purpose, and fee prompt before opening the wallet.

The LIVE shared on-chain board uses `contracts/TurnMasterDirectory.py`. Its Bradbury address is `0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8`, which is configured in production as `NEXT_PUBLIC_TURNMASTER_DIRECTORY_ADDRESS`. The directory was seeded with existing TurnMaster addresses and a newly deployed job was found by a clean browser. To set up a different environment, deploy a new directory and configure its public address. New job contracts then enqueue a finalized registration call to the directory; the board verifies each listed job directly with `get_job()` and reads the latest 100 directory entries. Without that directory setting in another environment, retain each job address or share its link to re-open it. Never enter or commit a private key or seed phrase. Use only testnet GEN. This is not ready for real funds and is not legal arbitration.

## Latest verified steward proof (15 October 2026)

- [Finalized 0.1 test GEN client refund](https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5): `refund_after_dispute_timeout()`, `resolved`, `escrow_wei=0` and no platform fee.
- [Upgraded escrow contract](https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950); [public directory](https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8); [third genuinely deployed job](https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15) discovered in wallet-free incognito.
- [Detailed live-use and MetaMask remediation evidence](docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md). No independent visitor-analytics numbers are claimed.

## Reviewer proof and Portal-ready evidence

For stewards and GenLayer Portal reviewers, the production build now includes a dedicated read-only proof surface at [turnmaster-genlayer.vercel.app/reviewer](https://turnmaster-genlayer.vercel.app/reviewer). It explains the contract lifecycle, consensus path, safety invariants, public artifacts, wallet prerequisites, and test evidence. The seven-day **actual signed full client refund finalized on 15 October 2026**; direct contract tests additionally cover early calls and idempotency. See [the verified live evidence report](docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md).

Submission and technical evidence are kept with the source:

- [Portal submission copy](PORTAL_SUBMISSION.md)
- [Reviewer guide](docs/REVIEWER_GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Machine-readable project proof](public/project-proof.json)
- [QA report](QA_REPORT.md)
- [Public CI history](https://github.com/maho0638/turnmaster-genlayer/actions)

The reviewer materials distinguish genuine Bradbury transactions, controlled-time contract tests, and wallet prerequisites. In particular, the Deploy button is clickable even without a wallet but will not broadcast until chain, balance and authorization checks pass.

## Known limitations

- An upgraded TurnMasterEscrow deployment and two inconclusive dispute reviews were verified on Bradbury, including a funded 0.1 GEN escrow and one retry. See the steward remediation report for verified transaction references.
- The seven-day timeout refund **has been executed and finalized** with a real client-signed Bradbury transaction on 15 October 2026; escrow reads zero afterwards. Further deployments still require a test GEN wallet and explicit approval.
- Shared discovery is LIVE: directory `0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8` is configured in the production build; the 12 October newly deployed job was verified visible alongside the other two in wallet-free Chrome Incognito. Only the most recent 100 directory entries are requested.
- The stable app interface uses public URLs for evidence and has no private-document upload or storage feature.
- The original deployed V1 is immutable and does not have undetermined-dispute recovery. The main branch now has the upgraded contract; newly deployed jobs use the 48-hour evidence-response rule, one retry, and fixed seven-day refund.
- Non-zero release commission is unavailable until a valid fee recipient is configured in the deployment environment. Zero-fee jobs are allowed.
- A fresh real Chrome + MetaMask connection and permission-disconnect check passed; comprehensive mobile, accessibility, other-wallet and WebMCP testing is still not claimed. See the QA report.


## Pro verification features

TurnMaster supports shareable contract URLs in the form `/?contract=0x…`. Opening one stores that public contract address in the browser registry, re-reads the latest Bradbury state, and surfaces it in the normal work board without requiring a wallet connection. The live contract panel can copy the address, generate the share link, copy a machine-readable `turnmaster-proof-v1` audit receipt from public state, and open the Explorer.

A real compact-contract deployment is finalized on Bradbury:
- Contract: https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482
- Deployment transaction: https://explorer-bradbury.genlayer.com/tx/0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403
- Shareable app view: https://turnmaster-genlayer.vercel.app/?contract=0xAA85A41F899ED569d32B4CF0FDA2C55461d94482

CI additionally runs GenVM contract lint, direct contract tests, live RPC/preflight checks, reviewer/project-proof route smoke tests, and the frontend production build.


## Steward remediation and deployment UX (8–10 October 2026)

The improved source was merged, and a new Bradbury job verified funding, claim, delivery, two inconclusive consensus reviews, one permitted retry, and preservation of 0.1 test GEN. The 48-hour evidence-response and seven-day client recovery rules passed direct contract tests; the live seven-day refund remains unexecuted. See [the remediation report](docs/STEWARD_REMEDIATION_2026_10_08.md).

**10 October steward follow-up:** the **Deploy terms on Bradbury** button used to be hard-disabled when a wallet was disconnected, RPC or native GEN verification failed, or a non-zero release fee had no recipient. It now remains clickable to show an actionable reason and a direct connection/RPC/faucet/fee remedy. The underlying wallet, chain, fee and duplicate-transaction safeguards remain enforced. A reviewer without a funded wallet can open a finalized Bradbury deployment without signing. See [the reviewer walkthrough](docs/REVIEWER_GUIDE.md).
