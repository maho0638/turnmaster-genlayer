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

- Evidence retrieval failures, HTTP 4xx/5xx statuses and missing/empty bodies resolve conservatively to `unverifiable`.
- Empty evidence never becomes a positive verdict.
- Only `pass`, `fail`, or `unverifiable` are accepted as criterion verdicts.
- Verdict count must equal the frozen criterion count.
- Any unverifiable criterion prevents an immediate worker release or client refund; it enters `undetermined` with a bounded retry-and-recovery path.
- Prompt text tells the evaluator to ignore instructions embedded in evidence and treat evidence as untrusted content.

## Dispute-response, retry and fund-recovery invariants

- The parties get a 48-hour evidence response window. Either both submit their evidence, or the window expires, before resolution can occur.
- Evidence submission is one per party per round and is disabled after the response deadline; each new round is explicit.
- An inconclusive verdict enters `undetermined`; either party can request exactly one retry if a full new response window remains.
- The absolute 7-day recovery deadline is anchored to the **first** dispute and is never extended by a retry.
- When the recovery deadline passes, **either party** can trigger a **100% client refund** even if the other refuses to participate. This intentionally favors the client over unverified work and should be disclosed before funding.
- A revision-requested job with no redelivery can be refunded after the original job deadline.
- The old already-deployed contract does **not** receive these upgrades; new deployed jobs must reference an updated immutable source.

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
- In the new contract revision, `undetermined` has one bounded retry and a fixed 7-day full refund recovery path. Previous on-chain deployments are immutable and do not inherit this rule.
- A signed compact-contract Bradbury deployment is finalized; the remaining live gap is exercising the full multi-wallet fund → claim → deliver → review → settle lifecycle on that build.
- Testnet validator/model behavior is external infrastructure and can change independently of the app.
