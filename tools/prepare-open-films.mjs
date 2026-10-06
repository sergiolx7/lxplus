#!/usr/bin/env node
/** Prepare a reviewable, guarded batch from a real database snapshot; no credentials. */
import fs from 'node:fs';
import {prepareOpenFilms,openFilmSql} from './open-film-catalog.mjs';
const [feedPath,snapshotPath,originalsPath,outputPrefix]=process.argv.slice(2);
if(!outputPrefix)throw new Error('Usage: node tools/prepare-open-films.mjs verified.json snapshot.json original-ids.json output-prefix');
const feed=JSON.parse(fs.readFileSync(feedPath)),snapshot=JSON.parse(fs.readFileSync(snapshotPath)),originals=JSON.parse(fs.readFileSync(originalsPath));
if(feed.complete!==true)throw new Error('INCOMPLETE_FEED');
const plan=prepareOpenFilms(feed.items,snapshot,Array.isArray(originals)?originals:originals.ids);
fs.writeFileSync(outputPrefix+'.json',JSON.stringify(plan,null,2),{mode:0o600});
if(plan.inserts.length+plan.updates.length)fs.writeFileSync(outputPrefix+'.sql',openFilmSql(plan,snapshot),{mode:0o600});
console.log(JSON.stringify({inserts:plan.inserts.length,updates:plan.updates.length,skipped:plan.skipped,requiresFreshSnapshotBeforeNextBatch:true}));
