"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, FileCheck2, LoaderCircle, Share2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  explorerAddressUrl,
  explorerTransactionUrl,
  finalizedTransactionState,
  formatWeiGen,
  isContractAddress,
  readOnchainJob,
  transactionError,
  writeOnchainJob,
  type Eip1193Provider,
  type OnchainJob,
  type TxResult,
} from "@/lib/turnmaster-chain";
import type { Address } from "viem";
import { buildContractProofReceipt, buildContractShareUrl } from "@/lib/contract-proof.mjs";

const modalSecondaryStyle = { backgroundColor: "#0a2946", color: "#dce9f7", borderColor: "#315878" } as const;

type Action = "fund" | "claim" | "deliver" | "accept" | "revision" | "dispute" | "evidence" | "resolve" | "retry" | "recover" | "refund" | "cancel";
type Props = {
  contractAddress: string;
  walletAddress: string;
  provider: Eip1193Provider | null;
  rpcError?: boolean;
  job: OnchainJob;
  lastTx?: TxResult;
  onUpdated: (job: OnchainJob, tx?: TxResult) => void;
};

const zero = "0x0000000000000000000000000000000000000000";
const txLabels: Record<Action, { title: string; purpose: string }> = {
  fund: { title: "Fund this escrow", purpose: "Deposit the exact agreed reward into the job contract." },
  claim: { title: "Claim this job", purpose: "Assign this funded job to your connected wallet." },
  deliver: { title: "Submit delivery", purpose: "Record your delivery description and public evidence links." },
  accept: { title: "Accept delivery", purpose: "Release the reward and the agreed release fee to their configured recipients." },
  revision: { title: "Request a revision", purpose: "Record a specific correction request against the frozen criteria." },
  dispute: { title: "Open a dispute", purpose: "Ask GenLayer to evaluate the frozen criteria and submitted evidence." },
  evidence: { title: "Submit dispute evidence", purpose: "Add public evidence links to the active dispute record." },
  resolve: { title: "Run GenLayer review", purpose: "Evaluate the frozen criteria only after both parties responded or the 48-hour response deadline expired." },
  retry: { title: "Retry inconclusive dispute", purpose: "Reopen the evidence window once, without extending the fixed seven-day recovery deadline." },
  recover: { title: "Recover escrow after timeout", purpose: "Return the full reward to the client after the fixed seven-day unresolved-dispute deadline. Either party can trigger this." },
  refund: { title: "Refund undelivered work", purpose: "Return the funded reward to the client after the deadline." },
  cancel: { title: "Cancel unfunded job", purpose: "Cancel this job before any reward is deposited." },
};

function parseLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function decodeDecision(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function ContractWorkflow({ contractAddress, walletAddress, provider, rpcError = false, job, lastTx, onUpdated }: Props) {
  const [action, setAction] = useState<Action | null>(null);
  const [description, setDescription] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [processingText, setProcessingText] = useState("");
  const [localTx, setLocalTx] = useState<TxResult | undefined>(lastTx);
  const [refreshError, setRefreshError] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [pendingHash, setPendingHash] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(""), 2_000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const pendingStorageKey = useMemo(
    () => `turnmaster-pending-action:${contractAddress.toLowerCase()}`,
    [contractAddress],
  );

  useEffect(() => {
    const saved = window.sessionStorage.getItem(pendingStorageKey);
    const next = saved && /^0x[a-fA-F0-9]{64}$/.test(saved) ? saved : "";
    const frame = window.requestAnimationFrame(() => setPendingHash(next));
    return () => window.cancelAnimationFrame(frame);
  }, [pendingStorageKey]);

  const connected = walletAddress.toLowerCase();
  const client = job.client.toLowerCase();
  const worker = job.worker.toLowerCase();
  const isClient = Boolean(connected) && connected === client;
  const isWorker = Boolean(connected) && connected === worker;
  const isUnassigned = worker === zero;
  const deadlinePassed = now > job.deadline;
  const dispute = job.dispute;
  const responseReady = Boolean(dispute?.client_responded && dispute?.worker_responded);
  const evidenceWindowOver = Boolean(dispute && now > dispute.evidence_deadline);
  const recoveryWindowOver = Boolean(dispute && now >= dispute.recovery_deadline);
  const decision = useMemo(() => decodeDecision(job.decision), [job.decision]);
  const actionValue = action === "fund" ? formatWeiGen(job.reward_wei) : "0";
  const role = isClient ? "Client" : isWorker ? "Worker" : walletAddress ? "Observer" : "Not connected";
  const evidenceCount = job.delivery?.evidence_urls?.length ?? 0;
  const copyValue = async (value: string, label: string) => {
    if (!navigator.clipboard?.writeText) {
      setRefreshError("Clipboard access is unavailable in this browser.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setRefreshError("");
    } catch {
      setRefreshError("The browser blocked clipboard access.");
    }
  };
  const copyShareLink = () => copyValue(buildContractShareUrl(window.location.origin, contractAddress), "share");
  const copyReceipt = () => copyValue(JSON.stringify(buildContractProofReceipt(contractAddress, job), null, 2), "receipt");

  const availableActions: Action[] = [];
  if (job.status === "open" && isClient && !job.funded) availableActions.push("fund", "cancel");
  if (job.status === "funded" && job.funded && !isClient && isUnassigned && !deadlinePassed) availableActions.push("claim");
  if ((job.status === "claimed" || job.status === "revision_requested") && isWorker && !deadlinePassed) availableActions.push("deliver");
  if (job.status === "delivered" && (isClient || isWorker)) {
    if (isClient) availableActions.push("accept", "revision");
    availableActions.push("dispute");
  }
  if (job.status === "disputed" && (isClient || isWorker)) {
    if (dispute) {
      if (!recoveryWindowOver) {
        if (!evidenceWindowOver && (isClient ? !dispute.client_responded : !dispute.worker_responded)) availableActions.push("evidence");
        if (responseReady || evidenceWindowOver) availableActions.push("resolve");
      } else {
        availableActions.push("recover");
      }
    } else availableActions.push("evidence", "resolve"); // Legacy deployments.
  }
  if (job.status === "undetermined" && (isClient || isWorker) && dispute) {
    if (recoveryWindowOver) availableActions.push("recover");
    else if (dispute.retry_count < 1 && now + 48 * 60 * 60 < dispute.recovery_deadline) availableActions.push("retry");
  }
  if ((job.status === "funded" || job.status === "claimed" || job.status === "revision_requested") && isClient && deadlinePassed) availableActions.push("refund");

  const startAction = (next: Action) => {
    setError("");
    setReason("");
    setDescription("");
    setEvidenceText("");
    setAction(next);
  };

  const submit = async () => {
    if (!action) return;
    setError("");
    if (pendingHash) {
      setError("A previous transaction is still unverified. Check its Bradbury Explorer result before submitting another action.");
      return;
    }
    if (!provider || !walletAddress) {
      setError("Connect a Bradbury-compatible wallet before submitting this transaction.");
      return;
    }
    if (!isContractAddress(contractAddress)) {
      setError("The job contract address is invalid.");
      return;
    }
    const urls = parseLines(evidenceText);
    if (action === "deliver" && description.trim().length < 8) {
      setError("Describe the completed work in at least 8 characters.");
      return;
    }
    if (action === "revision" && reason.trim().length < 12) {
      setError("A revision request must explain the issue in at least 12 characters.");
      return;
    }
    if ((action === "dispute" || action === "retry") && reason.trim().length < 12) {
      setError("A dispute or retry needs a specific reason of at least 12 characters.");
      return;
    }
    if ((action === "deliver" || action === "evidence") && (urls.length === 0 || urls.length > 12 || urls.some((url) => !url.startsWith("https://")))) {
      setError("Enter between 1 and 12 public HTTPS evidence links, one per line.");
      return;
    }

    let functionName = "";
    let args: Array<string> = [];
    let value: bigint | undefined;
    switch (action) {
      case "fund": functionName = "fund"; value = BigInt(job.reward_wei); break;
      case "claim": functionName = "claim"; break;
      case "deliver": functionName = "submit_delivery"; args = [description.trim(), JSON.stringify(urls)]; break;
      case "accept": functionName = "accept_delivery"; break;
      case "revision": functionName = "request_revision"; args = [reason.trim()]; break;
      case "dispute": functionName = "open_dispute"; args = [reason.trim()]; break;
      case "evidence": functionName = "submit_dispute_evidence"; args = [JSON.stringify(urls)]; break;
      case "resolve": functionName = "resolve_dispute"; break;
      case "retry": functionName = "retry_dispute"; args = [reason.trim()]; break;
      case "recover": functionName = "refund_after_dispute_timeout"; break;
      case "refund": functionName = "refund_after_deadline"; break;
      case "cancel": functionName = "cancel_unfunded"; break;
    }

    setBusy(true);
    setProcessingText("Waiting for wallet approval and Bradbury finalization…");
    try {
      const tx = await writeOnchainJob({
        provider,
        walletAddress: walletAddress as Address,
        address: contractAddress as Address,
        functionName,
        args,
        value,
      });
      setLocalTx(tx);
      setPendingHash("");
      window.sessionStorage.removeItem(pendingStorageKey);
      setAction(null);
      setProcessingText("");
      try {
        const updated = await readOnchainJob(contractAddress as Address);
        onUpdated(updated, tx);
        setRefreshError("");
      } catch {
        setRefreshError("The transaction finalized. The latest contract state could not be read; use Refresh to try again.");
      }
    } catch (submitError) {
      const submittedHash = (submitError as { hash?: string })?.hash;
      if (typeof submittedHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(submittedHash)) {
        setPendingHash(submittedHash);
        window.sessionStorage.setItem(pendingStorageKey, submittedHash);
      }
      setError(transactionError(submitError));
    } finally {
      setBusy(false);
      setProcessingText("");
    }
  };

  const refresh = async () => {
    setRefreshError("");
    setBusy(true);
    try {
      let verifiedTx: TxResult | undefined;
      if (pendingHash) {
        const pendingState = await finalizedTransactionState(pendingHash);
        if (pendingState === "success") {
          verifiedTx = { hash: pendingHash as `0x${string}`, children: [] };
          setPendingHash("");
          window.sessionStorage.removeItem(pendingStorageKey);
          setLocalTx(verifiedTx);
          setError("");
        } else if (pendingState === "failed") {
          setRefreshError("The submitted transaction finalized but contract execution was not successful. Confirm the failure in Bradbury Explorer before clearing the retry lock.");
        } else {
          setRefreshError("The submitted transaction is not finalized yet. Wait for Bradbury finalization and refresh again.");
        }
      }
      const updated = await readOnchainJob(contractAddress as Address);
      onUpdated(updated, verifiedTx);
    } catch (loadError) {
      setRefreshError(transactionError(loadError));
    } finally {
      setBusy(false);
    }
  };

  const criteria = Array.isArray(decision?.criteria) ? decision.criteria as Array<Record<string, unknown>> : [];
  const evidence = decision?.evidence && typeof decision.evidence === "object" ? decision.evidence as Record<string, unknown> : {};

  return <div className="chain-workflow">
    <div className="chain-workflow-head"><span><ShieldCheck size={15} />LIVE CONTRACT</span><button onClick={refresh} disabled={busy} aria-label="Refresh contract state">{busy ? <LoaderCircle size={14} className="spin" /> : "Refresh"}</button></div>
    <a className="contract-address-link" href={explorerAddressUrl(contractAddress)} target="_blank" rel="noreferrer">{contractAddress}<ExternalLink size={12} /></a>
    <div className="chain-proof-grid" aria-label="On-chain verification summary">
      <div><span>Status</span><b>{job.status.replaceAll("_", " ")}</b></div>
      <div><span>Your role</span><b>{role}</b></div>
      <div><span>Criteria</span><b>{job.acceptance_criteria.length}</b></div>
      <div><span>Evidence</span><b>{evidenceCount}</b></div>
    </div>
    <div className="chain-proof-actions">
      <button type="button" onClick={() => copyValue(contractAddress, "address")}>{copied === "address" ? <Check size={13}/> : <Copy size={13}/>}Copy address</button>
      <button type="button" onClick={copyShareLink}>{copied === "share" ? <Check size={13}/> : <Share2 size={13}/>}Share contract</button>
      <button type="button" onClick={copyReceipt}>{copied === "receipt" ? <Check size={13}/> : <FileCheck2 size={13}/>}Copy audit receipt</button>
      <a href={explorerAddressUrl(contractAddress)} target="_blank" rel="noreferrer">Explorer <ExternalLink size={12}/></a>
    </div>
    <div className="chain-state-row"><span>Escrow balance</span><b>{formatWeiGen(job.escrow_wei ?? "0")} GEN</b></div>
    <div className="chain-state-row"><span>Deadline</span><b>{new Date(job.deadline * 1000).toLocaleDateString()}</b></div>
    {job.status === "claimed" && <div className="chain-state-row"><span>Worker</span><b className="mono">{job.worker}</b></div>}
    {dispute && (job.status === "disputed" || job.status === "undetermined") && <div role="status" className="chain-dispute-info">
      <div className="chain-state-row"><span>Dispute review round</span><b>{dispute.round} · {dispute.retry_count}/1 retries</b></div>
      <div className="chain-state-row"><span>Evidence response deadline</span><b>{new Date(dispute.evidence_deadline * 1000).toLocaleString()}</b></div>
      <div className="chain-state-row"><span>Final recovery deadline</span><b>{new Date(dispute.recovery_deadline * 1000).toLocaleString()}</b></div>
      <div className="chain-state-row"><span>Party responses</span><b>Client {dispute.client_responded ? "submitted" : "waiting"} · Worker {dispute.worker_responded ? "submitted" : "waiting"}</b></div>
      <p>{job.status === "disputed" ? "Review becomes available only after both parties submit evidence or the response deadline passes." : "Inconclusive review: a single retry is available within the fixed recovery window; if unresolved at the deadline, either party may trigger a full refund."}</p>
    </div>}

    {pendingHash ? <div className="chain-tx chain-error" role="alert"><span>A submitted transaction is still locally marked as unverified. Re-check Bradbury before sending another action.</span><a href={explorerTransactionUrl(pendingHash)} target="_blank" rel="noreferrer">Check transaction in Bradbury Explorer <ExternalLink size={12} /></a><button type="button" onClick={refresh} disabled={busy}>{busy ? "Checking finalized status…" : "Re-check finalized transaction"}</button><button type="button" onClick={() => { setPendingHash(""); window.sessionStorage.removeItem(pendingStorageKey); setError(""); setRefreshError(""); }}>Clear only if Explorer shows failure</button></div> : availableActions.length > 0 ? <div className="chain-actions">{availableActions.map((item) => item === "accept" || item === "fund"
  ? <Button key={item} type="button" className="primary-action" disabled={busy} onClick={() => startAction(item)}>{txLabels[item].title}</Button>
  : <button key={item} type="button" className="chain-secondary-action chain-native-action" disabled={busy} onClick={() => startAction(item)}>{txLabels[item].title}</button>)}</div> : <p className="chain-no-action">{rpcError ? "TurnMaster cannot verify Bradbury RPC state. Use Check network in the top bar; contract actions are paused." : !walletAddress ? "Connect a wallet to see actions for your role." : job.status === "undetermined" ? "The review was inconclusive. Wait for the recovery deadline or retry if the fixed response window permits." : "No transaction is available for this wallet and contract state."}</p>}

    {processingText && <p className="chain-processing" role="status"><LoaderCircle size={14} className="spin" />{processingText}</p>}
    {refreshError && <p className="chain-error" role="alert">{refreshError}</p>}
    {localTx?.hash && <div className="chain-tx"><span>Finalized transaction</span><a href={explorerTransactionUrl(localTx.hash)} target="_blank" rel="noreferrer">{localTx.hash.slice(0, 12)}…{localTx.hash.slice(-8)} <ExternalLink size={12} /></a>{localTx.children.map((hash) => <a key={hash} href={explorerTransactionUrl(hash)} target="_blank" rel="noreferrer">Settlement transaction {hash.slice(0, 12)}… <ExternalLink size={12} /></a>)}</div>}
    {decision && <div className="decision-report"><div className="decision-report-title"><b>Decision report</b><span>{String(decision.outcome ?? "Recorded")}</span></div><p>{String(decision.reasoning ?? "No reasoning was included in the stored decision.")}</p>{criteria.map((item, index) => <div className="decision-criterion" key={index}><span>{String(item.result ?? "unverifiable")}</span><p><b>{String(item.criterion ?? `Criterion ${index + 1}`)}</b><small>{String(item.reasoning ?? "")}</small></p></div>)}{Object.entries(evidence).flatMap(([role, links]) => Array.isArray(links) ? links.map((url) => typeof url === "string" && url.startsWith("https://") ? <a className="decision-evidence" key={`${role}-${url}`} href={url} target="_blank" rel="noreferrer">{role} evidence <ExternalLink size={12} /></a> : null) : [])}</div>}

    {action && <Dialog open onOpenChange={(open) => { if (!open) setAction(null); }}><DialogContent className="tx-confirm-dialog"><DialogHeader><DialogTitle>{txLabels[action].title}</DialogTitle><DialogDescription>{txLabels[action].purpose}</DialogDescription></DialogHeader><div className="tx-preview"><div><span>Network</span><b>GenLayer Bradbury Testnet · 4221</b></div><div><span>Contract</span><b className="mono">{contractAddress}</b></div><div><span>Value sent to contract</span><b>{actionValue} GEN</b></div><div><span>Testnet transaction fee</span><b>Shown by your wallet before you approve</b></div></div>{action === "deliver" && <div className="chain-form-fields"><label>Delivery description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Describe what you completed." /></label><label>Evidence links <small>HTTPS only · one per line</small><textarea value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} rows={3} placeholder="https://…" /></label></div>}{(action === "revision" || action === "dispute" || action === "retry") && <label className="chain-form-label">{action === "revision" ? "Criterion-linked change request" : action === "retry" ? "Reason for one final review" : "Dispute reason"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="State which criterion is affected and why." /></label>}{action === "evidence" && <label className="chain-form-label">Public HTTPS evidence links<textarea value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} rows={3} placeholder="One link per line" /></label>}{error && <p className="form-error" role="alert">{error}</p>}<DialogFooter><Button variant="outline" style={modalSecondaryStyle} disabled={busy} onClick={() => setAction(null)}>Cancel</Button><Button className="primary-action" disabled={busy} onClick={submit}>{busy ? <><LoaderCircle size={15} className="spin" />Processing</> : <><Wallet size={15} />Review in wallet</>}</Button></DialogFooter></DialogContent></Dialog>}
  </div>;
}
