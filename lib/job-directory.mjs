const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
export const TURNMASTER_DIRECTORY_PAGE_SIZE = 100;

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
