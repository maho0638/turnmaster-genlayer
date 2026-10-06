export const TURNMASTER_CONTRACT_REGISTRY_KEY = "turnmaster-live-contracts-v1";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function normalizeContractAddresses(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  for (const item of value) {
    if (typeof item !== "string" || !ADDRESS_PATTERN.test(item)) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(item);
  }
  return normalized;
}

export function loadContractAddresses(storage) {
  if (!storage || typeof storage.getItem !== "function") return [];
  try {
    const raw = storage.getItem(TURNMASTER_CONTRACT_REGISTRY_KEY);
    if (!raw) return [];
    return normalizeContractAddresses(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function rememberContractAddress(address, storage) {
  if (!ADDRESS_PATTERN.test(address) || !storage || typeof storage.setItem !== "function") {
    return loadContractAddresses(storage);
  }
  const current = loadContractAddresses(storage);
  const next = [address, ...current.filter((item) => item.toLowerCase() !== address.toLowerCase())];
  storage.setItem(TURNMASTER_CONTRACT_REGISTRY_KEY, JSON.stringify(next));
  return next;
}
