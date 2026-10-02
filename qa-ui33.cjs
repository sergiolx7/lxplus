const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {analyzeCatalog,toCsv}=require('./lxplus.admin-health-v33.js');

const items=[
  {id:1,type:'Filme',title:'Pronto',year:2026,genre:'Aventura',desc:'Filme pronto',cover:'https://example.invalid/poster.jpg',mediaKey:'drive:film',published:true},
  {id:2,type:'Filme',title:'Sem vídeo',year:2026,desc:'Pendente',cover:'https://example.invalid/poster.jpg',published:true},
  {id:3,type:'Música',title:'Repetida',artist:'Artista',desc:'Áudio',cover:'https://example.invalid/art.jpg',mediaKey:'cloud:music/a.mp3',published:false},
  {id:4,type:'Música',title:'Repetida',artist:'Artista',desc:'Áudio',cover:'https://example.invalid/art.jpg',mediaKey:'cloud:music/b.mp3',published:false},
  {id:5,type:'Música',title:'=DANGEROUS()',artist:'Externo',desc:'Teste',cover:'https://example.invalid/art.jpg',mediaKey:'spotify:track:1234567890123456789012',published:true}
];
const report=analyzeCatalog(items);
assert.equal(report.total,5);
assert.equal(report.published,3);
assert.equal(report.drafts,2);
assert(!report.findings.some(x=>x.id===1),'A finished title should not be flagged');
assert(report.findings.some(x=>x.id===2&&x.category==='media'&&x.severity==='critical'));
assert.equal(report.findings.filter(x=>x.category==='duplicate').length,2);
assert(report.findings.some(x=>x.id===5&&x.category==='external'));
assert(toCsv(report).includes("'=DANGEROUS()"),'CSV values must not execute as spreadsheet formulas');

const root=__dirname,html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"#?]+)[^"#]*"/gi)].map(m=>m[1]).filter(ref=>!/^https?:|^data:|^\//i.test(ref)&&!ref.startsWith('#'));
for(const ref of refs)assert(fs.existsSync(path.join(root,ref)),`Missing HTML asset: ${ref}`);
const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const modalSafety=fs.readFileSync(path.join(root,'lxplus.modal-safety-v13.js'),'utf8');
const support=fs.readFileSync(path.join(root,'lxplus.support.js'),'utf8');
assert(!/if\(existing\)\s*document\.head\.appendChild\(existing\)/.test(modalSafety),'Modal style must not be reordered on every sync');
assert(html.includes('lxplus.maintenance-v34.css')&&html.includes('assets/lxplus-wordmark-v34.svg'),'Current visual assets must load');
assert(!support.includes('meta.content=')&&!support.includes("version:'26.0'"),'Retired updater must not overwrite the current build');
assert(support.includes('lxplus.support-core.js'),'Human support must still load');
const core=worker.match(/const CORE=\[([\s\S]*?)\];/)?.[1];
assert(core,'Service Worker precache list was not found');
for(const [,ref] of core.matchAll(/'\.\/([^']+)'/g))assert(fs.existsSync(path.join(root,ref)),`Missing precache asset: ${ref}`);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
assert.equal(manifest.version,'UI35');
assert(html.includes(manifest.build)&&worker.includes(manifest.build),'HTML, worker and release must share a build');
process.stdout.write(`UI34 QA: PASS (${report.findings.length} sample findings; ${refs.length} HTML assets checked)\n`);
