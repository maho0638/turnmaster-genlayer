import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
  ["LIVE: 7-day full refund FINALIZED (Oct 15)", "https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5", "Actual wallet-signed refund_after_dispute_timeout; 0.1 test GEN returned to original client; 0 GEN remains in escrow."],
  ["LIVE: refunded escrow contract", "https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950", "Bradbury get_job(): resolved, escrow_wei 0, decision dispute_timeout_refund."],
  ["LIVE: newly created public job", "https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15", "Third genuine GenLayer job visible without a connected wallet in a fresh incognito browser."],
  ["LIVE: on-chain shared directory", "https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8", "Public contract registry; verified work board discovers three independent real contract addresses."],
  ["Wallet site permission fix (PR #17)", "https://github.com/maho0638/turnmaster-genlayer/pull/17", "Verified EIP-1193 MetaMask site disconnect using wallet_revokePermissions and eth_accounts; reports unsupported cases."],
  ["Steward live-usage evidence (Oct 15)", "https://github.com/maho0638/turnmaster-genlayer/blob/main/docs/STEWARD_LIVE_EVIDENCE_2026_10_15.md", "Dates, roles, contract status, exact transactions, UI checks and reproduction procedure."],
  ["Updated escrow deployment (Oct 8)", "https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57", "Finalized contract deployment from the updated dispute-response and recovery implementation."],
  ["Legacy V1 contract", "https://explorer-bradbury.genlayer.com/address/0xAA85A41F899ED569d32B4CF0FDA2C55461d94482", "Older immutable job, before dispute retry/recovery rules."],
  ["Finalized deploy transaction", "https://explorer-bradbury.genlayer.com/tx/0xf9124e7e20d71add986925697caa3e0cca697ef303c6ba409754c0ba17082403", "Consensus journey and finalized deployment transaction."],
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
          <Link className={styles.brand} href="/" aria-label="Back to TurnMaster work board"><Image className={styles.brandLogo} src="/turnmaster-logo.webp" alt="TurnMaster" width={180} height={60} priority /></Link>
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

      <section className={styles.liveProof}>
        <div className={styles.liveBadge}>LIVE REFUND FINALIZED · 15 OCTOBER 2026</div>
        <div className={styles.liveProofGrid}>
          <div><span>Actual refunded escrow</span><a href="https://explorer-bradbury.genlayer.com/address/0x30D7B14756ED2b062f7f39F8240F0FC0C3533950" target="_blank" rel="noreferrer">0x30D7B14756ED2b062f7f39F8240F0FC0C3533950</a></div>
          <div><span>Finalized refund transaction</span><a href="https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5" target="_blank" rel="noreferrer">0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5</a></div>
          <div><span>Post-refund contract read</span><b>resolved · escrow 0 GEN · dispute_timeout_refund</b></div>
          <div><span>Refunded amount</span><b>0.1 test GEN · original client · 0% fee</b></div>
          <div><span>Open live contract</span><Link href="/?contract=0x30D7B14756ED2b062f7f39F8240F0FC0C3533950">Read finalized settlement in TurnMaster →</Link></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>LIVE</span><div><p>ACTUAL PRODUCT USAGE · VERIFIED BRADBURY STATE</p><h2>Three genuine jobs, two on-chain review rounds and a real refund</h2></div></div>
        <div className={styles.twoCol}>
          <article className={styles.card}>
            <h3>Public jobs without mock data</h3>
            <p>On 12 October a third genuine TurnMaster job was deployed at <a href="https://explorer-bradbury.genlayer.com/address/0xee6548ca1becb6797bd3a96b5249159c740f7c15" target="_blank" rel="noreferrer">0xee6548ca1becb6797bd3a96b5249159c740f7c15</a>. The on-chain shared directory at <a href="https://explorer-bradbury.genlayer.com/address/0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8" target="_blank" rel="noreferrer">0x6b464bd8d036a4b034cdAac27d255c81BC5F53C8</a> exposed all three verified contracts to a visitor in Chrome Incognito without a wallet. Each displayed job is independently read with <code>get_job()</code>; no sample job cards are synthesized.</p>
            <p>Observed board snapshot: 3 contracts; one newly open job; one legacy resolved job; one dispute-recovery job (now resolved). These are on-chain job counts, not a claimed number of users or page visits.</p>
          </article>
          <article className={styles.card}>
            <h3>Real seven-day refund</h3>
            <p>The upgraded escrow was funded with <b>0.1 test GEN</b>, claimed by a separate worker wallet, delivered, disputed with evidence from both parties, reviewed twice as <code>undetermined</code> with one allowed retry, and left locked until its fixed seven-day deadline.</p>
            <p>On <b>15 October 2026</b>, <a href="https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5" target="_blank" rel="noreferrer">the actual refund transaction</a> finalized. Direct Bradbury contract readback confirmed <code>status=resolved</code>, <code>escrow_wei=0</code>, and <code>outcome=dispute_timeout_refund</code>. The original client received the <b>full 0.1 test GEN</b> without a platform fee.</p>
          </article>
          <article className={styles.card}>
            <h3>Wallet issue addressed and tested</h3>
            <p>TurnMaster no longer invokes the GenLayer SDK wallet-connect helper that requests <code>wallet_getSnaps</code>. Fresh MetaMask connection on Bradbury 4221 succeeded with no such error in the inspected browser console. Disconnect now requests removal of <code>eth_accounts</code> permission and independently verifies the result; the tested MetaMask permissions panel was empty afterwards.</p>
          </article>
          <article className={styles.card}>
            <h3>Scope and honest limits</h3>
            <p>These are manually exercised testnet flows, public contract reads, and repository tests. TurnMaster does <b>not</b> claim independent customer counts, sustained active users, production/mainnet use, or real-money payouts. The wallet and browser evidence comes from the tested Chrome/MetaMask setup; no claim is made that all browser extensions behave identically.</p>
          </article>
        </div>
      </section>

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
          <li><b>Open the production app.</b> Confirm the header shows Bradbury Testnet / chain 4221 and inspect jobs re-read from publicly verified Bradbury contracts without connecting a wallet.</li>
          <li><b>Open Create a job.</b> Enter a future deadline, a reward, a concrete deliverable and at least one measurable acceptance criterion. Keep release fee at 0% unless a fee recipient is configured.</li>
          <li><b>Test the Deploy button without a wallet.</b> The button is clickable and responds with a clear Connect wallet explanation; no transaction is broadcast.</li><li><b>Connect a test wallet.</b> Check Bradbury chain 4221 and native test GEN; the dialog explains RPC, faucet, or fee prerequisites when missing. No private key is requested.</li>
          <li><b>Deploy terms.</b> The wallet shows the network fee; the reward remains unfunded until the separate Fund action.</li>
          <li><b>Fund and claim with the correct roles.</b> Client funds exactly the reward; a different wallet claims the job.</li>
          <li><b>Submit delivery evidence.</b> The worker records a delivery description and public HTTPS evidence links.</li>
          <li><b>Choose the review path.</b> The client can accept directly, request a revision, or open a dispute. In a dispute, either party can add evidence.</li>
          <li><b>Run GenLayer review.</b> Verify the stored decision report, criterion verdicts, final contract state, Explorer transaction and any triggered settlement transaction.</li>
          <li><b>Verify the public directory.</b> Open the work board in a fresh Chrome Incognito window without connecting a wallet; it shows three individually verified GenLayer jobs, including the new 12 October contract.</li>
          <li><b>Verify the real refund.</b> Open <a href="https://explorer-bradbury.genlayer.com/tx/0x8d058f49c23459533c262464435068e80716f415bcac14a3c2aed7981ca2e0e5" target="_blank" rel="noreferrer">the 15 October finalized transaction</a> and check the upgraded contract: <code>resolved</code>, <code>escrow_wei=0</code>, <code>dispute_timeout_refund</code>.</li>
        </ol>
        <div className={styles.expected}><span>EXPECTED RESULT</span><p>A successful path ends with a Bradbury contract whose immutable terms, delivery evidence, decision report and terminal state can be re-read by address. A disputed all-pass review releases to the worker; a verified fail refunds the client; unverifiable evidence produces <b>undetermined</b> and no payout.</p></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>07</span><div><p>WHAT IS VERIFIED</p><h2>Automated evidence, with limits stated</h2></div></div>
        <div className={styles.twoCol}>
          <article className={styles.card}><h3>Automated checks</h3><ul><li>ESLint and TypeScript</li><li>Network and wallet-provider unit tests</li><li>Contract/public-source identity</li><li>GenVM contract lint</li><li>Live Bradbury RPC smoke test</li><li>No-broadcast live deployment preflight</li><li>Share-link and audit-receipt tests</li><li>Next.js production build + reviewer-route HTTP smoke</li><li>GenLayer direct-mode contract lifecycle tests</li></ul></article>
          <article className={styles.card}><h3>Current verified scope</h3><p>Actual Bradbury testing includes deployment, funding with 0.1 test GEN, separate-wallet claim, delivery, both-party dispute evidence, one retry, two finalized Undetermined decisions, and an actual FINALIZED 15 October seven-day full client refund. The contract now reads resolved with 0 escrow. No real-money funds or independent visitor analytics are claimed. New signed actions still require a test wallet and explicit wallet approval.</p></article>
        </div>
      </section>

      <footer className={styles.footer}><span>TurnMaster · GenLayer Bradbury</span><span>Testnet only · not legal arbitration · no real funds</span><Link href="/">Back to work board →</Link></footer>
    </main>
  );
}
