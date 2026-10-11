import { BRADBURY_CHAIN_ID, BRADBURY_WALLET_NETWORK } from './genlayer-network.mjs';

/**
 * @typedef {{request: (args: {method: string, params?: unknown[]}) => Promise<unknown>, _metamask?: {isUnlocked?: () => Promise<boolean>}}} Eip1193Provider
 */

/**
 * @param {unknown} provider
 * @returns {Eip1193Provider}
 */
function validProvider(provider) {
  if (!provider || typeof provider !== 'object' || !('request' in provider) || typeof provider.request !== 'function') {
    throw new Error('No compatible EIP-1193 wallet provider was detected.');
  }
  return /** @type {Eip1193Provider} */ (provider);
}

/** @param {unknown} provider */
export async function readWalletChainId(provider) {
  const chainId = await validProvider(provider).request({ method: 'eth_chainId' });
  if (typeof chainId !== 'string' || !/^0x[0-9a-f]+$/i.test(chainId)) {
    throw new Error('Wallet returned an invalid network identifier.');
  }
  return Number.parseInt(chainId, 16);
}

/** @param {unknown} error */
function isUnrecognizedChain(error) {
  /** @type {{code?: number, message?: string, data?: {originalError?: {code?: number, message?: string}}}} */
  const issue = error && typeof error === 'object' ? /** @type {any} */ (error) : {};
  const nested = issue.data && typeof issue.data === 'object' ? issue.data : {};
  const original = nested.originalError && typeof nested.originalError === 'object' ? nested.originalError : {};
  const message = [issue.message, original.message].filter((x) => typeof x === 'string').join(' ');
  // Explicit user rejection must take priority over any provider error text.
  if (issue.code === 4001 || original.code === 4001) return false;
  return issue.code === 4902 || original.code === 4902 ||
    /unrecognized chain|unknown chain|chain not added|chain has not been added|no such chain/i.test(message);
}

/** @param {unknown} provider */
export async function ensureBradburyNetwork(provider) {
  const wallet = validProvider(provider);
  if (await readWalletChainId(provider) === BRADBURY_CHAIN_ID) {
    return { alreadyPresent: true };
  }
  let added = false;
  try {
    await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BRADBURY_WALLET_NETWORK.chainId }] });
  } catch (error) {
    if (!isUnrecognizedChain(error)) throw error;
    await wallet.request({ method: 'wallet_addEthereumChain', params: [BRADBURY_WALLET_NETWORK] });
    added = true;
    await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BRADBURY_WALLET_NETWORK.chainId }] });
  }
  if (await readWalletChainId(provider) !== BRADBURY_CHAIN_ID) {
    throw new Error('Wallet did not switch to GenLayer Bradbury chain 4221. No transaction was sent.');
  }
  return { alreadyPresent: !added };
}

/** @param {unknown} provider
 *  @param {string} walletAddress
 */
export async function assertBradburyWallet(provider, walletAddress) {
  const wallet = validProvider(provider);
  if (typeof walletAddress !== 'string' || !/^0x[0-9a-f]{40}$/i.test(walletAddress)) {
    throw new Error('A valid connected wallet address is required.');
  }
  if (await readWalletUnlocked(provider) === false) {
    throw new Error('Wallet is locked. Unlock and reconnect before sending.');
  }
  const [chainId, accounts] = await Promise.all([
    readWalletChainId(provider),
    wallet.request({ method: 'eth_accounts' }),
  ]);
  if (chainId !== BRADBURY_CHAIN_ID) {
    throw new Error('Wallet is not on GenLayer Bradbury chain 4221. No transaction was sent.');
  }
  if (!Array.isArray(accounts) || !accounts.some((account) =>
    typeof account === 'string' && account.toLowerCase() === walletAddress.toLowerCase())) {
    throw new Error('Wallet account changed or access was revoked. Reconnect before sending.');
  }
}

/** Read MetaMask's optional lock API without prompting or requesting Snaps.
 * @param {unknown} provider
 * @returns {Promise<boolean | null>}
 */
export async function readWalletUnlocked(provider) {
  const wallet = validProvider(provider);
  if (typeof wallet._metamask?.isUnlocked !== 'function') return null;
  const unlocked = await wallet._metamask.isUnlocked();
  if (typeof unlocked !== 'boolean') throw new Error('Wallet lock status could not be verified.');
  return unlocked;
}

/** @param {boolean} userConfirmedSession
 *  @param {boolean | null} unlocked
 */
export function mayExposeWalletAccount(userConfirmedSession, unlocked) {
  return userConfirmedSession && unlocked !== false;
}
