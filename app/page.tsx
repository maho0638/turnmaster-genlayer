"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowUpRight, Bell, BriefcaseBusiness,
  Check, ChevronDown, CircleAlert, CircleHelp, Clock3, Command, ExternalLink,
  FileText, Filter, Gavel, LockKeyhole, Menu, Plus,
  Search, Shield, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Eip1193Provider, OnchainJob, TxResult } from "@/lib/turnmaster-chain";
import { BRADBURY_CHAIN_ID, BRADBURY_WALLET_NETWORK, formatWeiGen, isEvmAddress, readBradburyNativeBalanceWei } from "@/lib/genlayer-network.mjs";
import type { Address } from "viem";
import { loadContractAddresses, rememberContractAddress } from "@/lib/job-registry.mjs";

const ContractWorkflow = dynamic(() => import("@/app/contract-workflow").then((module) => module.ContractWorkflow), {
  ssr: false,
  loading: () => <p className="chain-no-action" role="status">Loading contract controls…</p>,
});

type Status = "Open" | "Funded" | "Claimed" | "Delivered" | "Revision requested" | "In review" | "Undetermined" | "Resolved" | "Cancelled";
type Job = { id: string; title: string; client: string; initials: string; color: string; category: string; reward: string; due: string; status: Status; criteria: string[]; evidence?: string[]; note?: string; sample: boolean; description?: string; deliveryDefinition?: string; proofType?: string; contractAddress?: string; chainJob?: OnchainJob; chainTx?: TxResult };
const starterJobs: Job[] = [
  { id: "TM-024", title: "Audit the onboarding flow", client: "Northstar DAO", initials: "N", color: "blue", category: "Product", reward: "320 GEN", due: "Oct 12", status: "Funded", criteria: ["Record a full first-time user journey from connect wallet through first task.", "List every blocking issue with a screenshot and browser details.", "Deliver a prioritized report with at least five actionable findings."], evidence: ["Sample repository reference · no live artifact"], sample: true },
  { id: "TM-023", title: "Translate governance proposal", client: "Open Guild", initials: "O", color: "violet", category: "Writing", reward: "180 GEN", due: "Oct 14", status: "In review", criteria: ["Translate the approved English proposal into Spanish.", "Keep all vote options, dates, and links unchanged.", "Submit an editable document and a final PDF."], evidence: ["Sample document reference · no live artifact"], note: "Submitted 2h ago", sample: true },
  { id: "TM-022", title: "Design a token claim page", client: "Lattice Labs", initials: "L", color: "green", category: "Design", reward: "450 GEN", due: "Oct 18", status: "Open", criteria: ["Provide a responsive desktop and mobile Figma prototype.", "Include connect, eligibility, and confirmed claim states.", "Use the supplied brand assets and meet WCAG AA contrast."], sample: true },
  { id: "TM-021", title: "Build a snapshot export script", client: "Field Notes", initials: "F", color: "amber", category: "Engineering", reward: "600 GEN", due: "Oct 09", status: "Delivered", criteria: ["Export the latest 90 days of votes as newline-delimited JSON.", "Document setup and include one example output file.", "Pass the supplied fixture tests without network access."], evidence: ["Sample repository reference · no live artifact"], note: "Submitted yesterday", sample: true },
  { id: "TM-020", title: "Create community welcome kit", client: "Commons Hub", initials: "C", color: "rose", category: "Community", reward: "240 GEN", due: "Resolved", status: "Resolved", criteria: ["Deliver a concise welcome guide and moderator checklist.", "Include verified links to all five community channels."], sample: true },
];
const statuses: ("All" | Status)[] = ["All", "Open", "Funded", "Claimed", "Delivered", "Revision requested", "In review", "Undetermined", "Resolved", "Cancelled"];
const network = BRADBURY_WALLET_NETWORK;
const networkChainId = BRADBURY_CHAIN_ID;
const feeRecipientConfig = process.env.NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT ?? "";
const defaultReleaseFee = isEvmAddress(feeRecipientConfig) ? "1.5" : "0";

async function readBradburyNativeBalance(address: string) {
  const balance = await readBradburyNativeBalanceWei(address);
  return formatWeiGen(balance.toString());
}

async function ensureOfficialBradburyNetwork(provider: Eip1193Provider) {
  let alreadyPresent = false;
  try {
    await provider.request({ method: "wallet_addEthereumChain", params: [network] });
  } catch (error) {
    const candidate = error as { code?: number; message?: string };
    if (candidate.code === 4001) throw error;
    const message = candidate.message?.toLowerCase() ?? "";
    if (candidate.code === -32602 || message.includes("already") || message.includes("exist")) {
      alreadyPresent = true;
    } else {
      throw error;
    }
  }

  await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainId }] });
  const chainHex = await provider.request({ method: "eth_chainId" }) as string;
  if (Number.parseInt(chainHex, 16) !== networkChainId) {
    throw new Error("MetaMask did not switch to GenLayer Bradbury chain 4221.");
  }
  return { alreadyPresent };
}

function statusFromChain(status: string): Status {
  const labels: Record<string, Status> = { open: "Open", funded: "Funded", claimed: "Claimed", delivered: "Delivered", revision_requested: "Revision requested", disputed: "In review", undetermined: "Undetermined", resolved: "Resolved", cancelled: "Cancelled" };
  return labels[status] ?? "Undetermined";
}

function jobFromChain(address: string, record: OnchainJob, tx?: TxResult): Job {
  return {
    id: `${address.slice(0, 6)}…${address.slice(-4)}`,
    title: record.title,
    client: `${record.client.slice(0, 6)}…${record.client.slice(-4)}`,
    initials: "T",
    color: "blue",
    category: record.proof_type || "On-chain job",
    reward: `${formatWeiGen(record.reward_wei)} GEN`,
    due: new Date(record.deadline * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: statusFromChain(record.status),
    criteria: record.acceptance_criteria,
    evidence: record.delivery?.evidence_urls,
    note: "Bradbury Testnet · verified contract read",
    sample: false,
    description: record.description,
    deliveryDefinition: record.delivery_definition,
    proofType: record.proof_type,
    contractAddress: address,
    chainJob: record,
    chainTx: tx,
  };
}

function StatusBadge({ status }: { status: Status }) {
  const cls: Record<Status, string> = { Open: "status-open", Funded: "status-funded", Claimed: "status-funded", Delivered: "status-delivered", "Revision requested": "status-review", "In review": "status-review", Undetermined: "status-cancelled", Resolved: "status-resolved", Cancelled: "status-cancelled" };
  return <span className={`status ${cls[status]}`}><i />{status}</span>;
}
function BrandMark() { return <span className="brand-mark"><span /><span /><span /></span>; }

function TermsCopy({ job }: { job: Job }) {
  if (!job.description && !job.deliveryDefinition) return null;
  return <div className="detail-section terms-copy">
    {job.description && <div><h4>Job description</h4><p>{job.description}</p></div>}
    {job.deliveryDefinition && <div><h4>Required delivery</h4><p>{job.deliveryDefinition}</p></div>}
    {job.proofType && <span>Evidence type · {job.proofType}</span>}
  </div>;
}

export default function Home() {
  const router = useRouter();
  const [jobs, setJobs] = useState(starterJobs);
  const [activeStatus, setActiveStatus] = useState<"All" | Status>("All");
  const [viewMode, setViewMode] = useState<"board" | "mine">("board");
  const [selected, setSelected] = useState<Job>(starterJobs[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [contractInput, setContractInput] = useState("");
  const [chainBusy, setChainBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletProvider, setWalletProvider] = useState<Eip1193Provider | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletBalanceError, setWalletBalanceError] = useState(false);
  const [networkRepairBusy, setNetworkRepairBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [criteria, setCriteria] = useState([""]);
  const [form, setForm] = useState({ title: "", description: "", delivery: "", proofType: "Public URL", due: "", reward: "", fee: defaultReleaseFee });
  const [formError, setFormError] = useState("");
  const [pendingDeployHash, setPendingDeployHash] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const savedHash = window.sessionStorage.getItem("turnmaster-pending-deploy");
    if (!savedHash) return;
    const frame = window.requestAnimationFrame(() => setPendingDeployHash(savedHash));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const addresses = loadContractAddresses(window.localStorage);
    if (addresses.length === 0) return;
    let cancelled = false;
    void import("@/lib/turnmaster-chain")
      .then(async ({ readOnchainJob }) => {
        const loaded = await Promise.allSettled(addresses.map(async (address) => {
          const record = await readOnchainJob(address as Address);
          return jobFromChain(address, record);
        }));
        if (cancelled) return;
        const live = loaded
          .filter((result): result is PromiseFulfilledResult<Job> => result.status === "fulfilled")
          .map((result) => result.value);
        if (live.length === 0) return;
        setJobs((current) => {
          const liveAddresses = new Set(live.map((job) => job.contractAddress!.toLowerCase()));
          return [...live, ...current.filter((job) => !job.contractAddress || !liveAddresses.has(job.contractAddress.toLowerCase()))];
        });
        setSelected((current) => current.sample ? live[0] : current);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    const context = (document as Document & {
      modelContext?: {
        registerTool: (tool: {
          name: string;
          title: string;
          description: string;
          inputSchema: object;
          annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
          execute: (input: unknown) => { state: string; transaction: string } | Promise<{ state: string; transaction: string }>;
        }, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const registration = context.registerTool({
      name: "start_job_creation",
      title: "Start job creation",
      description: "Open the TurnMaster job form so the user can review and enter the terms. This does not create a draft, deploy a contract, or submit a transaction.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length > 0) {
          throw new Error("This action accepts an empty object. Enter job terms in the visible form.");
        }
        setFormError("");
        setCreateOpen(true);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        return { state: "job_form_open", transaction: "none" };
      },
    }, { signal: lifecycle.signal });
    void Promise.resolve(registration).catch(() => setNotice("The agent action could not be registered in this browser."));
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    const provider = walletProvider;
    if (!provider?.on) return;
    const onChainChanged = (value: unknown) => {
      const chainId = typeof value === "string" ? Number.parseInt(value, 16) : NaN;
      const isWrong = chainId !== networkChainId;
      setWrongNetwork(isWrong);
      setWalletMessage(isWrong ? "Wallet network changed. TurnMaster contract actions are paused until Bradbury Testnet is selected." : "Wallet is connected to Bradbury Testnet.");
    };
    const onAccountsChanged = (value: unknown) => {
      const accounts = Array.isArray(value) ? value : [];
      setWalletAddress(typeof accounts[0] === "string" ? accounts[0] : "");
      setWalletMessage(accounts.length ? "Wallet account changed." : "Wallet disconnected.");
    };
    provider.on("chainChanged", onChainChanged);
    provider.on("accountsChanged", onAccountsChanged);
    return () => {
      provider.removeListener?.("chainChanged", onChainChanged);
      provider.removeListener?.("accountsChanged", onAccountsChanged);
    };
  }, [walletProvider]);

  useEffect(() => {
    if (!walletAddress || wrongNetwork) return;
    let cancelled = false;
    void readBradburyNativeBalance(walletAddress)
      .then((formatted) => {
        if (cancelled) return;
        setWalletBalance(formatted);
        setWalletBalanceError(false);
      })
      .catch((error) => {
        if (cancelled) return;
        const reason = error instanceof Error ? error.message : String(error);
        setWalletBalanceError(true);
        setWalletMessage(`Bradbury RPC could not read this wallet's native GEN balance (${reason}). No transaction was sent.`);
      });
    return () => { cancelled = true; };
  }, [walletAddress, wrongNetwork]);

  const scopedJobs = useMemo(() => {
    if (viewMode !== "mine") return jobs;
    if (!walletAddress) return [];
    const connected = walletAddress.toLowerCase();
    return jobs.filter((job) => !job.sample && job.chainJob && (
      job.chainJob.client.toLowerCase() === connected || job.chainJob.worker.toLowerCase() === connected
    ));
  }, [jobs, viewMode, walletAddress]);
  const filtered = useMemo(() => scopedJobs.filter((job) => (activeStatus === "All" || job.status === activeStatus) && `${job.title} ${job.client} ${job.category}`.toLowerCase().includes(query.toLowerCase())), [scopedJobs, activeStatus, query]);
  const liveJobs = scopedJobs.filter((job) => !job.sample && job.contractAddress);
  const escrowWei = liveJobs.reduce((total, job) => total + BigInt(job.chainJob?.escrow_wei ?? "0"), BigInt(0));
  const connectWallet = async () => {
    setWalletMessage("");
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) { setWalletMessage("No EIP-1193 wallet detected. Install a compatible wallet to connect."); return; }
    setWalletProvider(provider);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts?.[0]) { setWalletMessage("Wallet returned no account."); return; }
      const networkResult = await ensureOfficialBradburyNetwork(provider);
      setWrongNetwork(false);
      const [{ createClient }, { testnetBradbury }] = await Promise.all([import("genlayer-js"), import("genlayer-js/chains")]);
      const genlayerClient = createClient({ chain: testnetBradbury, account: accounts[0] as `0x${string}`, provider: provider as never });
      await genlayerClient.connect("testnetBradbury");
      setWalletAddress(accounts[0]);
      setWalletMessage(networkResult.alreadyPresent
        ? "Wallet connected to Bradbury chain 4221. If this network was saved by an older TurnMaster build, set https://rpc-bradbury.genlayer.com as MetaMask's Default RPC URL before signing."
        : "Wallet connected with the official GenLayer Bradbury RPC.");
    } catch (error) { const { transactionError } = await import("@/lib/turnmaster-chain"); setWalletMessage(transactionError(error)); }
  };
  const repairBradburyNetwork = async () => {
    if (!walletProvider || !walletAddress) return;
    setNetworkRepairBusy(true);
    setWalletMessage("Requesting the official Bradbury RPC in MetaMask. This does not send GEN.");
    try {
      const networkResult = await ensureOfficialBradburyNetwork(walletProvider);
      setWrongNetwork(false);
      const balance = await readBradburyNativeBalance(walletAddress);
      setWalletBalance(balance);
      setWalletBalanceError(false);
      setWalletMessage(networkResult.alreadyPresent
        ? `Bradbury chain 4221 already exists in MetaMask. Make ${network.rpcUrls[0]} the Default RPC URL, then retry. Native GEN balance: ${balance}.`
        : `Official Bradbury RPC selected. Native GEN balance verified: ${balance} GEN.`);
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code === 4001) setWalletMessage("Network setup was cancelled. No GEN transaction was sent.");
      else {
        const reason = error instanceof Error ? error.message : String(error);
        setWalletMessage(`MetaMask could not configure the official Bradbury RPC (${reason}). Set the Default RPC URL to ${network.rpcUrls[0]} and retry. No transaction was sent.`);
      }
      setWalletBalanceError(true);
    } finally { setNetworkRepairBusy(false); }
  };
  const createDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError("");
    const usable = criteria.map((x) => x.trim());
    if (!form.title.trim() || !form.description.trim() || !form.delivery.trim() || !form.due || !form.reward) { setFormError("Complete every required field before saving the draft."); return; }
    if (usable.length === 0 || usable.some((x) => x.length < 18)) { setFormError("Each acceptance criterion must be specific and at least 18 characters."); return; }
    if (!Number.isFinite(Number(form.reward)) || Number(form.reward) <= 0) { setFormError("Reward must be greater than zero."); return; }
    const job: Job = { id: `DRAFT-${String(jobs.length + 1).padStart(3, "0")}`, title: form.title.trim(), client: walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "You", initials: "Y", color: "blue", category: "Draft", reward: `${form.reward} GEN`, due: new Date(form.due).toLocaleDateString("en-US", { month: "short", day: "numeric" }), status: "Open", criteria: usable, note: "Page-session draft · not on-chain", sample: false };
    setJobs((current) => [job, ...current]); setSelected(job); setActiveStatus("All"); setCreateOpen(false); setNotice("Draft added to this page session only. No chain transaction was made.");
  };

  const createOnchain = async () => {
    setFormError("");
    if (pendingDeployHash) { setFormError("A previous deployment still needs an Explorer check. Do not submit it again while its status is unknown."); return; }
    const usable = criteria.map((item) => item.trim());
    if (!walletAddress || !walletProvider) { setFormError("Connect a wallet before deploying a job contract."); return; }
    if (wrongNetwork) { setFormError("Switch to GenLayer Bradbury Testnet before deploying."); return; }
    if (walletBalanceError || walletBalance === null) { setFormError("TurnMaster cannot verify the Bradbury GEN balance yet. Click Fix Bradbury RPC, wait for the balance to refresh, then try again. No transaction was sent."); return; }
    if (Number(walletBalance) <= 0) { setFormError("This wallet has 0 native GEN for testnet fees. GEN shown as a separate token may not pay gas. Get native Bradbury GEN before deploying. No transaction was sent."); return; }
    if (!form.title.trim() || form.title.trim().length < 4 || form.description.trim().length < 20 || form.delivery.trim().length < 8 || !form.due || !form.reward) { setFormError("Add a title, a 20-character description, a delivery definition, deadline, and reward."); return; }
    if (usable.length === 0 || usable.length > 12 || usable.some((item) => item.length < 18)) { setFormError("Provide 1–12 acceptance criteria, each at least 18 characters."); return; }
    if (!Number.isFinite(Number(form.fee)) || Number(form.fee) < 0 || Number(form.fee) > 100) { setFormError("Release fee must be between 0 and 100 percent."); return; }
    if (!Number.isInteger(Number(form.fee) * 100)) { setFormError("Release fee can have at most two decimal places."); return; }
    const deadline = Math.floor(Date.parse(`${form.due}T23:59:59Z`) / 1000);
    if (!Number.isFinite(deadline) || deadline <= Math.floor(Date.now() / 1000)) { setFormError("Choose a future deadline."); return; }
    setChainBusy(true);
    setFormError("Confirm the Bradbury deployment and network fee in your wallet. Keep this page open until finalization.");
    try {
      const { deployOnchainJob } = await import("@/lib/turnmaster-chain");
      const result = await deployOnchainJob({
        provider: walletProvider,
        walletAddress: walletAddress as Address,
        title: form.title,
        description: form.description,
        deliveryDefinition: form.delivery,
        criteria: usable,
        proofType: form.proofType,
        deadline,
        reward: form.reward,
        commissionPercent: form.fee,
        feeRecipient: feeRecipientConfig,
      });
      const job = jobFromChain(result.address, result.job, result.tx);
      rememberContractAddress(result.address, window.localStorage);
      setJobs((current) => [job, ...current.filter((item) => item.contractAddress?.toLowerCase() !== result.address.toLowerCase())]);
      setSelected(job);
      setActiveStatus("All");
      setCreateOpen(false);
      setNotice("Contract deployment finalized. The job terms are on Bradbury; escrow is not funded yet.");
      setFormError("");
    } catch (error) {
      const { transactionError } = await import("@/lib/turnmaster-chain");
      const hash = (error as { hash?: string })?.hash;
      if (hash) {
        setPendingDeployHash(hash);
        window.sessionStorage.setItem("turnmaster-pending-deploy", hash);
      }
      setFormError(transactionError(error));
    } finally {
      setChainBusy(false);
    }
  };

  const importContract = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWalletMessage("");
    const address = contractInput.trim();
    if (!isEvmAddress(address)) { setWalletMessage("Enter a valid 0x contract address."); return; }
    setChainBusy(true);
    try {
      const { readOnchainJob } = await import("@/lib/turnmaster-chain");
      const record = await readOnchainJob(address as Address);
      const job = jobFromChain(address, record);
      rememberContractAddress(address, window.localStorage);
      setJobs((current) => [job, ...current.filter((item) => item.contractAddress?.toLowerCase() !== address.toLowerCase())]);
      setSelected(job);
      setActiveStatus("All");
      setImportOpen(false);
      setContractInput("");
      setNotice("Contract state loaded from Bradbury. Displayed terms are read from chain.");
    } catch (error) {
      const { transactionError } = await import("@/lib/turnmaster-chain");
      setWalletMessage(transactionError(error));
    } finally {
      setChainBusy(false);
    }
  };

  const updateOnchainJob = (address: string, record: OnchainJob, tx?: TxResult) => {
    rememberContractAddress(address, window.localStorage);
    const previous = jobs.find((item) => item.contractAddress?.toLowerCase() === address.toLowerCase());
    const updated = jobFromChain(address, record, tx ?? previous?.chainTx);
    setJobs((current) => current.map((item) => item.contractAddress?.toLowerCase() === address.toLowerCase() ? updated : item));
    setSelected((current) => current.contractAddress?.toLowerCase() === address.toLowerCase() ? updated : current);
  };

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><BrandMark /><span>turnmaster</span><span className="brand-tag">V1</span></div>
      <div className="workspace-switch"><span className="workspace-icon">T</span><span><b>TurnMaster</b><small>Bradbury workspace</small></span><ChevronDown size={15} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="main-nav">
        <button className={`nav-item ${viewMode === "board" && activeStatus === "All" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("All"); setMobileNav(false); }}><BriefcaseBusiness size={17} />Work board<span className="nav-count">{jobs.length}</span></button>
        <button className={`nav-item ${viewMode === "mine" ? "nav-active" : ""}`} onClick={() => { setViewMode("mine"); setActiveStatus("All"); setMobileNav(false); const mine = jobs.find((job) => !job.sample && job.chainJob && walletAddress && (job.chainJob.client.toLowerCase() === walletAddress.toLowerCase() || job.chainJob.worker.toLowerCase() === walletAddress.toLowerCase())); if (mine) setSelected(mine); }}><LockKeyhole size={17} />My escrow</button>
        <button className={`nav-item ${viewMode === "board" && activeStatus === "In review" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("In review"); setMobileNav(false); }}><Gavel size={17} />Reviews<span className="nav-dot" /></button>
        <button className={`nav-item ${viewMode === "board" && activeStatus === "Resolved" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("Resolved"); setMobileNav(false); }}><Activity size={17} />Activity</button>
      </nav>
      <div className="nav-label nav-label-spaced">MANAGE</div>
      <nav className="main-nav"><button className="nav-item" onClick={() => setCreateOpen(true)}><Plus size={17} />Create a job</button><button className="nav-item" onClick={() => setNotice(`Fee policy: ${defaultReleaseFee}% default on successfully released testnet rewards only. No commission is charged on refunds.`)}><FileText size={17} />Fee policy</button></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Shield size={17} /></div><b>Testnet only</b><p>No real funds or legal arbitration. Every on-chain action needs wallet confirmation.</p><a href="https://docs.genlayer.com/developers/networks" target="_blank" rel="noreferrer">Network details <ExternalLink size={12} /></a></div><div className="profile"><span className="profile-avatar">{walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "G"}</span><span><b>{walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Guest workspace"}</b><small>{walletAddress ? "Wallet connected" : "Connect to get started"}</small></span><ChevronDown size={15} /></div></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="topbar-left"><button aria-label="Open menu" className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button><span className="crumb">Workspace</span><span className="crumb-sep">/</span><b>Work board</b></div><div className="topbar-right"><span className={`network-pill ${wrongNetwork || walletBalanceError ? "network-wrong" : ""}`}><i />{wrongNetwork ? "Wrong network" : walletBalanceError ? "RPC issue" : "Bradbury Testnet"}<span className="chain-id">4221</span></span><button className="icon-button" aria-label="Activity notifications" onClick={() => setNotice("No new account notifications.")}><Bell size={17} /></button>{walletAddress && <button className="network-repair" onClick={repairBradburyNetwork} disabled={networkRepairBusy}>{networkRepairBusy ? "Updating…" : "Fix Bradbury RPC"}</button>}{walletAddress ? <button className="wallet-connected" title={walletAddress} onClick={() => {
      setWalletBalance(null);
      setWalletBalanceError(false);
      void readBradburyNativeBalance(walletAddress).then(setWalletBalance).catch((error) => {
        const reason = error instanceof Error ? error.message : String(error);
        setWalletBalanceError(true);
        setWalletMessage(`Bradbury RPC could not read this wallet's native GEN balance (${reason}). No transaction was sent.`);
      });
    }}><span className="connected-dot" /><span>{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}<small className="wallet-balance">{wrongNetwork ? "Switch to Bradbury" : walletBalance !== null ? `${walletBalance} GEN` : walletBalanceError ? "GEN balance unavailable" : "Reading GEN balance…"}</small></span><ChevronDown size={14} /></button> : <Button className="connect-button" onClick={connectWallet}><Wallet size={15} />Connect wallet</Button>}</div></header>
      <div className="preview-banner"><span className="preview-dot" /><b>TESTNET PREVIEW</b><span>Sample records are illustrative · New contracts use Bradbury Testnet only</span><button aria-label="What does testnet preview mean?" onClick={() => setNotice("This is a public Bradbury testnet preview. Sample records are illustrative. Successfully deployed or opened contract addresses are remembered in this browser and re-read from Bradbury on reload; there is no shared cross-device index yet.")}><CircleHelp size={15} /></button></div>
      <div className="content-wrap">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />WORKSPACE OVERVIEW</div><h1>{viewMode === "mine" ? "My escrow" : "Work board"}</h1><p className="page-subtitle">{viewMode === "mine" ? "Your remembered Bradbury contracts, re-read from chain." : "A clear agreement first. Payment after the work is verified."}</p></div><div className="heading-actions"><Button variant="outline" onClick={() => router.push("/reviewer")}><Shield size={15}/>Reviewer proof</Button><Button variant="outline" onClick={() => { setContractInput(""); setImportOpen(true); }}><ExternalLink size={15}/>Open contract</Button><Button className="primary-action" onClick={() => { setCreateOpen(true); setFormError(""); }}><Plus size={17} />Create a job</Button></div></div>
        <div className="summary-grid" aria-label="Work board summary"><div className="summary-card"><div className="summary-head"><span>Open work</span><span className="summary-icon icon-blue"><BriefcaseBusiness size={16} /></span></div><strong>{scopedJobs.filter(x => x.status === "Open" || x.status === "Funded").length.toString().padStart(2,"0")}</strong><small>Ready to be picked up</small></div><div className="summary-card"><div className="summary-head"><span>Needs review</span><span className="summary-icon icon-amber"><Clock3 size={16} /></span></div><strong>{scopedJobs.filter(x => x.status === "In review" || x.status === "Delivered").length.toString().padStart(2,"0")}</strong><small>Waiting on client decision</small></div><div className="summary-card"><div className="summary-head"><span>Testnet escrow</span><span className="summary-icon icon-violet"><LockKeyhole size={16} /></span></div><strong>{liveJobs.length ? formatWeiGen(escrowWei.toString()) : "—"} <em>GEN</em></strong><small>{liveJobs.length ? `${liveJobs.length} live contract${liveJobs.length === 1 ? "" : "s"} loaded` : "No contract connected"}</small></div><div className="summary-card fee-card"><div className="summary-head"><span>Release fee</span><span className="summary-icon icon-green"><ArrowUpRight size={16} /></span></div><strong>{defaultReleaseFee}<em>%</em></strong><small>{defaultReleaseFee === "0" ? "0% until a fee recipient is configured" : "Only on successful release"}</small></div></div>
        <div className="board-toolbar"><div className="board-title"><div><h2>{viewMode === "mine" ? "My on-chain work" : "Recent work"}</h2><span>{filtered.length} records</span></div><span className="sample-label"><span />{liveJobs.length ? `${liveJobs.length} LIVE CONTRACT${liveJobs.length === 1 ? "" : "S"}` : "SAMPLE DATA"}</span></div><div className="board-controls"><label className="search-box"><Search size={16} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search work" aria-label="Search work" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}<kbd><Command size={11} /> K</kbd></label><label className="filter-button"><Filter size={15} /><span className="sr-only">Filter by status</span><select value={activeStatus} onChange={e => setActiveStatus(e.target.value as "All" | Status)} aria-label="Filter by status">{statuses.map(s=><option value={s} key={s}>{s === "All" ? "All status" : s}</option>)}</select></label></div></div>
        <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as "All" | Status)} className="status-tabs"><TabsList className="status-tab-list" aria-label="Filter work by status">{statuses.map((status) => <TabsTrigger className="status-tab" key={status} value={status}>{status}{status === "All" && <span>{scopedJobs.length}</span>}</TabsTrigger>)}</TabsList></Tabs>
        <div className="work-layout"><div className="job-list" aria-label="Work items">{filtered.length ? filtered.map(job => <button key={job.id} className={`job-row ${selected.id === job.id ? "job-row-selected" : ""}`} onClick={() => { setSelected(job); setDetailOpen(true); }}><span className={`client-mark ${job.color}`}>{job.initials}</span><span className="job-main"><span className="job-title">{job.title}{job.sample && <span className="sample-mini">SAMPLE</span>}</span><span className="job-meta"><span>{job.client}</span><i />{job.category}<i />{job.id}</span></span><span className="job-status"><StatusBadge status={job.status} />{job.note && <small>{job.note}</small>}</span><span className="job-reward"><b>{job.reward}</b><small>Due {job.due}</small></span><ChevronDown className="row-chevron" size={16} /></button>) : <div className="empty-state"><span><Search size={21} /></span><h3>No work found</h3><p>{viewMode === "mine" && !walletAddress ? "Connect your wallet to see remembered contracts where you are the client or worker." : viewMode === "mine" ? "No remembered Bradbury contract matches this wallet and filter. Use Open contract once to add an existing contract to this browser." : "Try another search or choose a different status."}</p><button onClick={() => {setQuery("");setActiveStatus("All");}}>Clear filters</button></div>}</div>
          <aside className="detail-card"><div className="detail-topline"><span className="eyebrow-small">WORK ITEM · {selected.id}</span><button className="more-button" aria-label="More work actions" onClick={() => setNotice("Available actions depend on the work status and connected contract.")}><span>•••</span></button></div><div className="detail-heading"><span className={`client-mark large ${selected.color}`}>{selected.initials}</span><div><h3>{selected.title}</h3><p>Created by {selected.client}</p></div></div><div className="detail-badges"><StatusBadge status={selected.status} />{selected.sample && <span className="sample-outline">SAMPLE</span>}</div><div className="detail-divider"/><div className="detail-facts"><div><span>REWARD</span><b>{selected.reward}</b></div><div><span>DEADLINE</span><b>{selected.due}</b></div><div><span>ESCROW</span><b className="escrow-none"><i />{selected.sample ? "Sample only" : selected.chainJob?.funded ? `${formatWeiGen(selected.chainJob.escrow_wei ?? selected.chainJob.reward_wei)} GEN` : "Not funded"}</b></div></div><div className="detail-section"><div className="detail-section-title"><h4>Acceptance criteria</h4><span>{selected.criteria.length} items</span></div><ol className="criteria-list">{selected.criteria.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></li>)}</ol></div><TermsCopy job={selected}/>{selected.evidence?.length ? <div className="detail-section"><div className="detail-section-title"><h4>Delivery evidence</h4><span>{selected.sample ? "Sample reference" : "On-chain links"}</span></div>{selected.evidence.map((item,i)=><p className="evidence-sample" key={i}><FileText size={14}/>{item}</p>)}</div> : null}{selected.contractAddress && selected.chainJob ? <ContractWorkflow contractAddress={selected.contractAddress} walletAddress={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? "" : walletAddress} provider={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? null : walletProvider} rpcError={walletBalanceError} job={selected.chainJob} lastTx={selected.chainTx} onUpdated={(record, tx) => updateOnchainJob(selected.contractAddress!, record, tx)} /> : <><div className="detail-warning"><CircleAlert size={16}/><p><b>On-chain actions unavailable</b><span>{selected.sample ? "This clearly marked sample has no contract." : "This is a page-session draft; no contract is deployed for it."}</span></p></div><button className="detail-secondary" onClick={() => { setContractInput(""); setImportOpen(true); }}>Open a Bradbury contract</button></>}</aside></div>
        <footer className="page-footer"><span><BrandMark/>TurnMaster <span className="footer-version">V1 preview</span></span><span>GenLayer Bradbury Testnet <i />Contracts deploy per job</span><a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs <ExternalLink size={12}/></a></footer>
      </div>
    </section>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="create-dialog"><DialogHeader><div className="dialog-eyebrow">NEW WORK ITEM <span>01 / 01</span></div><DialogTitle>Create a job</DialogTitle><DialogDescription>Write the terms clearly. Deploy them as a Bradbury contract or add a page-session draft.</DialogDescription></DialogHeader><form onSubmit={createDraft} className="job-form"><div className="preview-inline"><CircleAlert size={15}/><span>Add a browser-only draft, or deploy these frozen terms to Bradbury. An on-chain job starts unfunded; you deposit the reward in a separate confirmed transaction.</span></div><label>Job title<input autoFocus maxLength={90} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Review the v2 governance proposal" required/></label><label>What needs to be done?<textarea rows={3} maxLength={1200} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the work and its boundaries." required/></label><label>What will be delivered?<textarea rows={2} maxLength={700} value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})} placeholder="Name the files, links, format, or outcome." required/></label><fieldset className="criteria-field"><legend>Acceptance criteria <small>Measurable checks</small></legend>{criteria.map((value,i)=><div className="criterion-input" key={i}><span>{String(i+1).padStart(2,"0")}</span><input aria-label={`Acceptance criterion ${i+1}`} maxLength={260} value={value} onChange={e=>setCriteria(criteria.map((v,j)=>j===i?e.target.value:v))} placeholder="A reviewer can verify that…"/><button type="button" onClick={()=>setCriteria(criteria.filter((_,j)=>i!==j))} aria-label={`Remove criterion ${i+1}`} disabled={criteria.length===1}><X size={15}/></button></div>)}<button type="button" className="add-criterion" onClick={()=>setCriteria([...criteria,""])}><Plus size={14}/>Add criterion</button><small className="field-hint">Be specific. Use a result that can be checked from the submitted evidence.</small></fieldset><div className="form-row"><label>Evidence type<select value={form.proofType} onChange={e=>setForm({...form,proofType:e.target.value})}><option>Public URL</option><option>Repository link</option><option>Document link</option><option>Text response</option></select></label><label>Deadline<input type="date" min={new Date().toISOString().slice(0,10)} value={form.due} onChange={e=>setForm({...form,due:e.target.value})} required/></label></div><div className="form-row"><label>Reward <span className="input-unit">GEN</span><input type="number" min="0.000001" step="0.01" value={form.reward} onChange={e=>setForm({...form,reward:e.target.value})} placeholder="0.00" required/></label><label>Release fee <span className="input-unit">%</span><input type="number" min="0" max="100" step="0.1" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></label></div><p className="fee-explain"><Shield size={14}/>Release fee: {Number(form.fee||0)}% on successful release; 0% on refunds. Bradbury Testnet only. {isEvmAddress(feeRecipientConfig) ? "The configured recipient is active for non-zero fees." : "No fee recipient is configured; use 0% until one is set."}</p><div className="chain-create-summary"><b>Bradbury Testnet · Chain 4221</b><span>MetaMask and the GenLayer SDK both use the official Bradbury RPC (https://rpc-bradbury.genlayer.com, chain 4221). TurnMaster adds bounded gas headroom while keeping the outer transaction below Bradbury’s current 16,777,216 gas cap. MetaMask will show 0 GEN as the deployment value; the {form.reward || "0"} GEN reward is deposited later with Fund.</span><span>Bradbury testnet fees are separate. This button stays disabled until the official Bradbury RPC confirms a non-zero native GEN balance.</span></div>{walletBalanceError&&<p className="form-error" role="alert"><CircleAlert size={15}/>TurnMaster could not verify the native GEN balance from the Bradbury RPC. Use Fix Bradbury RPC to request the official wallet endpoint; transaction buttons stay paused until the balance is verified.</p>}{walletBalance=== "0"&&<p className="form-error" role="alert"><CircleAlert size={15}/>Native GEN balance is 0. A separate GEN token balance cannot pay network fees. Get native testnet GEN first.</p>}{formError&&<p className="form-error" role="alert"><CircleAlert size={15}/>{formError}</p>}{pendingDeployHash&&<div className="chain-tx chain-error" role="alert"><span>Transaction result unknown — do not deploy again yet.</span><a href={`https://explorer-bradbury.genlayer.com/tx/${pendingDeployHash}`} target="_blank" rel="noreferrer">Check this transaction in Bradbury Explorer <ExternalLink size={13}/></a><button type="button" onClick={()=>{setPendingDeployHash("");window.sessionStorage.removeItem("turnmaster-pending-deploy");setFormError("Pending transaction cleared. Only retry if Explorer confirms it failed.");}}>Explorer confirms failure — allow retry</button></div>}<DialogFooter><Button type="button" variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button><Button type="submit" className="session-draft-action"><FileText size={15}/>Add session draft</Button><Button type="button" className="primary-action" onClick={createOnchain} disabled={chainBusy||Boolean(pendingDeployHash)||!walletAddress||wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0||(Number(form.fee)>0&&!isEvmAddress(feeRecipientConfig))}><Wallet size={15}/>{chainBusy?"Deploying…":pendingDeployHash?"Check pending transaction":"Deploy terms on Bradbury"}</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={importOpen} onOpenChange={setImportOpen}>
      <DialogContent className="detail-dialog">
        <DialogHeader><DialogTitle>Open a Bradbury contract</DialogTitle><DialogDescription>Read a TurnMaster job directly from its GenLayer contract address. This does not submit a transaction.</DialogDescription></DialogHeader>
        <form className="import-contract-form" onSubmit={importContract}>
          <label>Job contract address<input autoFocus value={contractInput} onChange={(event) => setContractInput(event.target.value)} placeholder="0x…" spellCheck={false} autoCapitalize="off" autoCorrect="off" required /></label>
          <p>Network: Bradbury Testnet · 4221. Only the address and public contract state are read.</p>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button><Button type="submit" className="primary-action" disabled={chainBusy}>{chainBusy ? "Reading contract…" : "Read contract"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="detail-dialog"><DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.id} · {selected.status}{selected.sample ? " · Sample record" : selected.contractAddress ? " · Bradbury Testnet contract" : " · Browser-only draft"}</DialogDescription></DialogHeader><div className="mobile-detail-scroll"><p className="dialog-copy">Acceptance criteria</p><ol className="criteria-list">{selected.criteria.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></li>)}</ol><TermsCopy job={selected}/>{selected.contractAddress && selected.chainJob ? <ContractWorkflow contractAddress={selected.contractAddress} walletAddress={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? "" : walletAddress} provider={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? null : walletProvider} rpcError={walletBalanceError} job={selected.chainJob} lastTx={selected.chainTx} onUpdated={(record, tx) => updateOnchainJob(selected.contractAddress!, record, tx)} /> : <div className="detail-warning"><CircleAlert size={16}/><p><b>On-chain actions unavailable</b><span>{selected.sample ? "This marked sample has no contract." : "This browser-only draft has no deployed contract."}</span></p></div>}</div><DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

    {notice&&<div className="toast-message" role="status"><span><CircleAlert size={16}/>{notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice("")}><X size={15}/></button></div>}
    {walletMessage&&<div className="wallet-message" role="status"><span>{walletAddress?<Check size={15}/>:<CircleAlert size={15}/>} {walletMessage}</span><button onClick={()=>setWalletMessage("")} aria-label="Dismiss"><X size={14}/></button></div>}
  </main>;
}
