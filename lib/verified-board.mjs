// Reconcile only records whose current get_job() read succeeded.
// An attempted address whose read failed must not retain an old row.
// Newly added, already-verified contracts not in the started read batch are
// preserved; the next poll will discover them from localStorage.
/**
 * @template {{contractAddress?: string}} T
 * @param {T[]} current
 * @param {T[]} fresh
 * @param {string[]} attemptedAddresses
 * @returns {T[]}
 */
export function reconcileVerifiedJobs(current, fresh, attemptedAddresses) {
  const attempted = new Set(attemptedAddresses.map((address) => address.toLowerCase()));
  const freshAddresses = new Set(fresh.map((job) => job.contractAddress?.toLowerCase()));
  return [
    ...fresh,
    ...current.filter((job) =>
      job.contractAddress &&
      !attempted.has(job.contractAddress.toLowerCase()) &&
      !freshAddresses.has(job.contractAddress.toLowerCase())),
  ];
}

/**
 * @param {number} attemptedCount
 * @param {number} verifiedCount
 * @returns {'ready'|'partial'|'error'}
 */
export function classifyBoardRead(attemptedCount, verifiedCount) {
  if (attemptedCount === 0) return 'ready';
  if (verifiedCount === 0) return 'error';
  if (verifiedCount < attemptedCount) return 'partial';
  return 'ready';
}
