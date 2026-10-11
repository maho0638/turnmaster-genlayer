import test from 'node:test';
import assert from 'node:assert/strict';
import { readWalletUnlocked, assertBradburyWallet, mayExposeWalletAccount } from '../lib/bradbury-wallet.mjs';
const address = '0x' + '1'.repeat(40);
test('locked wallet blocks transaction guard even when eth_accounts still exposes address', async () => {
  const calls = [];
  const provider = { _metamask: { isUnlocked: async () => false }, request: async ({method}) => { calls.push(method); return [address]; } };
  await assert.rejects(assertBradburyWallet(provider, address), /locked/);
  assert.deepEqual(calls, []);
});
test('unlock probe uses bound MetaMask method and never calls RPC or Snaps', async () => {
  const meta = { unlocked: true, async isUnlocked() { return this.unlocked; } };
  assert.equal(await readWalletUnlocked({_metamask: meta, request: async () => {throw Error('unexpected RPC');}}), true);
});
test('other EIP1193 wallets retain account and chain guard', async () => {
  const provider = {request: async ({method}) => method === 'eth_chainId' ? '0x107d' : [address]};
  assert.equal(await readWalletUnlocked(provider), null);
  await assertBradburyWallet(provider, address);
});
test('invalid lock status fails closed', async () => {
  await assert.rejects(assertBradburyWallet({_metamask:{isUnlocked:async()=>undefined},request:async()=>[address]},address), /could not be verified/);
});
test('lock probe rejection fails closed', async () => {
  await assert.rejects(assertBradburyWallet({_metamask:{isUnlocked:async()=>{throw Error('offline');}},request:async()=>[address]},address), /offline/);
});
test('account is hidden until this page explicitly confirms a wallet session', () => {
  assert.equal(mayExposeWalletAccount(false, true), false);
  assert.equal(mayExposeWalletAccount(false, null), false);
  assert.equal(mayExposeWalletAccount(true, false), false);
  assert.equal(mayExposeWalletAccount(true, true), true);
  assert.equal(mayExposeWalletAccount(true, null), true);
});
