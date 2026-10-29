import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDemoDriveScan,simulateDemoPublish} from '../src/drive-import-demo.js';
import {parseMediaFilename,parseFolderId,classifyImportRow,deterministicCatalogId,buildMoviePayload} from '../src/drive-import.js';

test('example scan contains six fictional files, two safe matches and four review items',()=>{
 const scan=makeDemoDriveScan();
 assert.equal(scan.demo,true);
 assert.equal(scan.files.length,6);
 assert.equal(scan.files.filter(x=>x.qualifies).length,2);
 assert.equal(scan.files.filter(x=>!x.qualifies).length,4);
});
test('fictional test files cannot be confused with a real Drive folder',()=>{
 const scan=makeDemoDriveScan();
 assert.equal(scan.folderId,'DEMO_FICTICIO_SEM_ID_REAL');
 assert.equal(parseFolderId('https://drive.google.com/drive/folders/1Abcde1234567890'),'1Abcde1234567890');
 assert.equal(parseFolderId('http://wrong.test/folders/1Abcde1234567890'),null);
});
test('simulated publish is local-only, deterministic and does not call Supabase',()=>{
 const scan=makeDemoDriveScan();
 const before=JSON.stringify(scan);
 const preview=simulateDemoPublish(scan);
 assert.equal(preview.demo,true);
 assert.equal(preview.published.length,2);
 assert.equal(preview.duplicates.length,1);
 assert.equal(JSON.stringify(scan),before);
 assert.throws(()=>simulateDemoPublish({files:scan.files}),/apenas para dados fictícios/);
});
test('movie episode and uncertain match remain in review',()=>{
 const scan=makeDemoDriveScan();
 assert.ok(scan.files.find(x=>x.name.includes('S01E03')).qualifies===false);
 assert.ok(scan.files.find(x=>x.name.includes('2022')).qualifies===false);
 assert.ok(scan.files.find(x=>x.name.includes('sem.capa')).qualifies===false);
});
test('regular importer demands content rights and stable IDs',()=>{
 const row=makeDemoDriveScan().files[0];
 assert.throws(()=>buildMoviePayload(row,false),/direitos/);
 const id=deterministicCatalogId(row.driveId);
 assert.equal(id,deterministicCatalogId(row.driveId));
 assert.ok(Number.isSafeInteger(id));
});
test('filename parser distinguishes seasons and quality tags',()=>{
 const parsed=parseMediaFilename('Minha.Serie.S02E05.2026.1080p.mp4');
 assert.equal(parsed.year,2026);
 assert.equal(parsed.season,2);
 assert.equal(parsed.episode,5);
 assert.equal(parsed.title,'Minha Serie');
});
test('reclassification preserves confidence and duplicate restriction',()=>{
 const scan=makeDemoDriveScan();
 assert.equal(classifyImportRow(scan.files.find(x=>x.alreadyImported)).qualifies,false);
});
