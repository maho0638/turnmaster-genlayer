# TurnMaster

TurnMaster is a testnet-only escrow workflow for work with explicit, measurable acceptance criteria. The client fixes job terms before deployment and funds the escrow in a separate transaction. A worker claims the funded job and submits public evidence. The client can accept or request a criterion-linked revision; either party can open a dispute. Only dispute evaluation uses GenLayer's nondeterministic evidence retrieval and interpretation. Balance, role, deadline, state-transition, and single-settlement rules are deterministic contract checks.

This repository contains a newly implemented application based on the TurnMaster V1 scope. It does not claim that the supplied GitHub repository had an existing contract or running product.

## Current application scope

- The board's illustrative records are all marked **SAMPLE** and are not chain records. A real contract can be loaded with its Bradbury address.
- A connected wallet can deploy one immutable-terms `TurnMasterEscrow` contract per job. Deployment and escrow funding are separate transactions. A new contract is displayed as unfunded until its funding transaction finalizes.
- Job terms, delivery, criteria, reward, deadline, current state, escrow balance, decision report, and relevant transaction links are read from the Bradbury contract. Users can re-import a contract by address after a page refresh.
- Wallet actions include fund, claim, submit delivery, accept, request revision, open dispute, submit dispute evidence, evaluate a dispute, refund an undelivered job after deadline, and cancel an unfunded job. Actions are enabled based on the connected wallet role and on-chain state.
- A page-session draft is explicitly labelled as local and is cleared on refresh. The app has no shared job indexer or persistent database.
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

The app is English-only and responsive. GenLayer operations use the official `genlayer-js` stable API and `testnetBradbury` preset (Bradbury Testnet, chain ID 4221, native currency GEN). TurnMaster deliberately keeps the injected wallet on the direct GenLayer Chain RPC (`https://rpc.testnet-chain.genlayer.com`) for standard `eth_*` signing while `genlayer-js` sends Intelligent Contract and `gen_*` traffic to the Bradbury GenLayer RPC (`https://rpc-bradbury.genlayer.com`). GenLayer documents that the Bradbury RPC can also proxy standard Ethereum calls; both endpoints use chain ID 4221. The split keeps wallet signing and Intelligent Contract RPC responsibilities explicit. Native GEN balance verification is performed with a direct read-only JSON-RPC request to the Bradbury endpoint rather than trusting the injected wallet's balance response. Contract actions remain paused when Bradbury state cannot be verified or the confirmed native balance is zero. Deployment sends a 0 GEN-value request to the consensus contract; the agreed reward is deposited later with the separate Fund action. The wallet still shows the applicable testnet network fee before approval.

## Deploy a preview on Vercel

The repository includes `vercel.json` and a Next.js production build script. It is connected to GitHub and automatically deploys `main` to [turnmaster-genlayer.vercel.app](https://turnmaster-genlayer.vercel.app). Changes are verified in GitHub before they are merged to `main`; deployment remains Git-driven rather than being changed manually in Vercel. The regular Sites preview continues to use its Cloudflare Worker adapter. Contract source is copied from the tested Python source into `public/` before development and builds so both Next.js and the Sites/Vite build can load it. No environment variables are required to test zero-fee Bradbury jobs. Keep the wallet on Bradbury Testnet and use only test GEN.

## GenLayer network and SDK

- Network: Bradbury Testnet
- Chain ID: `4221`
- Native currency: `GEN`
- MetaMask `eth_*` signing RPC used by TurnMaster: `https://rpc.testnet-chain.genlayer.com`
- Intelligent Contract / GenLayer RPC used by the SDK: `https://rpc-bradbury.genlayer.com`
- Bradbury Explorer: <https://explorer-bradbury.genlayer.com>
- GenLayer Chain Explorer: <https://explorer.testnet-chain.genlayer.com>
- Faucet: <https://testnet-faucet.genlayer.foundation>
- SDK dependency: [`genlayer-js`](https://www.npmjs.com/package/genlayer-js) stable `1.2.0`, pinned by the lockfile. The v2.0 release candidate targets the separate Consensus v0.6 preview and is not used for Bradbury.

The integration uses the stable SDK's Bradbury preset and methods for contract deployment, reads, writes, finalized receipts, transaction details, and triggered-transaction lookup. The SDK estimates EVM gas before opening the wallet; the wallet shows the fee quote for approval. The UI treats a transaction as successful only after the SDK reports `FINALIZED` and `FINISHED_WITH_RETURN`, then reloads contract state. Deployment address is taken from decoded transaction data/recipient and checked by reading the created job and verifying its client address. Explorer links use returned transaction hashes and imported contract addresses; no address or hash is generated by the UI.

## Contract behavior

`contracts/TurnMasterEscrow.py` implements a single milestone and immutable job terms per deployment. It checks positive reward, nonempty and sufficiently specific criteria, valid deadline, exact client funding, role authorization, delivery and evidence shape, and one settlement. Release commission is configured in basis points at deployment. The contract queues transfers through GenLayer's EVM recipient interface. The app does not claim those transfers were tested on a live network.

For disputes, the contract retrieves the public evidence URLs and asks GenLayer to evaluate each frozen criterion. If evidence cannot be retrieved, is empty, or the output is unusable, it records `undetermined` and queues no payout. Resolution requires one of the job's parties. A successful release pays the worker less the configured fee; a refund pays the client without a fee. A second settlement attempt is rejected.

## Tests

Install the test-only dependency and run GenLayer's direct-mode tests:

```bash
python -m pip install -r requirements-test.txt
python -m pytest tests/test_contract_direct.py -q
npm run test:network
```

The suite pins the direct runner to runtime `v0.2.12` because the then-current tool default attempted to fetch an unavailable `v0.3.0-rc7` artifact. Tests cover creation, invalid terms, exact funding, unauthorized actions, claim, deadline restrictions, delivery, revisions, acceptance, dispute evidence, evidence retrieval/evaluator outcomes, malformed or conflicting adjudication reports, undetermined results, payment/refund idempotency, and cancellation. The network unit test verifies TurnMaster's explicit split between the direct Chain RPC used for injected-wallet `eth_*` signing and the Bradbury GenLayer RPC used for Intelligent Contract traffic, including an independent Bradbury balance-read path. The local direct-mode VM mocks evidence retrieval and evaluator responses; this is not a substitute for a Bradbury transaction or validator consensus test. See [`QA_REPORT.md`](QA_REPORT.md) for the checks completed in this build.

## Testnet use and fee configuration

1. Install Node dependencies and start the app.
2. In the app, connect an EIP-1193 wallet and confirm the connected network label says **GenLayer Bradbury Testnet · 4221**.
3. Create a job with measurable criteria and a future deadline. Choose 0% release fee unless a valid fee recipient has been deliberately configured.
4. Review the deployment network, contract purpose, terms, reward amount (not deposited during deployment), fee, and wallet network fee. Approve in the wallet and wait for finalization.
5. Review the deployed contract address and Explorer transaction link. Use the separate **Fund** action to deposit exactly the agreed reward; the app then verifies the finalized transaction and re-reads escrow state.
6. Continue with claim, delivery, review, and dispute actions. Each signed action shows the network, contract address, value, purpose, and fee prompt before opening the wallet.

There is no shared on-chain board: retain the deployed contract address to re-open the job in a later session. Never enter or commit a private key or seed phrase. Use only testnet GEN. This is not ready for real funds and is not legal arbitration.

## Known limitations

- No TurnMaster contract has been deployed from this repository build. There are no real contract addresses, transactions, balances, or Explorer records to show.
- A funded compatible wallet and browser wallet were not available for the end-to-end Bradbury flow. Transaction behavior, protocol fees, child transfer finalization, and Explorer display need live testnet verification.
- Job records created from the app are not indexed or persisted centrally. A contract address is required to import the job after refreshing the page.
- The stable app interface uses public URLs for evidence and has no private-document upload or storage feature.
- A dispute that becomes `undetermined` has no retry or appeal flow. Funds remain in escrow; a recovery procedure is not implemented.
- Non-zero release commission is unavailable until a valid fee recipient is configured in the deployment environment. Zero-fee jobs are allowed.
- Browser-based desktop/mobile, keyboard, assistive-technology, and WebMCP runtime checks have not been completed; see the QA report.
