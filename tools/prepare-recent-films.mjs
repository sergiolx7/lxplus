import fs from 'node:fs';
import {prepareRecentFilms,recentFilmSql} from './recent-film-catalog.mjs';
const [snapshotPath,outputPath]=process.argv.slice(2);
if(!snapshotPath||!outputPath)throw new Error('Usage: node tools/prepare-recent-films.mjs SNAPSHOT.json OUTPUT.sql');
const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
const items=JSON.parse(fs.readFileSync(new URL('../catalog/recent-films.json',import.meta.url),'utf8')).items;
const plan=prepareRecentFilms(items,snapshot);
fs.writeFileSync(outputPath,recentFilmSql(plan,snapshot));
console.log(JSON.stringify({expectedCount:snapshot.count,expectedHash:snapshot.hash,inserts:plan.inserts.length,skipped:plan.skipped,afterCount:snapshot.count+plan.inserts.length},null,2));
