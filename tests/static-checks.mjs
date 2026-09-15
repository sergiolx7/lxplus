import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(dist, file), 'utf8');
const results = [];
const check = (name, fn) => {
  try { fn(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); }
};

const html = read('index.html');
const cssFiles = ['app.css', 'app-v27.css'];
const jsFiles = ['lxplus.js', 'lxplus-v27.js', 'service-worker.js'];
const expectedLogoHash = '261c79d8db27ba40d9b3020ceb58a0abff25a1ef7825f9dde85708b1a20d050d';

check('HTML static ids are unique', () => {
  const counts = new Map();
  for (const match of html.matchAll(/\sid=["']([^"']+)["']/g)) counts.set(match[1], (counts.get(match[1]) || 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, []);
  assert.ok(counts.size > 100, `only ${counts.size} ids found`);
});

check('inline scripts compile', () => {
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  assert.ok(scripts.length >= 3);
  scripts.forEach((source, index) => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }));
});

check('external JavaScript files compile', () => {
  jsFiles.forEach(file => new vm.Script(read(file), { filename: file }));
});

const localRefs = new Set();
for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) localRefs.add(match[1]);
for (const cssFile of cssFiles) {
  for (const match of read(cssFile).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) localRefs.add(match[1]);
}

check('all local asset references exist', () => {
  const missing = [];
  for (const raw of localRefs) {
    if (/^(?:data:|https?:|mailto:|tel:|#|var\()/i.test(raw)) continue;
    const clean = raw.split(/[?#]/)[0].replace(/^\.\//, '');
    if (!clean || clean.includes('${')) continue;
    if (!fs.existsSync(path.join(dist, clean))) missing.push(raw);
  }
  assert.deepEqual(missing, []);
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

check('CSS files are structurally balanced', () => cssFiles.forEach(file => assertBalancedCss(read(file), file)));

check('manifest and v27 cache agree', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#050506');
  assert.deepEqual(manifest.icons.map(icon => icon.src), ['assets/icon-v27.svg']);
  const sw = read('service-worker.js');
  assert.match(sw, /lxplus-shell-v2701/);
  for (const file of ['app-v27.css', 'lxplus-v27.js', 'assets/lxplus-logo-v27.png', 'assets/icon-v27.svg']) assert.ok(sw.includes(file));
});

check('new logo remains byte-identical', () => {
  for (const file of ['assets/lxplus-logo-v27.png', 'lxplus-logo-v27.png']) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, file))).digest('hex');
    assert.equal(hash, expectedLogoHash, file);
  }
  const favicon = html.match(/<link rel="icon"[^>]+href="data:image\/png;base64,([^"]+)"/i)?.[1];
  assert.ok(favicon, 'embedded favicon missing');
  const faviconHash = crypto.createHash('sha256').update(Buffer.from(favicon, 'base64')).digest('hex');
  assert.equal(faviconHash, expectedLogoHash);
});

check('old brand assets are no longer active', () => {
  const active = [html, read('manifest.webmanifest'), read('service-worker.js'), read('app-v27.css')].join('\n');
  assert.doesNotMatch(active, /lxplus-(?:brand-v26|logo-approved|wordmark)|app-icon-(?:192|512)/i);
});

check('v27 feature contracts are present', () => {
  const core = read('lxplus.js');
  const v27 = read('lxplus-v27.js');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202609140003_lxplus_v27_rbac_hardening.sql'), 'utf8');
  assert.match(v27, /lx-spotify-catalog/);
  assert.match(v27, /shaka-player@5\.2\.10/);
  assert.match(v27, /lx_get_conversation_streak/);
  assert.match(v27, /PWA_COOLDOWN=14\*86400000/);
  assert.match(core, /v\.onended=\(\)=>[\s\S]*?let left=5/);
  assert.match(migration, /lx_admin_can\('catalog'\)/);
  assert.match(migration, /lx_admin_can\('approvals'\)/);
});

check('no private server credential is embedded in public files', () => {
  const publicBuild = [html, ...cssFiles.map(read), ...jsFiles.map(read)].join('\n');
  assert.doesNotMatch(publicBuild, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i);
  assert.doesNotMatch(publicBuild, /spotify_client_secret\s*[:=]\s*["'][^"']+/i);
});

const failed = results.filter(result => result.status === 'FAIL');
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
if (failed.length) process.exitCode = 1;
