const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const ZERO = "0x0000000000000000000000000000000000000000";

export function buildContractShareUrl(origin, address) {
  if (typeof origin !== "string" || !origin.startsWith("http")) throw new Error("A valid site origin is required.");
  if (!ADDRESS_PATTERN.test(address)) throw new Error("A valid contract address is required.");
  return `${origin.replace(/\/$/, "")}/?contract=${address}`;
}

export function decisionOutcome(decision) {
  if (typeof decision !== "string" || !decision.trim()) return null;
  try {
    const parsed = JSON.parse(decision);
    return parsed && typeof parsed === "object" && typeof parsed.outcome === "string" ? parsed.outcome : null;
  } catch {
    return null;
  }
}

export function buildContractProofReceipt(address, job) {
  if (!ADDRESS_PATTERN.test(address)) throw new Error("A valid contract address is required.");
  const evidence = Array.isArray(job?.delivery?.evidence_urls) ? job.delivery.evidence_urls.filter((url) => typeof url === "string") : [];
  const criteria = Array.isArray(job?.acceptance_criteria) ? job.acceptance_criteria : [];
  const worker = typeof job?.worker === "string" && job.worker.toLowerCase() !== ZERO ? job.worker : null;
  return {
    schema: "turnmaster-proof-v1",
    generatedFrom: "public Bradbury contract state",
    network: { name: "GenLayer Bradbury Testnet", chainId: 4221 },
    contractAddress: address,
    status: String(job?.status ?? "unknown"),
    client: String(job?.client ?? ""),
    worker,
    deadline: Number(job?.deadline ?? 0),
    rewardWei: String(job?.reward_wei ?? "0"),
    escrowWei: String(job?.escrow_wei ?? "0"),
    criteriaCount: criteria.length,
    evidenceCount: evidence.length,
    revisionCount: Number(job?.revision_count ?? 0),
    decisionOutcome: decisionOutcome(job?.decision ?? ""),
    explorer: `https://explorer-bradbury.genlayer.com/address/${address}`,
  };
}
