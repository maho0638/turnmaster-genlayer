import assert from 'node:assert/strict';
import test from 'node:test';
import {reconcileVerifiedJobs, classifyBoardRead} from '../lib/verified-board.mjs';
const A='0x'+'a'.repeat(40), B='0x'+'b'.repeat(40), C='0x'+'c'.repeat(40);
const job = (address, status='open') => ({contractAddress:address,title:'Real contract data',status});

test('successful read replaces old values with freshly verified contract data', () => {
  assert.deepEqual(reconcileVerifiedJobs([job(A,'open')],[job(A,'funded')],[A]),[job(A,'funded')]);
});
test('failed on-chain read removes a stale row instead of displaying unverified old data', () => {
  assert.deepEqual(reconcileVerifiedJobs([job(A,'funded')],[],[A]),[]);
});
test('partial failure retains only successfully fetched addresses', () => {
  assert.deepEqual(reconcileVerifiedJobs([job(A,'open'),job(B,'claimed')],[job(B,'delivered')],[A,B]),[job(B,'delivered')]);
});
test('concurrently created verified contract survives a prior poll that did not attempt its address', () => {
  assert.deepEqual(reconcileVerifiedJobs([job(A,'open'),job(C,'funded')],[job(A,'funded')],[A,B]),[job(A,'funded'),job(C,'funded')]);
});
test('mixed-case address duplicates do not resurrect stale rows', () => {
  assert.deepEqual(reconcileVerifiedJobs([job(A.toUpperCase(),'old')],[job(A,'new')],[A]),[job(A,'new')]);
});
test('unverified or addressless UI drafts are never retained', () => {
  assert.deepEqual(reconcileVerifiedJobs([{title:'fake browser draft'},job(A)],[],[A]),[]);
});
test('board distinguishes ready, empty-error and partial real-chain responses', () => {
  assert.equal(classifyBoardRead(0,0),'ready');
  assert.equal(classifyBoardRead(2,0),'error');
  assert.equal(classifyBoardRead(2,1),'partial');
  assert.equal(classifyBoardRead(2,2),'ready');
});
