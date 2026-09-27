import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const results = [];
const check = (name, fn) => {
  try { fn(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); }
};

const html = read('index.html');
const cssFiles = ['lxplus.bundle.css', 'lxplus.v40.css'];
const jsFiles = ['lxplus.album-grouping.js', 'lxplus.bundle.js', 'lxplus.recovery.js', 'lxplus.support.js', 'lxplus.audiofx.js', 'lxplus.v40.js', 'service-worker.js'];
const build = 'V40-COMPLETE-20260925';
const bugfix = 'V40-BUGFIX-20260927';

check('active v40 production files exist', () => {
  for (const file of ['index.html', ...cssFiles, ...jsFiles, 'manifest.webmanifest', 'assets/lx-music-fallback.svg', 'assets/lx-music-v40.svg', 'assets/lxplus-logo-v27.png']) {
    assert.ok(exists(file), `missing ${file}`);
  }
});

check('HTML static ids are unique', () => {
  const counts = new Map();
  for (const match of html.matchAll(/\sid=["']([^"']+)["']/g)) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, []);
  assert.ok(counts.size > 50, `only ${counts.size} ids found`);
});

check('inline scripts compile', () => {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).filter(Boolean);
  assert.ok(scripts.length >= 1, 'no inline scripts found');
  scripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }));
});

check('active JavaScript files compile', () => {
  jsFiles.forEach(file => new vm.Script(read(file), { filename: file }));
});

function assertBalancedCss(source, file) {
  let braces = 0, quote = '', comment = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (comment) { if (ch === '*' && next === '/') { comment = false; i++; } continue; }
    if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = ''; continue; }
    if (ch === '/' && next === '*') { comment = true; i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    assert.ok(braces >= 0, `${file}: unexpected closing brace`);
  }
  assert.equal(quote, '', `${file}: unclosed string`);
  assert.equal(comment, false, `${file}: unclosed comment`);
  assert.equal(braces, 0, `${file}: ${braces} unbalanced braces`);
}
check('active CSS files are structurally balanced', () => cssFiles.forEach(file => assertBalancedCss(read(file), file)));

const localRefs = new Set();
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) localRefs.add(match[1]);
for (const cssFile of cssFiles) {
  for (const match of read(cssFile).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) localRefs.add(match[1]);
}
check('active local asset references exist', () => {
  const missing = [];
  for (const raw of localRefs) {
    if (/^(?:data:|https?:|mailto:|tel:|#|var\()/i.test(raw)) continue;
    const clean = raw.split(/[?#]/)[0].replace(/^\.\//, '');
    if (!clean || clean.includes('${')) continue;
    if (!exists(clean)) missing.push(raw);
  }
  assert.deepEqual(missing, []);
});

check('manifest, shell and service worker use the current builds', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const sw = read('service-worker.js');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#050506');
  assert.equal(manifest.version, build);
  assert.ok(String(manifest.start_url).includes(build));
  assert.ok(sw.includes(bugfix), 'bugfix cache marker missing');
  for (const file of ['lxplus.bundle.js', 'lxplus.album-grouping.js', 'lxplus.recovery.js', 'lxplus.support.js', 'lxplus.audiofx.js', 'lxplus.v40.js', 'lxplus.v40.css']) assert.ok(sw.includes(file), `service worker missing ${file}`);
  assert.match(sw, /fetch\(request, \{ cache: 'no-store' \}\)/);
});

check('v40 stability hotfix contracts are present', () => {
  const hotfix = read('lxplus.album-grouping.js');
  for (const token of [bugfix, '__LX_BUGFIX_BUILD', '__lxProtectedReadGuard', 'LX_AUTH_WAIT', 'lxBugfixDrag']) assert.ok(hotfix.includes(token), `missing ${token}`);
  assert.ok(hotfix.includes("get(){return root.LX?.store}"), 'missing S/store alias');
  assert.ok(hotfix.includes("table==='lx_catalog'||table==='lx_notifications'"), 'missing anonymous RLS guard');
  assert.ok(hotfix.includes("setProperty('left'"), 'floating player left priority fix missing');
  assert.ok(hotfix.includes("setProperty('top'"), 'floating player top priority fix missing');
  assert.ok(hotfix.includes("localStorage.setItem('lx40:player-pos'"), 'floating player persistence fix missing');
});

check('v40 migration keeps conversation data private', () => {
  const migration = read('supabase/migrations/20260925_lxplus_v40.sql');
  for (const token of ['lx_presence', 'lx_rank_seasons', 'lx_rank_scores', 'lx_rank_events', 'lx_saved_messages', 'lx_message_pins', 'lx_polls', 'lx_client_errors', 'lx_viewer_profiles', 'lx_v40_thread_member', 'INVALID_REFERENCE']) assert.ok(migration.includes(token), `missing migration token ${token}`);
  assert.doesNotMatch(migration, /lx_(?:pins_auth_read|polls_read)[\s\S]{0,120}using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table/i);
});

check('no private server credential is embedded in active public files', () => {
  const publicBuild = [html, ...cssFiles.map(read), ...jsFiles.map(read)].join('\n');
  assert.doesNotMatch(publicBuild, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i);
  assert.doesNotMatch(publicBuild, /spotify_client_secret\s*[:=]\s*["'][^"']+/i);
  assert.doesNotMatch(publicBuild, /BEGIN (?:RSA |EC )?PRIVATE KEY[\s\S]{80,}/);
});

const failed = results.filter(result => result.status === 'FAIL');
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
