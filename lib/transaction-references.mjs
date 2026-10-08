/**
 * Normalize GenLayer triggered-transaction references for audit links.
 * The Bradbury SDK may report the same child hash many times; these are
 * not separate wallet transactions. Keep each valid, distinct hash once.
 */
const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function normalizeTriggeredTransactionIds(parentHash, childHashes) {
  if (!Array.isArray(childHashes)) return [];

  const seen = new Set(typeof parentHash === "string" ? [parentHash.toLowerCase()] : []);
  const distinct = [];

  for (const hash of childHashes) {
    if (typeof hash !== "string" || !TX_HASH_PATTERN.test(hash)) continue;
    const key = hash.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distinct.push(hash);
  }

  return distinct;
}
