# TurnMaster steward remediation — 8 October 2026

**Status:** Code and regression tests proposed in `fix/steward-dispute-recovery`. The previously deployed contract is immutable and **does not** contain these features. Do not resubmit or deploy production until CI, size/gas preflight, and live proof on a newly deployed contract all pass.

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

## Rollout boundary

The original deployed Bradbury contract `0xAA85A41F899ED569d32B4CF0FDA2C55461d94482` is **not upgradeable**. Until a new contract is deployed from the exact reviewed Python source, the production app and historic contract continue to represent the previous behavior.

The GitHub PR deliberately remains unmerged to avoid an automatic Vercel production deployment before approval and real-network verification. All claims about the upgraded contract should be backed by the new source SHA, CI logs and new finalised Bradbury transactions, not the historical one-GEN accepted-delivery proof.
