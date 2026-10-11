import assert from 'node:assert/strict';
import test from 'node:test';
import { ensureBradburyNetwork, assertBradburyWallet, readWalletChainId } from '../lib/bradbury-wallet.mjs';

const address = '0x1111111111111111111111111111111111111111';
const another = '0x2222222222222222222222222222222222222222';
function makeWallet({ chain = '0x107d', accounts = [address], unknown = false, rejecting = false } = {}) {
  const methods = [];
  const provider = { async request({ method, params }) {
    methods.push(method);
    if (method === 'eth_chainId') return chain;
    if (method === 'eth_accounts') return accounts;
    if (method === 'wallet_switchEthereumChain') {
      if (rejecting) throw Object.assign(new Error('User rejected'), { code: 4001 });
      if (unknown) { unknown = false; throw Object.assign(new Error('Unrecognized chain'), { code: 4902 }); }
      chain = params[0].chainId;
      return null;
    }
    if (method === 'wallet_addEthereumChain') { assert.equal(params[0].chainId, '0x107d'); return null; }
    // Enforce no Snap RPC method regardless of any other behavior.
    throw Object.assign(new Error(`Unsupported method: ${method}`), { code: -32601 });
  } };
  return { provider, methods };
}

test('already on Bradbury: no network mutation and no Snap lookup', async () => {
  const { provider, methods } = makeWallet();
  assert.deepEqual(await ensureBradburyNetwork(provider), { alreadyPresent: true });
  await assertBradburyWallet(provider, address);
  assert.deepEqual(methods, ['eth_chainId', 'eth_chainId', 'eth_accounts']);
});

test('switches to Bradbury when registered, without adding or checking Snaps', async () => {
  const { provider, methods } = makeWallet({ chain: '0x1' });
  assert.deepEqual(await ensureBradburyNetwork(provider), { alreadyPresent: true });
  await assertBradburyWallet(provider, address);
  assert.deepEqual(methods, ['eth_chainId', 'wallet_switchEthereumChain', 'eth_chainId', 'eth_chainId', 'eth_accounts']);
});

test('adds unrecognized Bradbury chain then verifies network and account', async () => {
  const { provider, methods } = makeWallet({ chain: '0x1', unknown: true });
  assert.deepEqual(await ensureBradburyNetwork(provider), { alreadyPresent: false });
  await assertBradburyWallet(provider, address);
  assert.deepEqual(methods, ['eth_chainId', 'wallet_switchEthereumChain', 'wallet_addEthereumChain', 'wallet_switchEthereumChain', 'eth_chainId', 'eth_chainId', 'eth_accounts']);
});

test('never attempts network addition after the user rejects switching', async () => {
  const { provider, methods } = makeWallet({ chain: '0x1', rejecting: true });
  await assert.rejects(ensureBradburyNetwork(provider), /User rejected/);
  assert.deepEqual(methods, ['eth_chainId', 'wallet_switchEthereumChain']);
});

test('rejects changed account, wrong chain and invalid address before signing', async () => {
  await assert.rejects(assertBradburyWallet(makeWallet({ accounts: [another] }).provider, address), /account changed/i);
  await assert.rejects(assertBradburyWallet(makeWallet({ chain: '0x1' }).provider, address), /not on GenLayer Bradbury/i);
  await assert.rejects(assertBradburyWallet(makeWallet().provider, 'invalid'), /valid connected wallet/i);
});

test('rejects malformed network identifiers and unavailable providers', async () => {
  await assert.rejects(readWalletChainId(makeWallet({ chain: 'bad' }).provider), /invalid network identifier/i);
  await assert.rejects(ensureBradburyNetwork(null), /provider/i);
});

test('if the provider reports the wrong chain after switch, signing prerequisites still fail', async () => {
  const events = [];
  const provider = { async request({ method }) {
    events.push(method);
    if (method === 'eth_chainId') return '0x1';
    if (method === 'wallet_switchEthereumChain') return null;
    throw new Error('Unexpected wallet call');
  } };
  await assert.rejects(ensureBradburyNetwork(provider), /did not switch/i);
  assert.deepEqual(events, ['eth_chainId','wallet_switchEthereumChain','eth_chainId']);
});

test('supports nested EIP-1193 4902 errors for an unknown network', async () => {
  let chain = '0x1', attempts = 0;
  const methods=[];
  const provider={ async request({ method, params }) {
    methods.push(method);
    if(method==='eth_chainId') return chain;
    if(method==='wallet_switchEthereumChain') {
      attempts++;
      if(attempts===1) throw Object.assign(new Error('not known'), { code:-32603, data:{originalError:{code:4902,message:'Unknown chain'}} });
      chain=params[0].chainId;
      return null;
    }
    if(method==='wallet_addEthereumChain') return null;
    throw new Error('Unexpected method');
  }};
  assert.deepEqual(await ensureBradburyNetwork(provider),{alreadyPresent:false});
  assert.equal(chain,'0x107d');
  assert.ok(methods.includes('wallet_addEthereumChain'));
  assert.ok(!methods.some(x=>x.toLowerCase().includes('snaps')));
});

test('rejects disconnected accounts, malformed account data and declined access', async () => {
  await assert.rejects(assertBradburyWallet(makeWallet({accounts: []}).provider, address), /access was revoked/i);
  await assert.rejects(assertBradburyWallet(makeWallet({accounts: null}).provider, address), /access was revoked/i);
  const provider={async request({method}) {
    if(method==='eth_chainId') return '0x107d';
    if(method==='eth_accounts') throw Object.assign(new Error('Unauthorized'),{code:4100});
    throw new Error('Unexpected call');
  }};
  await assert.rejects(assertBradburyWallet(provider,address),/Unauthorized/);
});

test('does not add or switch network when already on Bradbury with a case-insensitive hex id', async () => {
  const { provider, methods } = makeWallet({chain:'0X107D'});
  assert.deepEqual(await ensureBradburyNetwork(provider),{alreadyPresent:true});
  assert.deepEqual(methods,['eth_chainId']);
  const canonical=makeWallet({chain:'0x107D'});
  assert.deepEqual(await ensureBradburyNetwork(canonical.provider),{alreadyPresent:true});
  assert.deepEqual(canonical.methods,['eth_chainId']);
});

test('does not send a transaction or snap request when account verification fails', async () => {
  const {provider,methods}=makeWallet({chain:'0x1',accounts:[another]});
  await assert.rejects(assertBradburyWallet(provider,address),/not on GenLayer Bradbury/i);
  assert.deepEqual(methods,['eth_chainId','eth_accounts']);
  assert.equal(methods.includes('eth_sendTransaction'),false);
  assert.equal(methods.some(m=>m.toLowerCase().includes('snap')),false);
});

test('user rejection with misleading unknown-chain text never triggers a chain-add popup',async()=>{
 let chain='0x1';const methods=[];
 const provider={async request({method}){
   methods.push(method);if(method==='eth_chainId')return chain;
   if(method==='wallet_switchEthereumChain')throw Object.assign(new Error('User rejected request: Unknown chain'),{code:4001});
   throw new Error('Unexpected attempt to add network');
 }};
 await assert.rejects(ensureBradburyNetwork(provider),/User rejected request/);
 assert.deepEqual(methods,['eth_chainId','wallet_switchEthereumChain']);
});
