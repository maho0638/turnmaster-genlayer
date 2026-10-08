# TurnMaster architecture

## Purpose

TurnMaster separates deterministic escrow rules from the subjective question of whether real work satisfies natural-language acceptance criteria. Deterministic state transitions stay in the contract; GenLayer consensus is used only where ordinary smart contracts cannot independently reason over public evidence.

## Components

### Browser application

The Next.js frontend creates job terms, connects an EIP-1193 wallet, displays Bradbury state, gates actions by role/state, prevents duplicate submissions when a transaction result is unknown, and links every known transaction/contract to the public Explorer.

### TurnMasterEscrow Intelligent Contract

Each deployed contract represents one job. It stores:
- client and assigned worker;
- title, scope, required delivery and evidence type;
- frozen acceptance criteria;
- deadline and exact reward;
- release-fee configuration;
- delivery/evidence data;
- dispute evidence and decision report;
- terminal status.

### GenLayer consensus path

For disputes, the contract:
1. loads the frozen criteria;
2. combines worker and client evidence URLs;
3. retrieves each public source with `gl.nondet.web.get`;
4. asks the model for one ordered verdict per criterion;
5. uses `gl.eq_principle.prompt_comparative` so validator outputs must agree;
6. validates the shape and allowed verdict vocabulary;
7. deterministically maps verdicts to release, refund or undetermined.

## State lifecycle

`open → funded → claimed → delivered`

From `delivered`:
- direct client acceptance → `resolved`;
- revision request → `revision_requested → delivered`;
- dispute → `disputed` (48h two-party evidence response period) → `resolved | undetermined`.
- `undetermined` → one bounded `retry_dispute` → `disputed`, without moving the original 7-day recovery deadline.
- `disputed | undetermined` after 7 days → `refund_after_dispute_timeout` → `resolved` (100% to client; either party may trigger).
- `revision_requested` after job deadline → `refund_after_deadline` → `resolved`.

An unfunded job can be cancelled. A funded/claimed but undelivered job can be refunded by the client after the deadline.

## Enforceable dispute evidence timing

Opening a dispute records immutable first-dispute recovery and round-specific evidence deadlines. Resolution is blocked while only one party responded and the response window is still active. New evidence is rejected after the evidence deadline; absence cannot stall the fixed seven-day recovery fallback. HTTP error evidence becomes unverifiable.

## Trust boundaries

- Wallet signing remains with the user's EIP-1193 wallet.
- The frontend cannot mint a successful state; it re-reads state from the Intelligent Contract after finalization.
- Evidence is public HTTPS content and is treated as untrusted input.
- Model output is untrusted until it passes contract-side structure and verdict checks.
- The app has no private key storage and no server-side custody.
- Sample board records are explicitly marked and never presented as live on-chain data.

## Bradbury transaction handling

The app uses the official Bradbury GenLayer RPC and verifies chain ID 4221. Stable `genlayer-js` can provide a tight outer EVM gas estimate, while the current Bradbury sequencer enforces a 2^24 per-transaction gas ceiling. TurnMaster adds bounded headroom but caps the wallet request below the sequencer ceiling. The contract was compacted so its live no-broadcast deploy preflight fits under that envelope.
