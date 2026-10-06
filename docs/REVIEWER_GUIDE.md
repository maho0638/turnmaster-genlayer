# TurnMaster reviewer guide

TurnMaster is a GenLayer-native job escrow and dispute-resolution workflow on Bradbury Testnet (chain 4221). The fastest public overview is `/reviewer` on the production site.

## What to verify

1. Open `https://turnmaster-genlayer.vercel.app` and confirm the app identifies Bradbury Testnet / chain 4221.
2. Open **Create a job** and enter a future deadline, reward, concrete delivery definition, and at least one measurable acceptance criterion. Use a 0% release fee unless a fee recipient is configured.
3. Connect an EIP-1193 wallet. TurnMaster must verify native Bradbury GEN before deployment is enabled. The app never requests a private key or seed phrase.
4. Deploy the frozen terms. Deployment sends no job reward; the reward is transferred later through **Fund**.
5. Fund the job from the client wallet with exactly the agreed reward.
6. From a different wallet, claim the job and submit a delivery description plus public HTTPS evidence.
7. From the client wallet, either accept the delivery, request a revision, or open a dispute. During a dispute, either party can add evidence.
8. Run the GenLayer review. Inspect the stored decision report, per-criterion verdicts, contract state, Explorer transaction, and any triggered settlement transaction.

## Expected result

A successful job ends with a Bradbury contract that can be reopened by address and re-read without trusting the frontend. Its immutable job terms, delivery evidence, decision report, escrow state and terminal status must be visible.

For a disputed job:
- every criterion `pass` → release to worker;
- at least one verified `fail` with no unverifiable criterion → refund client;
- missing, ambiguous, contradictory, inaccessible or malformed evidence → `undetermined`, no payout.

## GenLayer-specific behavior

The Intelligent Contract retrieves submitted public evidence with `gl.nondet.web.get(...)` and asks validators to agree on the ordered criterion verdicts with `gl.eq_principle.prompt_comparative(...)`. The model is not used as a chatbot; its output is constrained by deterministic contract checks and a conservative no-payout fallback.

## Public proof

- Production: https://turnmaster-genlayer.vercel.app
- Reviewer proof: https://turnmaster-genlayer.vercel.app/reviewer
- Repository: https://github.com/maho0638/turnmaster-genlayer
- Contract: `contracts/TurnMasterEscrow.py`
- QA: `QA_REPORT.md`
- Architecture: `docs/ARCHITECTURE.md`
- Security model: `docs/SECURITY_MODEL.md`
- CI: https://github.com/maho0638/turnmaster-genlayer/actions

## Verified live deployment

- Contract: https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482
- Deployment transaction: https://explorer-bradbury.genlayer.com/tx/0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403
- Shareable app view: https://turnmaster-genlayer.vercel.app/?contract=0xAA85A41F899ED569d32B4CF0FDA2C55461d94482
- Consensus state observed after the finalization window: FINALIZED.

## Honest current limit

The compact contract has a successful user-signed finalized Bradbury deployment. The remaining end-to-end gap is the complete multi-wallet lifecycle on this build: fund → claim → deliver → dispute/accept → settle. The project does not claim that later lifecycle has already been completed live.
