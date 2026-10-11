const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const STATUS_VALUES = new Set([
  "open", "funded", "claimed", "delivered", "revision_requested",
  "disputed", "undetermined", "resolved", "cancelled",
]);
export const TURNMASTER_DIRECTORY_PAGE_SIZE = 100;

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Validate untrusted get_job() output before it reaches the React board.
 * A public directory can contain contracts that do not implement TurnMaster.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidOnchainJob(value) {
  if (!isRecord(value)) return false;
  if (typeof value.client !== "string" || !ADDRESS_PATTERN.test(value.client)) return false;
  if (typeof value.worker !== "string" || !ADDRESS_PATTERN.test(value.worker)) return false;
  if (typeof value.title !== "string" || value.title.trim().length < 4) return false;
  if (typeof value.description !== "string") return false;
  if (typeof value.delivery_definition !== "string") return false;
  if (!isStringArray(value.acceptance_criteria) || value.acceptance_criteria.length === 0) return false;
  if (typeof value.proof_type !== "string") return false;
  if (!Number.isSafeInteger(value.deadline) || value.deadline < 0) return false;
  if (typeof value.reward_wei !== "string" || !/^\d+$/.test(value.reward_wei)) return false;
  if (!Number.isSafeInteger(value.commission_bps) || value.commission_bps < 0 || value.commission_bps > 10_000) return false;
  if (typeof value.status !== "string" || !STATUS_VALUES.has(value.status)) return false;
  if (typeof value.funded !== "boolean") return false;
  if (!Number.isSafeInteger(value.revision_count) || value.revision_count < 0) return false;
  if (typeof value.decision !== "string" || typeof value.payout_queued !== "boolean") return false;
  if (value.escrow_wei !== undefined && (typeof value.escrow_wei !== "string" || !/^\d+$/.test(value.escrow_wei))) return false;
  if (value.delivery !== undefined && (!isRecord(value.delivery)
      || typeof value.delivery.description !== "string"
      || !isStringArray(value.delivery.evidence_urls))) return false;
  if (value.dispute !== undefined && value.dispute !== null) {
    const dispute = value.dispute;
    if (!isRecord(dispute)
        || typeof dispute.reason !== "string"
        || !Number.isSafeInteger(dispute.evidence_deadline)
        || !Number.isSafeInteger(dispute.recovery_deadline)
        || typeof dispute.client_responded !== "boolean"
        || typeof dispute.worker_responded !== "boolean"
        || !Number.isSafeInteger(dispute.retry_count)
        || !Number.isSafeInteger(dispute.round)
        || !isStringArray(dispute.client_evidence_urls)
        || !isStringArray(dispute.worker_evidence_urls)) return false;
  }
  return true;
}

/** @param {unknown} value @returns {string[]} */
export function normalizeDirectoryAddresses(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const addresses = [];
  for (const address of value) {
    if (typeof address !== "string" || !ADDRESS_PATTERN.test(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }
  return addresses;
}

/** @param {number} count @returns {Array<{offset: number, limit: number}>} */
export function directoryReadPlan(count) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid directory count.");
  const readCount = Math.min(count, TURNMASTER_DIRECTORY_PAGE_SIZE);
  if (readCount === 0) return [];
  return [{ offset: 0, limit: readCount }];
}
