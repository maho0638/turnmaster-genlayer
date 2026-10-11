// TypeScript compile-time regression for importing the JS board reconciliation helpers.
import {reconcileVerifiedJobs, classifyBoardRead} from '../lib/verified-board.mjs';
type Job = {contractAddress?: string; title: string};
const latest: Job[] = [{contractAddress:'0x123',title:'on chain'}];
const merged: Job[] = reconcileVerifiedJobs<Job>([],latest,['0x123']);
const boardState: 'loading' | 'ready' | 'partial' | 'error' = classifyBoardRead(2,merged.length);
void boardState;
