import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupPlan,verifyDriveCopy,migrationInventory,DRIVE_OWNER} from '../ops/drive-storage-migration.mjs';

const source={id:'source-1',bucket_id:'lx-media',name:'media/archived.mp3',version:'v1',etag:'tag-1',bytes:4,referenced_by_published:false};
const file={id:'drive-copy-1',shared:false,permissions:[{type:'user',role:'owner',emailAddress:DRIVE_OWNER}]};
const bytes=Buffer.from('data');
const receipt=()=>verifyDriveCopy({source,original:bytes,readback:Buffer.from(bytes),file});

test('migration requires actual same-size and matching downloaded bytes',()=>{
 assert.throws(()=>verifyDriveCopy({source,original:bytes,readback:Buffer.from('xxxx'),file}),/COPY_HASH_MISMATCH/);
 assert.throws(()=>verifyDriveCopy({source,original:bytes,readback:Buffer.from('x'),file}),/COPY_SIZE_MISMATCH/);
 assert.equal(receipt().source_sha256,receipt().drive_sha256);
});
test('private media cannot be replaced by a public Drive file or another account',()=>{
 assert.throws(()=>verifyDriveCopy({source,original:bytes,readback:bytes,file:{...file,shared:true}}),/PRIVATE_DRIVE_COPY_REQUIRED/);
 assert.throws(()=>verifyDriveCopy({source,original:bytes,readback:bytes,file:{...file,permissions:[{type:'user',role:'owner',emailAddress:'other@example.invalid'}]}}),/DRIVE_OWNER_MISMATCH/);
});
test('a successful upload alone never authorizes cleanup',()=>{
 const plan=cleanupPlan({inventory:[source],current:[source]});assert.equal(plan.status,'waiting_for_verified_copies');assert.equal(plan.ready.length,0);assert.equal(plan.pending[0].reason,'BACKUP_NOT_VERIFIED');
});
test('changed or newly published originals remain protected after backup',()=>{
 for(const patch of [{version:'v2'},{etag:'changed'},{bytes:5},{name:'media/other.mp3'},{referenced_by_published:true}]){
  const plan=cleanupPlan({inventory:[source],current:[{...source,...patch}],receipts:[receipt()]});assert.equal(plan.ready.length,0);assert.equal(plan.pending.length,1);
 }
});
test('verified copies produce a bounded review plan; published content is excluded',()=>{
 const active={...source,id:'active',name:'media/active.mp3',referenced_by_published:true};
 const plan=cleanupPlan({inventory:[source,active],current:[source,active],receipts:[receipt()]});
 assert.equal(plan.status,'ready_for_review');assert.equal(plan.candidateObjects,1);assert.equal(plan.ready.length,1);assert.equal(plan.ready[0].drive_id,file.id);assert.equal(plan.totalBytes,8);
});
test('inventory and proof cannot confuse objects or accept duplicate identities',()=>{
 assert.throws(()=>migrationInventory([source,{...source,id:'other'}]),/DUPLICATE_OBJECT/);
 assert.throws(()=>migrationInventory([{...source,name:'media/../../private'}]),/INVALID_OBJECT/);
 assert.throws(()=>cleanupPlan({inventory:[source],current:[source],receipts:[receipt(),receipt()]}),/DUPLICATE_RECEIPT/);
});
test('profile images and conversation attachments never become cleanup candidates from a catalogue-only check',()=>{
 const personal=[{...source,id:'avatar',bucket_id:'lx-assets',name:'profiles/user/avatar.jpg'},{...source,id:'chat',bucket_id:'lx-social',name:'user/message.jpg'},{...source,id:'art',bucket_id:'lx-assets',name:'assets/cover.jpg'}];
 const plan=cleanupPlan({inventory:personal,current:personal});assert.equal(plan.candidateObjects,0);assert.equal(plan.ready.length,0);
});
