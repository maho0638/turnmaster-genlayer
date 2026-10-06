import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus, type CalldataEncodable, type DecodedDeployData, type TransactionHash } from "genlayer-js/types";
import { isAddress, parseEther, type Address } from "viem";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type OnchainJob = {
  client: Address;
  worker: Address;
  title: string;
  description: string;
  delivery_definition: string;
  acceptance_criteria: string[];
  proof_type: string;
  deadline: number;
  reward_wei: string;
  commission_bps: number;
  status: string;
  funded: boolean;
  revision_count: number;
  decision: string;
  payout_queued: boolean;
  delivery?: { description: string; evidence_urls: string[] };
  escrow_wei?: string;
};

export type TxResult = {
  hash: `0x${string}`;
  children: string[];
};

export class SubmittedTransactionError extends Error {
  readonly hash: string;
  constructor(hash: string, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Transaction was submitted, but TurnMaster could not verify its final status: ${detail}`);
    this.name = "SubmittedTransactionError";
    this.hash = hash;
  }
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function readClient() {
  return createClient({ chain: testnetBradbury });
}

function writeClient(address: string, provider: Eip1193Provider) {
  return createClient({
    chain: testnetBradbury,
    account: address as Address,
    provider: provider as never,
  });
}

export function isContractAddress(value: string): value is Address {
  return ADDRESS_PATTERN.test(value) && isAddress(value);
}

export function parseRewardToWei(value: string): bigint {
  const reward = parseEther(value.trim());
  if (reward <= BigInt(0)) throw new Error("Reward must be greater than zero.");
  return reward;
}

export function formatWeiGen(wei: string): string {
  const digits = wei.padStart(19, "0");
  const whole = digits.slice(0, -18).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-18).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function parseReturnedJson<T>(value: unknown, label: string): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new Error(`${label} returned data that could not be decoded.`);
    }
  }
  if (value && typeof value === "object") return value as T;
  throw new Error(`${label} returned no data.`);
}

export async function readOnchainJob(address: Address): Promise<OnchainJob> {
  const client = readClient();
  const [jobRaw, deliveryRaw, balanceRaw] = await Promise.all([
    client.readContract({ address, functionName: "get_job", args: [] }),
    client.readContract({ address, functionName: "get_delivery", args: [] }),
    client.readContract({ address, functionName: "escrow_balance", args: [] }),
  ]);
  const job = parseReturnedJson<Omit<OnchainJob, "delivery" | "escrow_wei">>(jobRaw, "Job record");
  const delivery = parseReturnedJson<NonNullable<OnchainJob["delivery"]>>(deliveryRaw, "Delivery record");
  return { ...job, delivery, escrow_wei: String(balanceRaw) };
}

async function waitForFinalized(
  client: ReturnType<typeof readClient>,
  hash: TransactionHash,
): Promise<void> {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 4_000,
    retries: 45,
  });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Transaction finalized without successful contract execution (${receipt.txExecutionResultName ?? "unknown result"}).`);
  }
}

async function transactionChildren(client: ReturnType<typeof readClient>, hash: TransactionHash): Promise<string[]> {
  try {
    return await client.getTriggeredTransactionIds({ hash });
  } catch {
    return [];
  }
}

export async function deployOnchainJob(input: {
  provider: Eip1193Provider;
  walletAddress: Address;
  title: string;
  description: string;
  deliveryDefinition: string;
  criteria: string[];
  proofType: string;
  deadline: number;
  reward: string;
  commissionPercent: string;
  feeRecipient: string;
}): Promise<{ address: Address; tx: TxResult; job: OnchainJob }> {
  const reward = parseRewardToWei(input.reward);
  const commissionBps = Math.round(Number(input.commissionPercent) * 100);
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new Error("Release fee must be between 0 and 100 percent.");
  }
  let feeRecipient = ZERO_ADDRESS;
  if (commissionBps > 0) {
    if (!isContractAddress(input.feeRecipient)) {
      throw new Error("A valid platform fee recipient must be configured before using a non-zero release fee.");
    }
    feeRecipient = input.feeRecipient;
  }

  const sourceResponse = await fetch("/TurnMasterEscrow.py", { cache: "no-store" });
  if (!sourceResponse.ok) {
    throw new Error("The public TurnMaster contract source could not be loaded. No wallet transaction was sent.");
  }
  const escrowSource = await sourceResponse.text();
  if (!escrowSource.includes("class TurnMasterEscrow") || !escrowSource.includes("def __init__")) {
    throw new Error("The downloaded TurnMaster contract source is invalid. No wallet transaction was sent.");
  }

  const client = writeClient(input.walletAddress, input.provider);
  await client.connect("testnetBradbury");
  const hash = await client.deployContract({
    code: escrowSource,
    args: [
      input.title.trim(),
      input.description.trim(),
      input.deliveryDefinition.trim(),
      JSON.stringify(input.criteria.map((criterion) => criterion.trim())),
      input.proofType,
      BigInt(input.deadline),
      reward,
      commissionBps,
      feeRecipient,
    ],
  }) as TransactionHash;
  try {
    await waitForFinalized(client, hash);
  } catch (error) {
    throw new SubmittedTransactionError(hash, error);
  }
  const transaction = await client.getTransaction({ hash });
  const decoded = transaction.txDataDecoded;
  const deploymentAddress = (decoded as DecodedDeployData | undefined)?.contractAddress;
  const candidate = deploymentAddress ?? transaction.recipient ?? transaction.to_address;
  if (!candidate || !isContractAddress(candidate)) {
    throw new Error(`Deployment finalized but the SDK did not return a verifiable contract address. Transaction: ${hash}`);
  }
  const address = candidate as Address;
  const job = await readOnchainJob(address);
  if (job.client.toLowerCase() !== input.walletAddress.toLowerCase()) {
    throw new Error(`Deployment address returned a contract owned by a different account. Transaction: ${hash}`);
  }
  return { address, tx: { hash, children: await transactionChildren(client, hash) }, job };
}

export async function writeOnchainJob(input: {
  provider: Eip1193Provider;
  walletAddress: Address;
  address: Address;
  functionName: string;
  args?: CalldataEncodable[];
  value?: bigint;
}): Promise<TxResult> {
  const client = writeClient(input.walletAddress, input.provider);
  await client.connect("testnetBradbury");
  const hash = await client.writeContract({
    address: input.address,
    functionName: input.functionName,
    args: input.args ?? [],
    value: input.value ?? BigInt(0),
  }) as TransactionHash;
  try {
    await waitForFinalized(client, hash);
  } catch (error) {
    throw new SubmittedTransactionError(hash, error);
  }
  return { hash, children: await transactionChildren(client, hash) };
}

export function transactionError(error: unknown): string {
  const candidate = error as { code?: number; shortMessage?: string; message?: string; name?: string };
  if (candidate?.name === "SubmittedTransactionError") return "MetaMask returned a transaction ID, but Bradbury has not confirmed the result yet. Check the Explorer link below before trying again.";
  if (candidate?.code === 4001) return "The wallet request was rejected. No contract state was changed.";
  if (candidate?.code === -32603 || candidate?.message?.toLowerCase().includes("fetch")) {
    return "The Bradbury request failed. In MetaMask, confirm Bradbury Testnet uses https://rpc-bradbury.genlayer.com (chain 4221). Check MetaMask Activity or the Explorer before retrying any submitted transaction.";
  }
  return candidate?.shortMessage || candidate?.message || "The transaction did not complete. Contract state was not assumed to have changed.";
}

export function explorerTransactionUrl(hash: string): string {
  return `https://explorer-bradbury.genlayer.com/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer-bradbury.genlayer.com/address/${address}`;
}

export function zeroAddress(): string {
  return ZERO_ADDRESS;
}
