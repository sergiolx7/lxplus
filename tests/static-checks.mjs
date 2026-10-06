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
const local = value => value.split(/[?#]/)[0].replace(/^\.\//, '');
const cssFiles = [...new Set([...html.matchAll(/<link[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)].map(x=>local(x[1])).filter(x=>!/^https?:/.test(x)))];
const jsFiles = [...new Set([...html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(x=>local(x[1])).filter(x=>!/^https?:/.test(x)).concat('service-worker.js'))];

check('active UI36 and universal files exist', () => {
  for (const file of ['index.html', ...cssFiles, ...jsFiles, 'manifest.webmanifest', 'supabase/functions/_shared/universal-core.mjs']) assert.ok(exists(file), `missing ${file}`);
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

check('manifest, canonical shell and service worker agree', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const sw = read('service-worker.js');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#050506');
  const shell=html.match(/LX_CANONICAL_SHELL=['"]([^'"]+)/)?.[1];
  const build=sw.match(/const LX_BUILD=['"]([^'"]+)/)?.[1];
  assert.equal(manifest.version,shell);assert.equal(build,shell);
  for (const file of ['lxplus.bundle.js','lxplus.insights-v36.js','lxplus.universal-catalog.js','lxplus.universal-catalog.css','universal-core.mjs']) assert.ok(sw.includes(file),`service worker missing ${file}`);
  assert.match(sw,/fetch\(request,\s*\{cache:'no-store'\}\)/);
});

check('universal migration is additive and source grants remain private', () => {
  const migration=read('supabase/migrations/20261005233838_lx_universal_catalog.sql');
  assert.doesNotMatch(migration,/drop\s+table|truncate\s+table|delete\s+from\s+public\.lx_catalog|update\s+public\.lx_catalog/i);
  assert.match(migration,/revoke all on function %s from public,anon,authenticated/);
  assert.match(migration,/security invoker/);assert.doesNotMatch(migration,/security definer/i);
  assert.doesNotMatch(migration,/grant[^;]*on(?: table)? public\.lx_media_sources to authenticated/i);
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
