import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectPendingDeployment} from '../lib/pending-deployment.mjs';
const wallet='0x'+'a'.repeat(40), hash='0x'+'b'.repeat(64), address='0x'+'c'.repeat(40);
const contract={client:wallet,title:'Verified on Bradbury'};
function scenario(state='success', tx={txDataDecoded:{contractAddress:address}}, job=contract) {
  const calls=[];
  const io={getState:async()=>{calls.push('state');return state},getTransaction:async()=>{calls.push('tx');return tx},readJob:async()=>{calls.push('job');return job}};
  return {io,calls};
}
test('pending receipt performs no lookup or replay',async()=>{
 const {io,calls}=scenario('pending'); assert.deepEqual(await inspectPendingDeployment(hash,wallet,io),{status:'pending'}); assert.deepEqual(calls,['state']);
});
test('failed finalized receipt cannot be mistaken for a successful deployment',async()=>{
 const {io,calls}=scenario('failed'); assert.deepEqual(await inspectPendingDeployment(hash,wallet,io),{status:'failed'});assert.deepEqual(calls,['state']);
});
test('finalized receipt plus matching on-chain client recovers exactly the real contract',async()=>{
 const {io,calls}=scenario(); assert.deepEqual(await inspectPendingDeployment(hash,wallet,io),{status:'verified',address,job:contract});assert.deepEqual(calls,['state','tx','job']);
});
test('fallback recipient is verified when decoded address absent',async()=>{
 const {io}=scenario('success',{recipient:address});assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'verified');
});
test('unknown address leaves submitted transaction locked',async()=>{
 const {io}=scenario('success',{});assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'unverifiable');
});
test('zero address is never accepted as a deployment',async()=>{
 const {io}=scenario('success',{recipient:'0x'+'0'.repeat(40)});assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'unverifiable');
});
test('another client contract cannot be claimed as recovered',async()=>{
 const {io}=scenario('success',{recipient:address},{client:'0x'+'d'.repeat(40)});assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'unverifiable');
});
test('receipt RPC error retains hash for later verification',async()=>{
 const {io}=scenario();io.getTransaction=async()=>{throw Error('RPC unavailable')};assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'unverifiable');
});
test('contract RPC error retains hash',async()=>{
 const {io}=scenario();io.readJob=async()=>{throw Error('timeout')};assert.equal((await inspectPendingDeployment(hash,wallet,io)).status,'unverifiable');
});
test('malformed hash rejected before touching any RPC',async()=>{
 const {io,calls}=scenario();await assert.rejects(()=>inspectPendingDeployment('0x4',wallet,io),/hash/i);assert.deepEqual(calls,[]);
});
test('wrong or unknown wallet rejected before any RPC',async()=>{
 const {io,calls}=scenario();await assert.rejects(()=>inspectPendingDeployment(hash,'',io),/original deployer wallet/i);assert.deepEqual(calls,[]);
});
