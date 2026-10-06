import type { Metadata } from "next";
import Link from "next/link";
import styles from "./reviewer.module.css";

export const metadata: Metadata = {
  title: "TurnMaster — Reviewer Proof",
  description: "A compact, verifiable walkthrough of TurnMaster's GenLayer integration, contract lifecycle, security model, and test evidence.",
};

const lifecycle = [
  ["01", "Create", "Freeze the title, work scope, deliverable, acceptance criteria, deadline, reward, evidence type, and optional release fee."],
  ["02", "Deploy", "Deploy one TurnMasterEscrow Intelligent Contract per job on Bradbury. The reward is not transferred during deployment."],
  ["03", "Fund", "The client deposits exactly the agreed reward in a separate wallet-confirmed transaction."],
  ["04", "Claim", "A non-client wallet claims the funded job before the deadline and becomes the assigned worker."],
  ["05", "Deliver", "The worker submits a delivery description and public HTTPS evidence links against the frozen criteria."],
  ["06", "Review", "The client can accept, request a revision, or open a dispute. Both parties can add dispute evidence."],
  ["07", "Consensus", "For a dispute, the contract retrieves public evidence and asks GenLayer to produce one ordered verdict per frozen criterion."],
  ["08", "Settle", "All-pass releases to the worker; a verified fail refunds the client; unverifiable evidence leaves the case undetermined with no payout."],
] as const;

const checks = [
  ["Immutable terms", "Acceptance criteria, reward, deadline and delivery definition are fixed in contract storage at deployment."],
  ["Role gates", "Client-only, worker-only and party-only transitions are enforced in the Intelligent Contract, not only in the UI."],
  ["Exact funding", "The payable fund call must equal the agreed reward exactly."],
  ["Independent evidence retrieval", "Dispute resolution retrieves the submitted public HTTPS evidence from inside the GenLayer execution path."],
  ["Conservative resolution", "Missing, empty, ambiguous or malformed evidence becomes undetermined; no reward or refund is released."],
  ["Settlement idempotency", "Resolved jobs cannot be paid or refunded a second time."],
  ["Transaction safety", "The UI persists unknown submitted hashes and blocks duplicate writes until the user checks the Explorer result."],
  ["Bradbury-aware gas handling", "The deployment path uses bounded outer-transaction headroom and stays below Bradbury's current per-transaction gas ceiling."],
] as const;

const artifacts = [
  ["Production app", "https://turnmaster-genlayer.vercel.app", "Open the public work board and wallet flow."],
  ["GitHub repository", "https://github.com/maho0638/turnmaster-genlayer", "Complete source, tests, CI workflow and documentation."],
  ["Intelligent Contract", "https://github.com/maho0638/turnmaster-genlayer/blob/main/contracts/TurnMasterEscrow.py", "GenLayer escrow, evidence retrieval, consensus review and settlement logic."],
  ["Reviewer guide", "https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/REVIEWER_GUIDE.md", "Copyable review steps and expected outcomes."],
  ["Architecture", "https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/ARCHITECTURE.md", "Trust boundary, data flow and state lifecycle."],
  ["Security model", "https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/SECURITY_MODEL.md", "Failure modes, invariants and explicit non-goals."],
  ["QA report", "https://github.com/maho0638/turnmaster-genlayer/blob/main/QA_REPORT.md", "Verified checks, limits and live Bradbury preflight evidence."],
  ["GitHub Actions", "https://github.com/maho0638/turnmaster-genlayer/actions", "Public CI history for lint, types, unit tests, live RPC checks, build and contract tests."],
  ["GenLayer Networks docs", "https://docs.genlayer.com/developers/networks", "Official Bradbury RPC, chain ID, currency and Explorer reference."],
] as const;

export default function ReviewerPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <Link className={styles.brand} href="/" aria-label="Back to TurnMaster work board"><span className={styles.brandBars} aria-hidden="true"><i /><i /><i /></span>turnmaster</Link>
          <div className={styles.heroLinks}><Link href="/">Open app</Link><a href="https://github.com/maho0638/turnmaster-genlayer" target="_blank" rel="noreferrer">GitHub ↗</a></div>
        </div>
        <div className={styles.kicker}>REVIEWER PROOF · GENLAYER BRADBURY · CHAIN 4221</div>
        <h1>Work is subjective. Payment should not be.</h1>
        <p className={styles.lede}>TurnMaster is a GenLayer-native escrow and dispute-resolution workflow for client/worker jobs. It freezes measurable terms on-chain, accepts public delivery evidence, and uses GenLayer consensus to adjudicate disputed criteria before release or refund.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/">Try the work board</Link>
          <a className={styles.secondary} href="https://github.com/maho0638/turnmaster-genlayer/blob/main/PORTAL_SUBMISSION.md" target="_blank" rel="noreferrer">Portal submission copy ↗</a>
        </div>
        <div className={styles.signalGrid} aria-label="Project verification summary">
          <div><span>NETWORK</span><b>Bradbury</b><small>GenLayer testnet · 4221</small></div>
          <div><span>CORE LOGIC</span><b>Intelligent Contract</b><small>Python · GenLayer runtime</small></div>
          <div><span>DECISION INPUT</span><b>Public evidence</b><small>HTTPS retrieval + frozen criteria</small></div>
          <div><span>FAILURE DEFAULT</span><b>No payout</b><small>Unverifiable → undetermined</small></div>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>01</span><div><p>WHY THIS NEEDS GENLAYER</p><h2>A real trust problem, not an LLM wrapper</h2></div></div>
        <div className={styles.twoCol}>
          <article className={styles.card}><h3>The problem</h3><p>Freelance and agent work often ends with a subjective question: “Does this delivery actually satisfy the agreement?” Traditional smart contracts can lock funds, but cannot independently read public evidence and reason over natural-language acceptance criteria.</p></article>
          <article className={styles.card}><h3>The GenLayer role</h3><p>TurnMaster moves only that subjective decision into the Intelligent Contract. Validators retrieve the evidence, evaluate the exact frozen criteria, and converge on ordered verdicts. Deterministic rules then decide release, refund, or no payout.</p></article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>02</span><div><p>FULL LIFECYCLE</p><h2>The interface calls the contract from agreement to settlement</h2></div></div>
        <div className={styles.timeline}>{lifecycle.map(([n, title, body]) => <article className={styles.step} key={n}><span>{n}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>03</span><div><p>CONSENSUS PATH</p><h2>What happens inside a disputed review</h2></div></div>
        <div className={styles.flow}>
          <div><b>Frozen job terms</b><span>scope · deliverable · criteria</span></div><i>→</i>
          <div><b>Public evidence</b><span>worker + client HTTPS links</span></div><i>→</i>
          <div className={styles.flowHot}><b>GenLayer</b><span>web retrieval + comparative consensus</span></div><i>→</i>
          <div><b>Criterion verdicts</b><span>pass · fail · unverifiable</span></div><i>→</i>
          <div><b>Settlement</b><span>release · refund · no payout</span></div>
        </div>
        <p className={styles.codeNote}>Contract primitives used: <code>gl.nondet.web.get(...)</code> for evidence retrieval and <code>gl.eq_principle.prompt_comparative(...)</code> for validator agreement.</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>04</span><div><p>SAFETY & CORRECTNESS</p><h2>Failure is explicit and conservative</h2></div></div>
        <div className={styles.checkGrid}>{checks.map(([title, body]) => <article className={styles.check} key={title}><span aria-hidden="true">✓</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>05</span><div><p>VERIFIABLE ARTIFACTS</p><h2>Everything a steward needs is public and linked</h2></div></div>
        <div className={styles.artifacts}>{artifacts.map(([title, href, body]) => <a key={title} href={href} target="_blank" rel="noreferrer"><span><b>{title}</b><small>{body}</small></span><em>↗</em></a>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>06</span><div><p>REVIEW WALKTHROUGH</p><h2>Fastest way to verify the project</h2></div></div>
        <ol className={styles.reviewList}>
          <li><b>Open the production app.</b> Confirm the header shows Bradbury Testnet / chain 4221 and inspect the sample board without connecting a wallet.</li>
          <li><b>Open Create a job.</b> Enter a future deadline, a reward, a concrete deliverable and at least one measurable acceptance criterion. Keep release fee at 0% unless a fee recipient is configured.</li>
          <li><b>Connect a test wallet.</b> TurnMaster verifies native Bradbury GEN before enabling deployment and never asks for a private key.</li>
          <li><b>Deploy terms.</b> The wallet shows the network fee; the reward remains unfunded until the separate Fund action.</li>
          <li><b>Fund and claim with the correct roles.</b> Client funds exactly the reward; a different wallet claims the job.</li>
          <li><b>Submit delivery evidence.</b> The worker records a delivery description and public HTTPS evidence links.</li>
          <li><b>Choose the review path.</b> The client can accept directly, request a revision, or open a dispute. In a dispute, either party can add evidence.</li>
          <li><b>Run GenLayer review.</b> Verify the stored decision report, criterion verdicts, final contract state, Explorer transaction and any triggered settlement transaction.</li>
        </ol>
        <div className={styles.expected}><span>EXPECTED RESULT</span><p>A successful path ends with a Bradbury contract whose immutable terms, delivery evidence, decision report and terminal state can be re-read by address. A disputed all-pass review releases to the worker; a verified fail refunds the client; unverifiable evidence produces <b>undetermined</b> and no payout.</p></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>07</span><div><p>WHAT IS VERIFIED</p><h2>Automated evidence, with limits stated</h2></div></div>
        <div className={styles.twoCol}>
          <article className={styles.card}><h3>Automated checks</h3><ul><li>ESLint and TypeScript</li><li>Network and wallet-provider unit tests</li><li>Contract/public-source identity</li><li>Live Bradbury RPC smoke test</li><li>No-broadcast live deployment preflight</li><li>Next.js production build + HTTP smoke</li><li>GenLayer direct-mode contract lifecycle tests</li></ul></article>
          <article className={styles.card}><h3>Current honest limit</h3><p>The live deployment transaction shape has passed a no-broadcast Bradbury preflight, but the compact-contract build still needs one successful user-signed deploy followed by the complete create → fund → deliver → dispute/accept → settle journey to close the final end-to-end gap. The QA report keeps this explicit.</p></article>
        </div>
      </section>

      <footer className={styles.footer}><span>TurnMaster · GenLayer Bradbury</span><span>Testnet only · not legal arbitration · no real funds</span><Link href="/">Back to work board →</Link></footer>
    </main>
  );
}
