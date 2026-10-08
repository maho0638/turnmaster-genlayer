# TurnMaster steward remediation — 8 October 2026

**Status as of 8 October 2026:** The dispute-response, retry, and timeout-refund implementation was merged to `main` as `65ede2a537dcff23874726c3ef765e521c15e667`. Main GitHub CI passed ([run 37776297944](https://github.com/maho0638/turnmaster-genlayer/actions/runs/37776297944)). A **new** upgraded escrow was deployed on Bradbury, separate from the historical immutable contract. The user exercised real testnet funding (0.1 GEN), claim, delivery, dispute, both-party evidence, GenLayer review (`undetermined`), one retry, a second evidence round, and a second GenLayer review (`undetermined`). The on-chain escrow remained 0.1 GEN after review. The **live seven-day timeout refund is not yet exercised**; recovery and early/late rejection were verified through controlled-time automated contract tests. These two evidence types must not be conflated.

## Steward request

"Please add an enforceable dispute-response rule before resolution, such as both parties submitting or a defined evidence deadline, and add a tested retry, appeal, timeout, or refund transition so an undetermined result cannot lock escrow indefinitely. The repository tests should cover early one-sided resolution, mixed fail and unverifiable verdicts, unavailable evidence, and recovery of all funds from undetermined."

## Contract response rule

- `open_dispute(reason)` creates a **48-hour** evidence deadline and a **fixed 7-day recovery deadline**, measured from the opening transaction.
- Either party may call `submit_dispute_evidence` **once per review round**, before the evidence deadline; duplicate submissions and nonparties are rejected.
- `resolve_dispute` **cannot run** until both parties respond OR the 48-hour evidence deadline has elapsed. The other party cannot be forced into premature judgment by a unilateral resolver.
- After the evidence deadline, only the submitted sources plus the original delivery URLs can be evaluated. An absent party cannot block the dispute indefinitely.
- Each acceptance criterion has an ordered `pass`, `fail`, or `unverifiable` verdict verified through GenLayer consensus. Any `unverifiable`, including mixed `fail`/`unverifiable`, yields **undetermined** without a transfer.
- Unreadable or HTTP 4xx/5xx evidence yields `unverifiable`, not pass or fail.

## One retry and guaranteed fund recovery

- While undetermined, **either party** may call `retry_dispute(reason)` **once** if enough time remains for a fresh 48-hour response window.
- Retrying resets per-round evidence submissions and creates a new response deadline, but **never extends** the absolute seven-day recovery deadline.
- When that deadline arrives, **either party** can call `refund_after_dispute_timeout()` from disputed **or** undetermined. The method refunds **100% of the escrowed reward to the original client** with no platform commission. This is an explicit **client-favoring fallback policy** when work cannot be verified; participants should be told before funding.
- The settlement guard prevents duplicate releases/refunds.

## Additional trapped-funds path closed

A client could previously request a revision near deadline and remain in `revision_requested`, while the worker would no longer be permitted to re-deliver after deadline. `refund_after_deadline` now covers `revision_requested` too.

## Regression coverage

`tests/test_contract_direct.py` adds:
- early one-sided resolution rejected for both client and worker;
- evidence response deadline honored and late submissions rejected;
- mixed `fail` and `unverifiable` results remain undetermined, with no payment;
- malformed verdicts and unavailable evidence yield undetermined;
- one authorized retry without deadline extension, second retry rejected;
- timeout refund callable by either party from disputed or undetermined; no double refund;
- expiry of revision-requested work returns funds.

## Live Bradbury evidence and rollout boundary

The historical Bradbury contract `0xAA85A41F899ED569d32B4CF0FDA2C55461d94482` is **immutable** and still uses the original rules. The upgraded Python source in `contracts/TurnMasterEscrow.py` was deployed as a **new job contract** for the live dispute test; earlier one-GEN delivery proof from the old contract is **not** evidence of the new dispute system.

Verified from the live screenshots and the TurnMaster contract reader on 8 October 2026:
- [New deployment transaction](https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57): upgrade-era test contract deployment finalized.
- [First GenLayer dispute review](https://explorer-bradbury.genlayer.com/tx/0xb8415c4497f15fd0d52785dd17f07d4afbeebb20055da3ca0193b6e1f4758744): finalized and showed `undetermined`, with funds retained.
- [One authorized retry transaction](https://explorer-bradbury.genlayer.com/tx/0x634bfff46cf3d89e7504195ac38ee7283f4e3183cf7057f2d152cf0a560356b4): finalized, returning the job to `disputed`, round 2; retry count 1/1.
- The second real-network decision again displayed `undetermined`; both parties had submitted in round 2 and **0.1 GEN** remained in escrow. No unauthorized release or refund was observed.
- The recovery deadline remained **15 October 2026 at 18:43:49** (shown in the user's Bradbury UI) after retry; live payout/refund is **not yet proven**. The time-advanced regression suite tests full refund from `undetermined` and `disputed`, calls before the deadline rejected, and repeat settlement blocked.

The site's repeated “Settlement transaction” child links are unrelated to real wallet sends; the SDK can surface duplicate triggered IDs. A separate UI fix and regression tests are tracked in [PR #11](https://github.com/maho0638/turnmaster-genlayer/pull/11). **Portal resubmission remains a separate user-approved step.**
