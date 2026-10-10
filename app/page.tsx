"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import styles from "./premium.module.css";
import { useRouter } from "next/navigation";
import {
  Activity, ArrowUpRight, Bell, BriefcaseBusiness,
  Check, ChevronDown, CircleAlert, CircleHelp, Clock3, Command, Copy, ExternalLink,
  FileText, Filter, Gavel, LockKeyhole, Menu, Plus, RefreshCw,
  Search, Shield, Wallet, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { explorerAddressUrl, type Eip1193Provider, type OnchainJob, type TxResult } from "@/lib/turnmaster-chain";
import { getDeployReadiness } from "@/lib/deploy-readiness.mjs";
import { BRADBURY_CHAIN_ID, BRADBURY_WALLET_NETWORK, formatWeiGen, isEvmAddress, readBradburyNativeBalanceWei } from "@/lib/genlayer-network.mjs";
import type { Address } from "viem";
import { loadContractAddresses, rememberContractAddress, normalizeContractAddresses } from "@/lib/job-registry.mjs";
import { PUBLIC_TURNMASTER_CONTRACTS } from "@/lib/public-contracts.mjs";

const ContractWorkflow = dynamic(() => import("@/app/contract-workflow").then((module) => module.ContractWorkflow), {
  ssr: false,
  loading: () => <p className="chain-no-action" role="status">Loading contract controls…</p>,
});

type Status = "Open" | "Funded" | "Claimed" | "Delivered" | "Revision requested" | "In review" | "Undetermined" | "Resolved" | "Cancelled";
type Job = { id: string; title: string; client: string; initials: string; color: string; category: string; reward: string; due: string; status: Status; criteria: string[]; evidence?: string[]; note?: string; description?: string; deliveryDefinition?: string; proofType?: string; contractAddress?: string; chainJob?: OnchainJob; chainTx?: TxResult };
const statuses: ("All" | Status)[] = ["All", "Open", "Funded", "Claimed", "Delivered", "Revision requested", "In review", "Undetermined", "Resolved", "Cancelled"];
const network = BRADBURY_WALLET_NETWORK;
const networkChainId = BRADBURY_CHAIN_ID;
const feeRecipientConfig = process.env.NEXT_PUBLIC_TURNMASTER_FEE_RECIPIENT ?? "";
const defaultReleaseFee = isEvmAddress(feeRecipientConfig) ? "1.5" : "0";
const modalSecondaryStyle = { backgroundColor: "#0a2946", color: "#dce9f7", borderColor: "#315878" } as const;

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [boardLoadState, setBoardLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [activeStatus, setActiveStatus] = useState<"All" | Status>("All");
  const [viewMode, setViewMode] = useState<"board" | "mine">("board");
  const [requestedJob, setSelected] = useState<Job | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [contractInput, setContractInput] = useState("");
  const [chainBusy, setChainBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"details" | "evidence" | "activity">("details");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletProvider, setWalletProvider] = useState<Eip1193Provider | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletBalanceError, setWalletBalanceError] = useState(false);
  const [networkRepairBusy, setNetworkRepairBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const workspaceAutoCloseRef = useRef<number | null>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [feePolicyOpen, setFeePolicyOpen] = useState(false);
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
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) return;
    let cancelled = false;
    void (async () => {
      try {
        const [accounts, chainHex] = await Promise.all([
          provider.request({ method: "eth_accounts" }) as Promise<string[]>,
          provider.request({ method: "eth_chainId" }) as Promise<string>,
        ]);
        if (cancelled) return;
        setWalletProvider(provider);
        const account = accounts?.[0];
        if (!account) return;
        const chainId = Number.parseInt(chainHex, 16);
        const isWrong = chainId !== networkChainId;
        setWalletAddress(account);
        setWrongNetwork(isWrong);
        setWalletBalance(null);
        setWalletBalanceError(false);
        if (isWrong) {
          setWalletMessage("Connected wallet restored. Switch to GenLayer Bradbury Testnet to use contract actions.");
        }
      } catch {
        // Silent restore must never prompt or block the page.
      }
    })();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("contract")?.trim() ?? "";
    const remembered = loadContractAddresses(window.localStorage);
    const addresses = normalizeContractAddresses([...(isEvmAddress(shared) ? [shared] : []), ...remembered, ...PUBLIC_TURNMASTER_CONTRACTS]);
    if (isEvmAddress(shared)) rememberContractAddress(shared, window.localStorage);
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
        if (live.length === 0) { setBoardLoadState("error"); return; }
        setBoardLoadState("ready");
        setJobs((current) => {
          const liveAddresses = new Set(live.map((job) => job.contractAddress!.toLowerCase()));
          return [...live, ...current.filter((job) => !job.contractAddress || !liveAddresses.has(job.contractAddress.toLowerCase()))];
        });
        const sharedJob = isEvmAddress(shared) ? live.find((job) => job.contractAddress?.toLowerCase() === shared.toLowerCase()) : undefined;
        setSelected((current) => sharedJob ?? live.find((job) => job.contractAddress?.toLowerCase() === current?.contractAddress?.toLowerCase()) ?? live[0]);
        if (sharedJob) setNotice("Shared Bradbury contract loaded and verified from public chain state.");
      })
      .catch(() => { if (!cancelled) setBoardLoadState("error"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!walletMessage || networkRepairBusy) return;
    const delay = wrongNetwork || walletBalanceError ? 12_000 : 5_000;
    const timer = window.setTimeout(() => setWalletMessage(""), delay);
    return () => window.clearTimeout(timer);
  }, [walletMessage, wrongNetwork, walletBalanceError, networkRepairBusy]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!workspaceMenuOpen && !statusFilterOpen && !walletMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (workspaceMenuOpen && !workspaceMenuRef.current?.contains(target)) setWorkspaceMenuOpen(false);
      if (statusFilterOpen && !statusFilterRef.current?.contains(target)) setStatusFilterOpen(false);
      if (walletMenuOpen && !walletMenuRef.current?.contains(target)) setWalletMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceMenuOpen(false);
        setStatusFilterOpen(false);
        setWalletMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [workspaceMenuOpen, statusFilterOpen, walletMenuOpen]);

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
      setWalletBalance(null);
      setWalletBalanceError(false);
      setWalletMessage(isWrong ? "Wallet network changed. TurnMaster contract actions are paused until Bradbury Testnet is selected." : "Wallet is connected to Bradbury Testnet.");
    };
    const onAccountsChanged = (value: unknown) => {
      const accounts = Array.isArray(value) ? value : [];
      setWalletAddress(typeof accounts[0] === "string" ? accounts[0] : "");
      setWalletBalance(null);
      setWalletBalanceError(false);
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
    return jobs.filter((job) => job.chainJob && (
      job.chainJob.client.toLowerCase() === connected || job.chainJob.worker.toLowerCase() === connected
    ));
  }, [jobs, viewMode, walletAddress]);
  const selected = requestedJob && scopedJobs.find((job) => job.contractAddress?.toLowerCase() === requestedJob.contractAddress?.toLowerCase()) || scopedJobs[0] || null;
  const filtered = useMemo(() => scopedJobs.filter((job) => (activeStatus === "All" || job.status === activeStatus) && `${job.title} ${job.client} ${job.category}`.toLowerCase().includes(query.toLowerCase())), [scopedJobs, activeStatus, query]);
  const liveJobs = scopedJobs.filter((job) => job.contractAddress);
  const escrowWei = liveJobs.reduce((total, job) => total + BigInt(job.chainJob?.escrow_wei ?? "0"), BigInt(0));
  const refreshWalletBalance = async () => {
    if (!walletAddress) return;
    setWalletBalance(null);
    setWalletBalanceError(false);
    try {
      const balance = await readBradburyNativeBalance(walletAddress);
      setWalletBalance(balance);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setWalletBalanceError(true);
      setWalletMessage(`Bradbury RPC could not read this wallet's native GEN balance (${reason}). No transaction was sent.`);
    }
  };

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
  // Show an actionable explanation even when the wallet is missing or unfunded.
  // Signing safeguards are enforced again inside createOnchain.
  const deployReadiness = getDeployReadiness({
    walletConnected: Boolean(walletAddress && walletProvider),
    wrongNetwork,
    balanceError: walletBalanceError,
    nativeBalance: walletBalance,
    pendingHash: pendingDeployHash,
    releaseFee: form.fee,
    feeRecipientConfigured: isEvmAddress(feeRecipientConfig),
  });

  const createOnchain = async () => {
    setFormError("");
    if (deployReadiness.kind !== "ready") { setFormError(deployReadiness.message); return; }
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
    setSelected((current) => current?.contractAddress?.toLowerCase() === address.toLowerCase() ? updated : current);
  };

  const cancelWorkspaceAutoClose = () => {
    if (workspaceAutoCloseRef.current === null) return;
    window.clearTimeout(workspaceAutoCloseRef.current);
    workspaceAutoCloseRef.current = null;
  };

  const scheduleWorkspaceAutoClose = () => {
    cancelWorkspaceAutoClose();
    workspaceAutoCloseRef.current = window.setTimeout(() => {
      setWorkspaceMenuOpen(false);
      workspaceAutoCloseRef.current = null;
    }, 260);
  };

  return <main className={`${styles.premium} app-shell`}>
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand" aria-label="TurnMaster">
        <span className="brand-emblem" aria-hidden="true"><i /><i /><i /></span>
        <span className="brand-wordmark"><b className="brand-turn">Turn</b><b className="brand-master">Master</b></span>
        <span className="brand-tag">V1</span>
      </div>
      <div className="workspace-menu-shell" ref={workspaceMenuRef} onMouseEnter={cancelWorkspaceAutoClose} onMouseLeave={scheduleWorkspaceAutoClose}>
        <button type="button" className="workspace-switch" aria-haspopup="menu" aria-expanded={workspaceMenuOpen} onClick={() => { cancelWorkspaceAutoClose(); setWorkspaceMenuOpen((open) => !open); }}>
          <span className="workspace-icon" aria-hidden="true">T</span>
          <span className="workspace-switch-copy"><b>TurnMaster</b><small>Bradbury workspace</small></span>
          <span className="workspace-live-dot" aria-hidden="true" />
          <ChevronDown className={workspaceMenuOpen ? "workspace-chevron workspace-chevron-open" : "workspace-chevron"} size={15} />
        </button>
        {workspaceMenuOpen && <div className="workspace-menu" role="menu" aria-label="TurnMaster workspace">
          <div className="workspace-menu-topline" aria-hidden="true" />
          <div className="workspace-menu-status">
            <span className="workspace-status-dot" />
            <span className="workspace-menu-head-copy"><b>Bradbury Testnet</b><small>Active network</small></span>
            <span className="workspace-menu-chain">4221</span>
          </div>
          <div className="workspace-menu-section-label">WORKSPACE</div>
          <button type="button" role="menuitem" className={viewMode === "board" && activeStatus === "All" ? "workspace-menu-item workspace-menu-item-active" : "workspace-menu-item"} onClick={() => { setViewMode("board"); setActiveStatus("All"); setWorkspaceMenuOpen(false); setMobileNav(false); }}>
            <span className="workspace-menu-item-icon"><BriefcaseBusiness size={15}/></span><span><b>Work board</b><small>Browse all work items</small></span>
          </button>
          <button type="button" role="menuitem" className={viewMode === "mine" ? "workspace-menu-item workspace-menu-item-active" : "workspace-menu-item"} onClick={() => { setViewMode("mine"); setActiveStatus("All"); setWorkspaceMenuOpen(false); setMobileNav(false); const mine = jobs.find((job) => job.chainJob && walletAddress && (job.chainJob.client.toLowerCase() === walletAddress.toLowerCase() || job.chainJob.worker.toLowerCase() === walletAddress.toLowerCase())); if (mine) setSelected(mine); }}>
            <span className="workspace-menu-item-icon"><LockKeyhole size={15}/></span><span><b>My escrow</b><small>Contracts linked to this wallet</small></span>
          </button>
          <div className="workspace-menu-separator" />
          <button type="button" role="menuitem" className="workspace-menu-item" onClick={() => { setWorkspaceMenuOpen(false); router.push("/reviewer"); }}>
            <span className="workspace-menu-item-icon"><Shield size={15}/></span><span><b>Reviewer proof</b><small>Open public verification view</small></span>
          </button>
          <button type="button" role="menuitem" className="workspace-menu-item" onClick={() => { setWorkspaceMenuOpen(false); setContractInput(""); setImportOpen(true); }}>
            <span className="workspace-menu-item-icon"><ExternalLink size={15}/></span><span><b>Open contract</b><small>Load a Bradbury contract</small></span>
          </button>
        </div>}
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation" className="main-nav">
        <button className={`nav-item ${viewMode === "board" && activeStatus === "All" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("All"); setMobileNav(false); }}><BriefcaseBusiness size={17} />Work board<span className="nav-count">{jobs.length}</span></button>
        <button className={`nav-item ${viewMode === "mine" ? "nav-active" : ""}`} onClick={() => { setViewMode("mine"); setActiveStatus("All"); setMobileNav(false); const mine = jobs.find((job) => job.chainJob && walletAddress && (job.chainJob.client.toLowerCase() === walletAddress.toLowerCase() || job.chainJob.worker.toLowerCase() === walletAddress.toLowerCase())); if (mine) setSelected(mine); }}><LockKeyhole size={17} />My escrow</button>
        <button className={`nav-item ${viewMode === "board" && activeStatus === "In review" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("In review"); setMobileNav(false); }}><Gavel size={17} />Reviews<span className="nav-dot" /></button>
        <button className={`nav-item ${viewMode === "board" && activeStatus === "Resolved" ? "nav-active" : ""}`} onClick={() => { setViewMode("board"); setActiveStatus("Resolved"); setMobileNav(false); }}><Activity size={17} />Activity</button>
      </nav>
      <div className="nav-label nav-label-spaced">MANAGE</div>
      <nav className="main-nav"><button className="nav-item" onClick={() => setCreateOpen(true)}><Plus size={17} />Create a job</button><button className="nav-item" onClick={() => setFeePolicyOpen(true)}><FileText size={17} />Fee policy</button></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Shield size={17} /></div><b>Testnet only</b><p>No real funds or legal arbitration. Every on-chain action needs wallet confirmation.</p><a href="https://docs.genlayer.com/developers/networks" target="_blank" rel="noreferrer">Network details <ExternalLink size={12} /></a></div><div className="profile"><span className="profile-avatar">{walletAddress ? walletAddress.slice(2, 4).toUpperCase() : "G"}</span><span><b>{walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Guest workspace"}</b><small>{walletAddress ? "Wallet connected" : "Connect to get started"}</small></span><ChevronDown size={15} /></div></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="topbar-left"><button aria-label="Open menu" className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button><span className="crumb">Workspace</span><span className="crumb-sep">/</span><b>Work board</b></div><div className="topbar-right"><span className={`network-pill ${wrongNetwork || walletBalanceError ? "network-wrong" : ""}`}><i />{wrongNetwork ? "Wrong network" : walletBalanceError ? "RPC issue" : "Bradbury Testnet"}<span className="chain-id">4221</span></span><button className="icon-button" aria-label="Activity notifications" onClick={() => setNotice("No new account notifications.")}><Bell size={17} /></button>{walletAddress && (wrongNetwork || walletBalanceError || networkRepairBusy) && <button className="network-repair" onClick={repairBradburyNetwork} disabled={networkRepairBusy}>{networkRepairBusy ? "Updating…" : "Fix Bradbury RPC"}</button>}{walletAddress ? <div className="wallet-menu-shell" ref={walletMenuRef}>
      <button className="wallet-connected" title={walletAddress} aria-haspopup="menu" aria-expanded={walletMenuOpen} onClick={() => setWalletMenuOpen((open) => !open)}><span className="connected-dot" /><span>{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}<small className="wallet-balance">{wrongNetwork ? "Switch to Bradbury" : walletBalance !== null ? `${walletBalance} GEN` : walletBalanceError ? "GEN balance unavailable" : "Reading GEN balance…"}</small></span><ChevronDown className={walletMenuOpen ? "wallet-chevron wallet-chevron-open" : "wallet-chevron"} size={14} /></button>
      {walletMenuOpen && <div className="wallet-menu" role="menu" aria-label="Wallet menu">
        <div className="wallet-menu-head"><span className="connected-dot" /><span><b>Connected wallet</b><small>Bradbury Testnet · 4221</small></span></div>
        <div className="wallet-menu-address"><span>Address</span><b className="mono">{walletAddress}</b></div>
        <div className="wallet-menu-balance"><span>Native balance</span><b>{wrongNetwork ? "Switch to Bradbury" : walletBalance !== null ? `${walletBalance} GEN` : walletBalanceError ? "Unavailable" : "Reading…"}</b></div>
        <div className="wallet-menu-actions">
          <button type="button" role="menuitem" onClick={() => void refreshWalletBalance()}><RefreshCw size={14}/>Refresh balance</button>
          <button type="button" role="menuitem" onClick={() => { void navigator.clipboard.writeText(walletAddress); setNotice("Wallet address copied."); }}><Copy size={14}/>Copy address</button>
          <a role="menuitem" href={explorerAddressUrl(walletAddress)} target="_blank" rel="noreferrer"><ExternalLink size={14}/>Open in Explorer</a>
        </div>
      </div>}
    </div> : <Button className="connect-button" onClick={connectWallet}><Wallet size={15} />Connect wallet</Button>}</div></header>
      <div className="preview-banner"><span className="preview-dot" /><b>TESTNET PREVIEW</b><span>Displayed work is read from verified GenLayer Bradbury contracts only</span><button aria-label="What does testnet preview mean?" onClick={() => setNotice("Publicly verified Bradbury contract addresses are loaded even on a fresh browser. New user-deployed contracts are remembered in the browser or can be loaded using Open contract. Only current on-chain contract data is displayed; no example jobs are generated.")}><CircleHelp size={15} /></button></div>
      <div className="content-wrap">
        <div className="page-heading premium-hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" />WORKSPACE OVERVIEW</div>
            <h1>{viewMode === "mine" ? <>My <span>escrow</span></> : <>Work <span>board</span></>}</h1>
            <p className="page-subtitle">{viewMode === "mine" ? "Your remembered Bradbury contracts, re-read from chain." : "A clear agreement first. Payment after the work is verified."}</p>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-globe"><i/><i/><i/><i/><i/><i/></div>
            <div className="hero-mantra"><span>TRUST</span><span>WORK</span><span>DELIVER</span><span>ON CHAIN</span></div>
          </div>
          <div className="heading-actions"><Button variant="outline" onClick={() => router.push("/reviewer")}><Shield size={15}/>Reviewer proof</Button><Button variant="outline" onClick={() => { setContractInput(""); setImportOpen(true); }}><ExternalLink size={15}/>Open contract</Button><Button className="primary-action" onClick={() => { setCreateOpen(true); setFormError(""); }}><Plus size={17} />Create a job</Button></div>
        </div>
        <div className="summary-grid" aria-label="Work board summary"><div className="summary-card"><div className="summary-head"><span>Open work</span><span className="summary-icon icon-blue"><BriefcaseBusiness size={16} /></span></div><strong>{scopedJobs.filter(x => x.status === "Open" || x.status === "Funded").length.toString().padStart(2,"0")}</strong><small>Ready to be picked up</small></div><div className="summary-card"><div className="summary-head"><span>Needs review</span><span className="summary-icon icon-amber"><Clock3 size={16} /></span></div><strong>{scopedJobs.filter(x => x.status === "In review" || x.status === "Delivered").length.toString().padStart(2,"0")}</strong><small>Waiting on client decision</small></div><div className="summary-card"><div className="summary-head"><span>Testnet escrow</span><span className="summary-icon icon-violet"><LockKeyhole size={16} /></span></div><strong>{liveJobs.length ? formatWeiGen(escrowWei.toString()) : "—"} <em>GEN</em></strong><small>{liveJobs.length ? `${liveJobs.length} live contract${liveJobs.length === 1 ? "" : "s"} loaded` : "No contract connected"}</small></div><button type="button" className="summary-card fee-card summary-action-card" onClick={() => setFeePolicyOpen(true)} aria-label="Open release fee policy"><div className="summary-head"><span>Release fee</span><span className="summary-icon icon-green"><ArrowUpRight size={16} /></span></div><strong>{defaultReleaseFee}<em>%</em></strong><small>{defaultReleaseFee === "0" ? "0% until a fee recipient is configured" : "Only on successful release"}</small></button></div>
        <div className="board-toolbar"><div className="board-title"><div><h2>{viewMode === "mine" ? "My on-chain work" : "Recent work"}</h2><span>{filtered.length} records</span></div><span className="sample-label"><span />{boardLoadState === "loading" ? "READING GENLAYER" : boardLoadState === "error" ? "CHAIN READ UNAVAILABLE" : `${liveJobs.length} LIVE CONTRACT${liveJobs.length === 1 ? "" : "S"}`}</span></div><div className="board-controls"><label className="search-box"><Search size={16} /><input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search work" aria-label="Search work" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}<kbd><Command size={11} /> K</kbd></label><div className="status-filter-shell" ref={statusFilterRef}><button type="button" className="filter-button status-filter-trigger" aria-haspopup="menu" aria-expanded={statusFilterOpen} aria-label="Filter by status" onClick={() => setStatusFilterOpen((open) => !open)}><Filter size={15} /><span>{activeStatus === "All" ? "All status" : activeStatus}</span><ChevronDown className={statusFilterOpen ? "status-filter-chevron status-filter-chevron-open" : "status-filter-chevron"} size={14} /></button>{statusFilterOpen && <div className="status-filter-menu" role="menu" aria-label="Status filters">{statuses.map((status) => <button type="button" role="menuitemradio" aria-checked={activeStatus === status} className={activeStatus === status ? "status-filter-option status-filter-option-active" : "status-filter-option"} key={status} onClick={() => { setActiveStatus(status); setStatusFilterOpen(false); }}><span>{status === "All" ? "All status" : status}</span>{activeStatus === status && <Check size={13} />}</button>)}</div>}</div></div></div>
        <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as "All" | Status)} className="status-tabs"><TabsList className="status-tab-list" aria-label="Filter work by status">{statuses.map((status) => <TabsTrigger className="status-tab" key={status} value={status}>{status}{status === "All" && <span>{scopedJobs.length}</span>}</TabsTrigger>)}</TabsList></Tabs>
        <div className="work-layout"><div className="job-list" aria-label="Work items">{filtered.length ? filtered.map(job => <button key={job.id} className={`job-row ${selected?.id === job.id ? "job-row-selected" : ""}`} onClick={() => { setSelected(job); setDetailTab("details"); setDetailOpen(true); }}><span className={`client-mark ${job.color}`}>{job.initials}</span><span className="job-main"><span className="job-title">{job.title}<span className="verified-mini">VERIFIED</span></span><span className="job-meta"><span>{job.client}</span><i />{job.category}<i />{job.id}</span></span><span className="job-status"><StatusBadge status={job.status} />{job.note && <small>{job.note}</small>}</span><span className="job-reward"><b>{job.reward}</b><small>Due {job.due}</small></span><ChevronDown className="row-chevron" size={16} /></button>) : <div className="empty-state"><span><Search size={21} /></span><h3>{boardLoadState === "loading" ? "Loading verified Bradbury contracts" : boardLoadState === "error" ? "Could not read Bradbury contracts" : "No matching on-chain jobs"}</h3><p>{viewMode === "mine" && !walletAddress ? "Connect your wallet to see remembered contracts where you are the client or worker." : viewMode === "mine" ? "No remembered Bradbury contract matches this wallet and filter. Use Open contract once to add an existing contract to this browser." : boardLoadState === "error" ? "Bradbury RPC reads failed; no fabricated data is shown. Refresh when the RPC is available." : "Only verified Bradbury contracts are displayed. Search again or open an existing contract address."}</p><button onClick={() => {setQuery("");setActiveStatus("All");}}>Clear filters</button></div>}</div>
          <aside className="detail-card">
            {selected ? <>
            <div className="detail-topline"><span className="eyebrow-small">WORK ITEM · {selected.id}</span><button className="more-button" aria-label="More work actions" onClick={() => setNotice("Available actions depend on the work status and connected contract.")}><span>•••</span></button></div>
            <div className="detail-heading"><span className={`client-mark large ${selected.color}`}>{selected.initials}</span><div><h3>{selected.title}</h3><p>Created by {selected.client}</p></div></div>
            <div className="detail-badges"><StatusBadge status={selected.status} /><span className="verified-outline"><Check size={11}/>ON-CHAIN</span></div>
            <div className="detail-tabs" role="tablist" aria-label="Work item details">
              <button className={detailTab === "details" ? "active" : ""} onClick={() => setDetailTab("details")}>Details</button>
              <button className={detailTab === "evidence" ? "active" : ""} onClick={() => setDetailTab("evidence")}>Evidence</button>
              <button className={detailTab === "activity" ? "active" : ""} onClick={() => setDetailTab("activity")}>Activity</button>
            </div>
            {detailTab === "details" && <>
              <div className="detail-facts"><div><span>REWARD</span><b>{selected.reward}</b></div><div><span>DEADLINE</span><b>{selected.due}</b></div><div><span>ESCROW</span><b className="escrow-none"><i />{selected.chainJob?.funded ? `${formatWeiGen(selected.chainJob.escrow_wei ?? selected.chainJob.reward_wei)} GEN` : "Not funded"}</b></div></div>
              <div className="detail-section"><div className="detail-section-title"><h4>Acceptance criteria</h4><span>{selected.criteria.length} items</span></div><ol className="criteria-list">{selected.criteria.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></li>)}</ol></div>
              <TermsCopy job={selected}/>
              {selected.contractAddress && selected.chainJob ? <ContractWorkflow contractAddress={selected.contractAddress} walletAddress={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? "" : walletAddress} provider={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? null : walletProvider} rpcError={walletBalanceError} job={selected.chainJob} lastTx={selected.chainTx} onUpdated={(record, tx) => updateOnchainJob(selected.contractAddress!, record, tx)} /> : <><div className="detail-warning"><CircleAlert size={16}/><p><b>On-chain actions unavailable</b><span>{"This record is not verified on chain."}</span></p></div><button className="detail-secondary" onClick={() => { setContractInput(""); setImportOpen(true); }}>Open a Bradbury contract</button></>}
            </>}
            {detailTab === "evidence" && <div className="detail-tab-panel">
              <div className="detail-section-title"><h4>Delivery evidence</h4><span>{selected.evidence?.length ?? 0} links</span></div>
              {selected.evidence?.length ? selected.evidence.map((item,i)=><p className="evidence-sample premium-evidence" key={i}><FileText size={14}/><span>{item}</span></p>) : <div className="empty-detail-tab"><Shield size={22}/><b>No evidence submitted yet</b><span>Public evidence will appear here after the worker submits delivery.</span></div>}
            </div>}
            {detailTab === "activity" && <div className="detail-tab-panel activity-panel">
              <div className="activity-item"><span className="activity-dot live"/><div><b>Current state · {selected.status}</b><small>Read from GenLayer Bradbury Testnet</small></div></div>
              {selected.contractAddress && <div className="activity-item"><span className="activity-dot"/><div><b>Contract verified</b><small>{selected.contractAddress}</small></div></div>}
              {selected.chainTx && <a className="activity-item activity-link" href={`https://explorer-bradbury.genlayer.com/tx/${selected.chainTx.hash}`} target="_blank" rel="noreferrer"><span className="activity-dot gold"/><div><b>Latest finalized transaction</b><small>{selected.chainTx.hash}</small></div><ExternalLink size={13}/></a>}
              {selected.note && <div className="activity-item"><span className="activity-dot muted"/><div><b>Timeline note</b><small>{selected.note}</small></div></div>}
            </div>}
            </> : <div className="empty-detail-tab"><Shield size={22}/><b>No contract selected</b><span>Only verified Bradbury contracts appear. Use Open contract to load an address.</span></div>}
          </aside></div>
        <footer className="page-footer"><span><BrandMark/>TurnMaster <span className="footer-version">V1 preview</span></span><span>GenLayer Bradbury Testnet <i />Contracts deploy per job</span><a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">GenLayer docs <ExternalLink size={12}/></a></footer>
      </div>
    </section>

    <Dialog open={feePolicyOpen} onOpenChange={setFeePolicyOpen}><DialogContent className="detail-dialog fee-policy-dialog"><DialogHeader><div className="dialog-eyebrow">TURNMASTER POLICY <span>TESTNET</span></div><DialogTitle>Release fee policy</DialogTitle><DialogDescription>How TurnMaster handles release fees on Bradbury Testnet.</DialogDescription></DialogHeader><div className="fee-policy-body"><div><span>Current default</span><b>{defaultReleaseFee}%</b></div><p><Check size={15}/>A release fee applies only when a job reward is successfully released after the workflow completes.</p><p><Check size={15}/>Refunds are charged 0%.</p><p><Shield size={15}/>{isEvmAddress(feeRecipientConfig) ? "A fee recipient is configured for non-zero fees." : "No fee recipient is configured, so the current live default is 0%."}</p><small>Bradbury Testnet only · no real-money fee is collected by this demo.</small></div><DialogFooter><Button type="button" variant="outline" style={modalSecondaryStyle} onClick={() => setFeePolicyOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="create-dialog"><DialogHeader><div className="dialog-eyebrow">NEW WORK ITEM <span>01 / 01</span></div><DialogTitle>Create a job</DialogTitle><DialogDescription>Write the terms clearly, then deploy a Bradbury contract with wallet approval.</DialogDescription></DialogHeader><form onSubmit={(event) => event.preventDefault()} className="job-form"><div className="preview-inline"><CircleAlert size={15}/><span>Deploy these frozen terms to Bradbury. An on-chain job starts unfunded; you deposit the reward in a separate confirmed transaction.</span></div><label>Job title<input autoFocus maxLength={90} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Review the v2 governance proposal" required/></label><label>What needs to be done?<textarea rows={3} maxLength={1200} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the work and its boundaries." required/></label><label>What will be delivered?<textarea rows={2} maxLength={700} value={form.delivery} onChange={e=>setForm({...form,delivery:e.target.value})} placeholder="Name the files, links, format, or outcome." required/></label><fieldset className="criteria-field"><legend>Acceptance criteria <small>Measurable checks</small></legend>{criteria.map((value,i)=><div className="criterion-input" key={i}><span>{String(i+1).padStart(2,"0")}</span><input aria-label={`Acceptance criterion ${i+1}`} maxLength={260} value={value} onChange={e=>setCriteria(criteria.map((v,j)=>j===i?e.target.value:v))} placeholder="A reviewer can verify that…"/><button type="button" onClick={()=>setCriteria(criteria.filter((_,j)=>i!==j))} aria-label={`Remove criterion ${i+1}`} disabled={criteria.length===1}><X size={15}/></button></div>)}<button type="button" className="add-criterion" onClick={()=>setCriteria([...criteria,""])}><Plus size={14}/>Add criterion</button><small className="field-hint">Be specific. Use a result that can be checked from the submitted evidence.</small></fieldset><div className="form-row"><label>Evidence type<select value={form.proofType} onChange={e=>setForm({...form,proofType:e.target.value})}><option>Public URL</option><option>Repository link</option><option>Document link</option><option>Text response</option></select></label><label>Deadline<input type="date" min={new Date().toISOString().slice(0,10)} value={form.due} onChange={e=>setForm({...form,due:e.target.value})} required/></label></div><div className="form-row"><label>Reward <span className="input-unit">GEN</span><input type="number" min="0.000001" step="0.01" value={form.reward} onChange={e=>setForm({...form,reward:e.target.value})} placeholder="0.00" required/></label><label>Release fee <span className="input-unit">%</span><input type="number" min="0" max="100" step="0.1" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></label></div><p className="fee-explain"><Shield size={14}/>Release fee: {Number(form.fee||0)}% on successful release; 0% on refunds. Bradbury Testnet only. {isEvmAddress(feeRecipientConfig) ? "The configured recipient is active for non-zero fees." : "No fee recipient is configured; use 0% until one is set."}</p><div className="chain-create-summary"><b>Bradbury Testnet · Chain 4221</b><span>MetaMask and the GenLayer SDK both use the official Bradbury RPC (https://rpc-bradbury.genlayer.com, chain 4221). TurnMaster adds bounded gas headroom while keeping the outer transaction below Bradbury’s current 16,777,216 gas cap. MetaMask will show 0 GEN as the deployment value; the {form.reward || "0"} GEN reward is deposited later with Fund.</span><span>Bradbury network fees are separate. Deploy always responds when clicked and explains any missing prerequisites. Wallet approval is required before a transaction can be sent.</span></div><div className={`deploy-readiness ${deployReadiness.kind === "ready" ? "deploy-readiness-ready" : "deploy-readiness-blocked"}`} role="status" aria-live="polite"><strong>{deployReadiness.kind === "ready" ? "Ready for wallet review" : "Deployment prerequisite"}</strong><span>{deployReadiness.message}</span><div className="deploy-assist-actions">{deployReadiness.kind === "wallet" && <button type="button" onClick={connectWallet}>Connect wallet</button>}{(deployReadiness.kind === "network" || deployReadiness.kind === "rpc") && <button type="button" onClick={repairBradburyNetwork}>Fix Bradbury RPC</button>}{deployReadiness.kind === "fee" && <button type="button" onClick={() => setForm({...form, fee: "0"})}>Set fee to 0%</button>}{deployReadiness.kind === "funds" && <a href="https://testnet-faucet.genlayer.foundation/" target="_blank" rel="noreferrer">Official GEN testnet faucet ↗</a>}<a href="https://explorer-bradbury.genlayer.com/tx/0xdfd81b89a9eff23899cde18b9790bb2c70b7b15adce60cf936c1e61a9783dc57" target="_blank" rel="noreferrer">View a finalized Bradbury deployment ↗</a></div></div>{walletBalanceError&&<p className="form-error" role="alert"><CircleAlert size={15}/>TurnMaster could not verify the native GEN balance from the Bradbury RPC. Use Fix Bradbury RPC to request the official wallet endpoint; transaction buttons stay paused until the balance is verified.</p>}{walletBalance=== "0"&&<p className="form-error" role="alert"><CircleAlert size={15}/>Native GEN balance is 0. A separate GEN token balance cannot pay network fees. Get native testnet GEN first.</p>}{formError&&<p className="form-error" role="alert"><CircleAlert size={15}/>{formError}</p>}{pendingDeployHash&&<div className="chain-tx chain-error" role="alert"><span>Transaction result unknown — do not deploy again yet.</span><a href={`https://explorer-bradbury.genlayer.com/tx/${pendingDeployHash}`} target="_blank" rel="noreferrer">Check this transaction in Bradbury Explorer <ExternalLink size={13}/></a><button type="button" onClick={()=>{setPendingDeployHash("");window.sessionStorage.removeItem("turnmaster-pending-deploy");setFormError("Pending transaction cleared. Only retry if Explorer confirms it failed.");}}>Explorer confirms failure — allow retry</button></div>}<DialogFooter><Button type="button" variant="outline" style={modalSecondaryStyle} onClick={()=>setCreateOpen(false)}>Cancel</Button><Button type="button" className="primary-action" onClick={createOnchain} disabled={chainBusy}><Wallet size={15}/>{chainBusy?"Deploying…":pendingDeployHash?"Check pending transaction":"Deploy terms on Bradbury"}</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={importOpen} onOpenChange={setImportOpen}>
      <DialogContent className="detail-dialog">
        <DialogHeader><DialogTitle>Open a Bradbury contract</DialogTitle><DialogDescription>Read a TurnMaster job directly from its GenLayer contract address. This does not submit a transaction.</DialogDescription></DialogHeader>
        <form className="import-contract-form" onSubmit={importContract}>
          <label>Job contract address<input autoFocus value={contractInput} onChange={(event) => setContractInput(event.target.value)} placeholder="0x…" spellCheck={false} autoCapitalize="off" autoCorrect="off" required /></label>
          <p>Network: Bradbury Testnet · 4221. Only the address and public contract state are read.</p>
          <DialogFooter><Button type="button" variant="outline" style={modalSecondaryStyle} onClick={() => setImportOpen(false)}>Cancel</Button><Button type="submit" className="primary-action" disabled={chainBusy}>{chainBusy ? "Reading contract…" : "Read contract"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {selected && <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="detail-dialog"><DialogHeader><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.id} · {selected.status}{" · Bradbury Testnet contract"}</DialogDescription></DialogHeader><div className="mobile-detail-scroll"><p className="dialog-copy">Acceptance criteria</p><ol className="criteria-list">{selected.criteria.map((item,i)=><li key={i}><span>{String(i+1).padStart(2,"0")}</span><p>{item}</p></li>)}</ol><TermsCopy job={selected}/>{selected.contractAddress && selected.chainJob ? <ContractWorkflow contractAddress={selected.contractAddress} walletAddress={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? "" : walletAddress} provider={(wrongNetwork||walletBalanceError||walletBalance===null||Number(walletBalance)<=0) ? null : walletProvider} rpcError={walletBalanceError} job={selected.chainJob} lastTx={selected.chainTx} onUpdated={(record, tx) => updateOnchainJob(selected.contractAddress!, record, tx)} /> : <div className="detail-warning"><CircleAlert size={16}/><p><b>On-chain actions unavailable</b><span>{"No verified contract is available."}</span></p></div>}</div><DialogFooter><Button variant="outline" style={modalSecondaryStyle} onClick={() => setDetailOpen(false)}>Close</Button></DialogFooter></DialogContent></Dialog>}

    {notice&&<div className="toast-message" role="status"><span><CircleAlert size={16}/>{notice}</span><button aria-label="Dismiss message" onClick={()=>setNotice("")}><X size={15}/></button></div>}
    {walletMessage&&<div className="wallet-message" role="status"><span>{walletAddress?<Check size={15}/>:<CircleAlert size={15}/>} {walletMessage}</span><button onClick={()=>setWalletMessage("")} aria-label="Dismiss"><X size={14}/></button></div>}
  </main>;
}
