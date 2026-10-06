# TurnMaster security model

TurnMaster is testnet software. It is not legal arbitration and must not be used with real funds.

## Contract invariants

- Only the client can fund, accept, request a revision, cancel an unfunded job, or reclaim an undelivered job after the deadline.
- The client cannot claim their own job.
- Delivery is accepted only from the assigned worker.
- Funding must equal the agreed reward exactly.
- Acceptance criteria are fixed when the contract is deployed.
- Public evidence links must use HTTPS and stay within the contract's bounded list size.
- A resolved job cannot be settled twice.
- Refunds do not charge a release fee.

## Consensus safety

- Evidence retrieval failures resolve conservatively to `unverifiable`.
- Empty evidence never becomes a positive verdict.
- Only `pass`, `fail`, or `unverifiable` are accepted as criterion verdicts.
- Verdict count must equal the frozen criterion count.
- Any unverifiable criterion blocks both worker release and client refund.
- Prompt text tells the evaluator to ignore instructions embedded in evidence and treat evidence as untrusted content.

## Transaction safety

- Every write requires explicit wallet approval.
- The app verifies Bradbury chain ID 4221 before enabling writes.
- Native Bradbury GEN is checked separately before deployment.
- A submitted-but-unverified transaction hash is stored in session storage and blocks duplicate writes until the user checks Explorer.
- Deployment, funding and later contract actions are separate transactions so a deployment cannot silently transfer the job reward.

## Data and privacy

- No private keys or seed phrases are stored.
- No private file upload exists; the evidence model is intentionally public URL based.
- Browser-only drafts are clearly marked and are not represented as on-chain records.
- The project has no shared indexer; a real contract is reopened by its public address.

## Known residual risks

- Public web evidence can change after submission; TurnMaster currently records URLs, not immutable content archives.
- An `undetermined` terminal dispute has no appeal/retry recovery flow in V1.
- One complete signed Bradbury lifecycle still needs to be demonstrated on the compact-contract release.
- Testnet validator/model behavior is external infrastructure and can change independently of the app.
