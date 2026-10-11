# TurnMaster QA report — 11 October 2026

## Audit target

This report covers the local worktree based on PR #13 branch `fix/real-onchain-board-steward`, base commit `4bdbda0a4cb13233b489030cd37fc7f784f3535f`, plus the uncommitted changes shown in `git status`. It does not describe a GitHub or Vercel deployment.

## Steward requirements checked

- The public board initializes with an empty list. The only job details shown are constructed after a successful `get_job()` read for a configured, imported, or directory-listed contract. Read errors do not fall back to fabricated jobs.
- The UI no longer calls its live-chain status chip a “sample”; styles and JSX use `chain-status-label`. This is a naming cleanup, not a data-flow change.
- The pinned `genlayer-js` package includes a separate `connect()` helper that can request wallet Snaps. TurnMaster does not call that helper: reads use an account-free client and writes use the EIP-1193 provider directly. Static regression checks cover this path. An actual MetaMask extension reproduction against the current build was not available in this environment, so the steward's browser-specific `wallet_getSnaps` report is not claimed closed here.
- Deployment recovery keeps a transaction hash until the finalized transaction, deployed contract address, and matching client are verified. Wallet lock, account, chain and native-balance checks are covered by unit tests.
- Shared discovery is still conditional: a directory contract must be deployed and its address configured in the visitor-facing build. That deployment/configuration has not been performed here.
- Live seven-day escrow recovery remains pending until the on-chain deadline and a signed refund can be verified. Controlled-time contract tests do not count as a live refund.

## Local verification

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Clean Node install | PASS | `npm ci` completed with Node 24.19.0; project engine requires Node `>=22.13.0`. |
| ESLint | PASS | `npm run lint` |
| Full TypeScript | PASS | `npx tsc --noEmit` |
| Targeted TypeScript safety checks | PASS | Included in `npm run test:network` |
| JavaScript regression suite | PASS | `npm run test:regression`: 13 test files, 13 passed, 0 failed |
| Network / wallet regression suite | PASS | `npm run test:network`: 9 test files passed, then strict safety type check passed |
| Project proof | PASS | `npm run test:project-proof` |
| Real-chain-only board assertions | PASS | `npm run test:real-board` |
| Registry | PASS | `npm run test:registry` |
| Contract proof | PASS | `npm run test:contract-proof` |
| Python contract regressions | PASS | `tests/test_contract_direct.py` and `tests/test_directory_direct.py`: 30 passed |
| GenVM contract lint | PASS; validation incomplete | `genvm-lint lint` passed for both escrow and directory contracts (3 checks each). `genvm-lint check` cannot complete SDK validation because `/root/.cache/genvm-linter` is read-only and the linter cannot fetch its GenVM artifact in this environment. |
| `npm run build:vercel` local production build | PASS | Next.js 16.3.4 Turbopack compiled successfully, completed TypeScript, generated all static pages, and finalized the production build. This ran locally and did not contact Vercel. |
| Local production HTTP smoke tests | PASS | Started `next start` on `127.0.0.1:3417`; `/`, `/reviewer`, `/project-proof.json`, and `/TurnMasterEscrow.py` each returned HTTP 200 and expected content. Server stopped after checks. |
| Live Bradbury RPC, board RPC, deploy preflight | BLOCKED | All three read-only commands fail DNS resolution with `EAI_AGAIN` for `rpc-bradbury.genlayer.com`, including the elevated retry. No transaction was signed or broadcast. |

The production build shown in the user's Windows console succeeded on the earlier local copy. It is not counted as proof for the later uncommitted changes in this audit worktree.

## Findings corrected during this audit

- Removed obsolete README and QA claims that the dashboard showed example/sample records.
- Corrected documentation that claimed browser-only drafts were available; the current interface has no draft action and never mixes drafts into the board.
- Renamed the live status chip's CSS class from `sample-label` to `chain-status-label`, removed unused sample-card styles, and added regression assertions against restoring those misleading names.
- Updated the reviewer guide to state precisely that the installed SDK contains a Snap-capable helper, while the app does not invoke it. The actual external MetaMask issue remains unverified.
- Reworked the contract's invalid adjudication fallback to avoid raising a bare `ValueError`; invalid or malformed verdicts still deterministically become `unverifiable`.
- The final contract-source parity test caught a stale public copy after the contract edit. Ran `scripts/sync-contract-source.mjs`; the source and public copy are now identical, and the parity regression test passes.

## Changed files

- `.github/workflows/verify.yml`, `package.json`, `scripts/sync-contract-source.mjs`
- `README.md`, `QA_REPORT.md`, `docs/ARCHITECTURE.md`, `docs/REVIEWER_GUIDE.md`, `docs/SECURITY_MODEL.md`
- `app/contract-workflow.tsx`, `app/page.tsx`, `app/globals.css`, `app/premium.module.css`
- `contracts/TurnMasterEscrow.py`, `contracts/TurnMasterDirectory.py`, `public/TurnMasterEscrow.py`, `public/TurnMasterDirectory.py`
- `lib/deploy-readiness.mjs`, `lib/genlayer-network.mjs`, `lib/turnmaster-chain.ts`, `lib/bradbury-wallet.mjs`, `lib/job-directory.mjs`, `lib/pending-deployment.mjs`, `lib/verified-board.mjs`
- `tests/contract-source.test.mjs`, `tests/project-proof.test.mjs`, `tests/real-board.test.mjs`, `tests/bradbury-wallet.test.mjs`, `tests/job-directory.test.mjs`, `tests/pending-deployment.test.mjs`, `tests/test_directory_direct.py`, `tests/verified-board.test.mjs`, `tests/verified-board.typecheck.ts`, `tests/wallet-lock.test.mjs`

## Current status

The local production build, all JavaScript regressions, full TypeScript and ESLint, local production HTTP smoke tests, GenVM lint checks, and 30 direct contract tests pass. This audit cannot certify every external integration: live read-only checks were blocked by RPC DNS; current-build MetaMask behavior needs a real extension; shared discovery awaits a directory deployment/configuration; GenVM semantic validation awaits access to its cache/artifact; and the real seven-day refund awaits its deadline. No checks were weakened, and no chain write was attempted.
