// Public addresses are discovery pointers ONLY. All displayed job fields, statuses,
// rewards and evidence must be fetched from get_job() on GenLayer Bradbury.
// Do not add demo, local drafts, or invented contract records to this registry.
export const PUBLIC_TURNMASTER_CONTRACTS = Object.freeze([
  "0x30D7B14756ED2b062f7f39F8240F0FC0C3533950", // Upgraded dispute/retry escrow
  "0xAA85A41F899ED569d32B4CF0FDA2C55461d94482", // Finalized legacy escrow
]);
