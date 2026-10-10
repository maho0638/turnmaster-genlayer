/**
 * User-facing deploy readiness is advisory, never a replacement for the
 * wallet/network/balance checks inside the transaction handler.
 * The Deploy button must remain clickable so reviewers see WHY a
 * deployment is unavailable instead of encountering a dead control.
 */
export function getDeployReadiness({
  walletConnected,
  wrongNetwork,
  balanceError,
  nativeBalance,
  pendingHash,
  releaseFee,
  feeRecipientConfigured,
}) {
  if (pendingHash) {
    return { kind: "pending", message: "A previous deployment is not yet verified. Check its Bradbury Explorer transaction before trying again." };
  }
  if (!walletConnected) {
    return { kind: "wallet", message: "Connect a wallet to deploy on Bradbury. You can still save a browser-only draft without a wallet." };
  }
  if (wrongNetwork) {
    return { kind: "network", message: "Switch your wallet to GenLayer Bradbury Testnet (chain 4221) before deploying." };
  }
  if (balanceError) {
    return { kind: "rpc", message: "TurnMaster cannot confirm your Bradbury native GEN balance. Check the official Bradbury RPC, then refresh the balance." };
  }
  if (nativeBalance === null || nativeBalance === undefined) {
    return { kind: "checking", message: "Checking native Bradbury GEN for deployment fees. You can click Deploy to see what is missing; no transaction is sent until wallet approval." };
  }
  const amount = Number(nativeBalance);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { kind: "funds", message: "This wallet has no verified native Bradbury GEN for network fees. Obtain test GEN from the official faucet, or create a browser-only draft." };
  }
  if (Number(releaseFee) > 0 && !feeRecipientConfigured) {
    return { kind: "fee", message: "No release-fee recipient is configured. Set release fee to 0% to deploy a new job." };
  }
  return { kind: "ready", message: "Bradbury wallet and native GEN confirmed. Enter valid job terms, then click Deploy to review the contract and fee in your wallet." };
}
