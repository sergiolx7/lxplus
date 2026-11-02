import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isGifSignature} from '../src/social-media-validation.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('animated GIF upload validates actual GIF87a and GIF89a headers',()=>{
 const gif87=new Uint8Array([71,73,70,56,55,97,0,0]);
 const gif89=new Uint8Array([71,73,70,56,57,97,0,0]);
 assert.equal(isGifSignature(gif87),true);
 assert.equal(isGifSignature(gif89.buffer),true);
 for(const value of [new Uint8Array([]),new Uint8Array([71,73,70,56,56,97]),new Uint8Array([137,80,78,71,13,10]),new Uint8Array([71,73,70])])assert.equal(isGifSignature(value),false);
});

test('post and direct message media accept only signed GIFs and bucket stays private',()=>{
 const social=source('src/modules/social.js'),services=source('src/services.js');
 const sql=source('supabase/migrations/20261102040858_lx_social_gif_bucket_premium4.sql');
 assert.match(services,/image\\\/\\(jpeg\|png\|webp\|gif\)/);
 assert.match(services,/isGifSignature\(new Uint8Array\(await file\.slice\(0,6\)\.arrayBuffer\(\)\)\)/);
 assert.match(services,/'image\/gif':'gif'/);
 assert.equal((social.match(/image\/gif/g)||[]).length,2,'post and private chat file selectors include GIF');
 assert.match(social,/post\.media_type==='video'/);
 assert.match(sql,/id='lx-social'/);
 assert.match(sql,/array_append\(allowed_mime_types,'image\/gif'\)/);
 assert.doesNotMatch(sql,/public\s*=\s*true|delete\s+from|drop\s+table|grant\s+all/i);
});
