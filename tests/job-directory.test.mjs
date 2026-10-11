import assert from "node:assert/strict";
import test from "node:test";
import { directoryReadPlan, normalizeDirectoryAddresses } from "../lib/job-directory.mjs";

const A = "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482";
const B = "0x1111111111111111111111111111111111111111";

test("public directory results retain valid unique addresses only", () => {
  assert.deepEqual(normalizeDirectoryAddresses([A, A.toLowerCase(), "bad", B, null]), [A, B]);
  assert.deepEqual(normalizeDirectoryAddresses({ addresses: [A] }), []);
});

test("board fetch is bounded to the latest 100 directory entries", () => {
  assert.deepEqual(directoryReadPlan(0), []);
  assert.deepEqual(directoryReadPlan(4), [{ offset: 0, limit: 4 }]);
  assert.deepEqual(directoryReadPlan(4_000), [{ offset: 0, limit: 100 }]);
  assert.throws(() => directoryReadPlan(-1), /Invalid directory count/);
});
