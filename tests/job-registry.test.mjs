import assert from "node:assert/strict";
import test from "node:test";
import {
  TURNMASTER_CONTRACT_REGISTRY_KEY,
  loadContractAddresses,
  normalizeContractAddresses,
  rememberContractAddress,
} from "../lib/job-registry.mjs";

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, value); },
  };
}

const A = "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482";
const B = "0x1111111111111111111111111111111111111111";

test("registry normalizes valid addresses and removes case-insensitive duplicates", () => {
  assert.deepEqual(normalizeContractAddresses([A, A.toLowerCase(), "bad", B]), [A, B]);
});

test("registry tolerates missing and corrupt browser storage", () => {
  assert.deepEqual(loadContractAddresses(undefined), []);
  const fake = storage({ [TURNMASTER_CONTRACT_REGISTRY_KEY]: "{broken" });
  assert.deepEqual(loadContractAddresses(fake), []);
});

test("remembered contracts persist newest-first without duplicates", () => {
  const fake = storage();
  rememberContractAddress(A, fake);
  rememberContractAddress(B, fake);
  rememberContractAddress(A.toLowerCase(), fake);
  assert.deepEqual(loadContractAddresses(fake), [A.toLowerCase(), B]);
});
