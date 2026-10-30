import {test} from 'node:test';
import assert from 'node:assert/strict';
import {audioIdentity,verifiedAudioIds,runAudioBatch} from '../src/audio-audit.js';
const songs=Array.from({length:8},(_,i)=>({id:i+1,type:'Música',mediaKey:'cloud:media/'+i+'.mp3'}));
test('a verification cannot authorize a different or replaced source',()=>{const item=songs[0],checks=new Map([['1',{status:'verified',identity:audioIdentity(item)}]]);assert.deepEqual(verifiedAudioIds([item],checks),['1']);assert.deepEqual(verifiedAudioIds([{...item,mediaKey:'cloud:media/replaced.mp3'}],checks),[])});
test('batch checks each audio once with bounded concurrency and records failures without publishing',async()=>{let active=0,max=0;const seen=[];const results=await runAudioBatch([...songs,{id:99,type:'Filme'}],async item=>{active++;max=Math.max(max,active);seen.push(item.id);await new Promise(r=>setTimeout(r,1));active--;if(item.id===3)throw Error('bad');return{status:'verified'}},{concurrency:20});assert.ok(max<=3);assert.equal(new Set(seen).size,8);assert.equal(results.size,8);assert.equal(results.get('3').status,'error');assert.ok([...results.values()].every(r=>r.identity&&r.checkedAt))});
test('stopped batches do not start more work',async()=>{const checks=await runAudioBatch(songs,async()=>({status:'verified'}),{shouldStop:()=>true});assert.equal(checks.size,0)});
