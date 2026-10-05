import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("browser-deployed contract source stays byte-identical to the tested source", async () => {
  const [source, publicCopy] = await Promise.all([
    readFile(new URL("../contracts/TurnMasterEscrow.py", import.meta.url)),
    readFile(new URL("../public/TurnMasterEscrow.py", import.meta.url)),
  ]);
  assert.deepEqual(publicCopy, source);
});
