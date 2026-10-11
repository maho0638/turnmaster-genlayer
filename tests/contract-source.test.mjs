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

test("browser-deployed directory source stays byte-identical to the tested source", async () => {
  const [source, publicCopy] = await Promise.all([
    readFile(new URL("../contracts/TurnMasterDirectory.py", import.meta.url)),
    readFile(new URL("../public/TurnMasterDirectory.py", import.meta.url)),
  ]);
  assert.deepEqual(publicCopy, source);
});

test("contract sync script publishes both contract sources", async () => {
  const { readFile } = await import("node:fs/promises");
  const [escrow, publicEscrow, directory, publicDirectory] = await Promise.all([
    readFile(new URL("../contracts/TurnMasterEscrow.py", import.meta.url)),
    readFile(new URL("../public/TurnMasterEscrow.py", import.meta.url)),
    readFile(new URL("../contracts/TurnMasterDirectory.py", import.meta.url)),
    readFile(new URL("../public/TurnMasterDirectory.py", import.meta.url)),
  ]);
  assert.deepEqual(publicEscrow, escrow);
  assert.deepEqual(publicDirectory, directory);
});
