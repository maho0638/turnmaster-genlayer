import assert from "node:assert/strict";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { PUBLIC_TURNMASTER_CONTRACTS } from "../lib/public-contracts.mjs";

const client = createClient({ chain: testnetBradbury });
for (const address of PUBLIC_TURNMASTER_CONTRACTS) {
  const raw = await client.readContract({ address, functionName: "get_job", args: [] });
  const job = typeof raw === "string" ? JSON.parse(raw) : raw;
  assert.ok(job && typeof job === "object", `No contract state at ${address}`);
  assert.ok(typeof job.title === "string" && job.title.length >= 4, `No real job title at ${address}`);
  assert.ok(typeof job.status === "string", `No status at ${address}`);
  assert.ok(Array.isArray(job.acceptance_criteria) && job.acceptance_criteria.length > 0, `No contract criteria at ${address}`);
  assert.ok(/^[0-9]+$/.test(String(job.reward_wei)), `No on-chain reward at ${address}`);
  console.log(`Verified Bradbury contract ${address}: ${job.status} · ${job.title}`);
}
