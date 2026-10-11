/**
 * Read-only recovery of a transaction that may already have deployed an escrow.
 * This helper NEVER sends, signs or retries a transaction. The RPC supplies
 * every property, and the contract's client address must match the wallet.
 *
 * @template {{client:string}} T
 * @param {string} hash
 * @param {string} expectedClient
 * @param {{getState: (hash:string)=> Promise<'success'|'failed'|'pending'>,
 * getTransaction: (hash:string)=>Promise<unknown>, readJob:(address:string)=>Promise<T>}} io
 * @returns {Promise<{status:'pending'|'failed'|'verified'|'unverifiable', address?:string, job?:T, reason?:string}>}
 */
export async function inspectPendingDeployment(hash, expectedClient, io) {
  if (!/^0x[a-f\d]{64}$/i.test(hash)) throw new Error('Invalid pending transaction hash.');
  if (typeof expectedClient !== 'string' || !/^0x[a-f\d]{40}$/i.test(expectedClient)) {
    throw new Error('Connect the original deployer wallet to recover a deployment.');
  }
  const state = await io.getState(hash);
  if (state === 'pending') return {status: 'pending'};
  if (state === 'failed') return {status: 'failed'};
  if (state !== 'success') throw new Error('Unrecognized transaction status.');

  // Once finalized, a transient RPC failure must NEVER erase the pending hash.
  let tx;
  try {
    tx = await io.getTransaction(hash);
  } catch {
    return {status: 'unverifiable', reason: 'Finalized, but the deployment receipt could not be read. Do not deploy again.'};
  }
  const decoded = tx && typeof tx === 'object' && 'txDataDecoded' in tx ? tx.txDataDecoded : undefined;
  const record = tx && typeof tx === 'object' ? /** @type {Record<string, unknown>} */ (tx) : {};
  const address = decoded && typeof decoded === 'object' && 'contractAddress' in decoded
    ? decoded.contractAddress : record.recipient ?? record.to_address;
  if (typeof address !== 'string' || !/^0x[a-f\d]{40}$/i.test(address) || /^0x0{40}$/i.test(address)) {
    return {status: 'unverifiable', reason: 'Transaction finalized, but no valid deployed contract address was returned. Do not retry it.'};
  }
  try {
    const job = await io.readJob(address);
    if (!job || typeof job.client !== 'string' || job.client.toLowerCase() !== expectedClient.toLowerCase()) {
      return {status: 'unverifiable', reason: 'The returned contract does not belong to the connected wallet. Deployment was not assumed valid.'};
    }
    return {status: 'verified', address, job};
  } catch {
    return {status: 'unverifiable', reason: 'Deployment finalized, but the deployed contract state cannot be verified yet. Try recovery later.'};
  }
}
