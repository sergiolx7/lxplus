import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const root=readdirSync(new URL('../',import.meta.url));
test('fresh codebase has no legacy JS bundles or service worker',()=>{
 assert.ok(!root.some(x=>x.startsWith('lxplus.bundle')));
 assert.ok(!root.includes('sw.js'));
});
test('entrypoint loads only the new app module and CSS',()=>{
 const html=read('index.html');
 assert.match(html,/import\(['"]\.\/src\/app\.js\?v=[^'"]+['"]\)/);
 assert.match(html,/href="\.\/assets\/styles\.css\?v=/);
 assert.doesNotMatch(html,/lxplus\.bundle|lxplus\.future-ui/);
});
test('required new modules exist and import local files',()=>{
 for(const p of ['src/app.js','src/data.js','src/config.js','assets/styles.css','manifest.webmanifest'])assert.ok(read(p).length>20);
 assert.match(read('src/app.js'),/from '\.\/data\.js'/);
 assert.match(read('src/data.js'),/from '\.\/config\.js'/);
});
test('auth persists session and catalog reads only published items',()=>{
 const src=read('src/data.js');
 assert.match(src,/persistSession:true/);
 assert.match(src,/eq\('published',true\)/);
 assert.match(src,/getUserState/);
 assert.match(src,/saveUserField/);
});
test('frontend has no private key and no schema delete operations',()=>{
 const src=read('src/app.js')+read('src/data.js')+read('src/config.js');
 assert.doesNotMatch(src,/SUPABASE_SERVICE_ROLE_KEY|serviceRole\\s*[:=]|sb_secret_/i);
 assert.doesNotMatch(src,/\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/i);
});
test('release checklist and email templates included',()=>{
 assert.match(read('RELEASE-CHECKLIST.md'),/backup/i);
 assert.match(read('email/lxgroup/auth-confirmation.html'),/ConfirmationURL/);
 assert.match(read('email/lxgroup/auth-recovery.html'),/ConfirmationURL/);
});

test('ranking uses read-only database data, and homepage references saved history',()=>{
 const app=read('src/app.js'),data=read('src/data.js');
 assert.match(data,/getRanking/);
 assert.match(data,/lx_rank_scores/);
 assert.match(app,/Continue de onde parou/);
 assert.match(app,/A\.ranking/);
});

test('startup has visible error recovery and a backup CDN',()=>{
 const html=read('index.html'),data=read('src/data.js');
 assert.match(html,/__lxBootFailure/);
 assert.match(html,/lxBootRetry/);
 assert.match(html,/serviceWorker\.getRegistrations/);
 assert.match(data,/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/);
 assert.match(data,/esm\.sh\/@supabase\/supabase-js/);
});

test('session/profile startup is time-bounded; catalog loads after dashboard',()=>{
 const app=read('src/app.js');
 assert.match(app,/timed\(db\.auth\.getSession\(\)/);
 assert.match(app,/timed\(\s*Promise\.all\(\[getProfile/);
 assert.match(app,/draw\(\); \/\/ The member dashboard opens immediately/);
 assert.match(app,/loadCatalogInBackground\(generation\)/);
 assert.match(app,/A\.catalogStatus==='error'/);
});
test('stalled legacy auth can switch to an isolated persistent session without deleting accounts',()=>{
 const app=read('src/app.js'),data=read('src/data.js');
 assert.match(app,/id==='manualLogin'/);
 assert.match(app,/switchToRecoveryLogin\(\)/);
 assert.match(data,/storageKey:RECOVERY_KEY/);
 assert.match(data,/lxplus_next_login_recovery_v1/);
});
