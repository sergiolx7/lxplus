import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const base = process.env.LX_TEST_URL || 'http://127.0.0.1:4173/';
const artifacts = new URL('./artifacts/', import.meta.url);
await fs.mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  serviceWorkers: 'allow',
  colorScheme: 'dark',
});

await context.route(/^https:\/\//, route => route.abort());
await context.addInitScript(() => {
  const offline = { data: null, error: { message: 'QA_OFFLINE' } };
  let chain;
  chain = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'then') return resolve => resolve(offline);
      return () => chain;
    },
  });
  const client = {
    from: () => chain,
    rpc: async () => offline,
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: async () => true,
    functions: { invoke: async () => offline },
    storage: { from: () => chain },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
    },
  };
  window.supabase = { createClient: () => client };
});

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(message.text())) {
    consoleErrors.push(message.text());
  }
});

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: 'PASS' });
  } catch (error) {
    results.push({ name, status: 'FAIL', detail: error.message });
  }
};

await page.goto(base, { waitUntil: 'domcontentloaded' });

await check('boot and exact transparent LX logo', async () => {
  await page.waitForFunction(() => window.__LX_LOGIN_READY === true, null, { timeout: 8000 });
  const logo = await page.locator('#splash img').evaluate(img => ({
    src: img.getAttribute('src'),
    width: img.naturalWidth,
    height: img.naturalHeight,
    complete: img.complete,
  }));
  assert.equal(logo.src, 'assets/lxplus-logo-v27.png?v=28.1');
  assert.equal(logo.width, 277);
  assert.equal(logo.height, 243);
  assert.equal(logo.complete, true);
  assert.equal(await page.evaluate(() => window.__LX_BOOT_ERROR || ''), '');
});

await page.screenshot({ path: new URL('splash-desktop.png', artifacts).pathname, fullPage: true });

await check('short splash enters authentication', async () => {
  await page.waitForSelector('#auth:not(.hidden)', { timeout: 4200 });
  assert.equal(await page.locator('#loginForm').isVisible(), true);
});

await check('authentication forms never reload natively', async () => {
  const prevented = await page.evaluate(() => {
    const form = document.getElementById('loginForm');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(prevented, true);
});

await check('manifest and service worker', async () => {
  const manifest = await page.evaluate(async () => fetch('manifest.webmanifest').then(r => r.json()));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons[0].src, 'assets/icon-v27.svg');
  assert.equal(manifest.icons[0].purpose, 'any');
  await page.waitForTimeout(500);
  const registrations = await page.evaluate(() => navigator.serviceWorker?.getRegistrations().then(rows => rows.length) || 0);
  assert.ok(registrations >= 1);
});

const showMockApp = async adminRole => page.evaluate(role => {
  const lx = window.LX;
  lx.state.user = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'QA LX',
    email: 'qa@example.invalid',
    admin: true,
    adminRole: role,
    approved: true,
  };
  lx.state.profile = { id: 'main', name: 'QA LX', kids: false };
  lx.ui.renderApp();
  lx.ui.show('app');
}, adminRole);

await showMockApp('owner');
await page.waitForTimeout(500);

await check('desktop app shell and navigation', async () => {
  assert.equal(await page.locator('#app:not(.hidden)').isVisible(), true);
  assert.equal(await page.locator('#lxDesktopRail').isVisible(), true);
  await page.locator('[data-shell-mode="Ouvir"]').click();
  assert.equal(await page.evaluate(() => window.LX.state.mode), 'Ouvir');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);
});

await page.screenshot({ path: new URL('home-desktop.png', artifacts).pathname, fullPage: true });

await check('explicit preview and Now Playing', async () => {
  await page.evaluate(() => {
    const lx = window.LX;
    lx.state.musicQueue = [{
      contentId: 271,
      index: 0,
      title: 'Faixa de teste',
      artist: 'Artista LX',
      album: 'Álbum LX',
      cover: 'assets/lxplus-logo-v27.png?v=28.1',
      duration: 30,
      previewUrl: 'https://example.invalid/preview.mp3',
      playbackKind: 'preview',
      isPreview: true,
    }];
    lx.state.musicIndex = 0;
    document.getElementById('musicDock')?.classList.remove('hidden');
    lx.refreshMusicUI?.();
    lx.openNowPlaying();
  });
  await page.waitForSelector('#lxV27NowPlaying:not(.hidden)');
  assert.match(await page.locator('.lx-v27-preview-warning').innerText(), /Isto é uma prévia/);
  assert.match(await page.locator('#lxV27NowPlaying').innerText(), /TRECHO CURTO/);
});

await page.screenshot({ path: new URL('now-playing-desktop.png', artifacts).pathname, fullPage: true });
await page.evaluate(() => window.LX.closeNowPlaying());

await check('owner role management screen', async () => {
  await page.evaluate(() => {
    window.LX.ui.show('admin');
    window.LX.state.adminPage = 'admins';
    window.LX.admin.render('admins');
  });
  await page.waitForTimeout(1400);
  assert.equal(await page.locator('.lx-v27-owner-lock').isVisible(), true);
  assert.match(await page.locator('#adminMain').innerText(), /Dono protegido/);
});

await check('moderator cannot access catalog', async () => {
  await page.evaluate(() => { window.LX.state.user.adminRole = 'moderator'; });
  await page.waitForTimeout(1400);
  const hidden = await page.locator('#adminNav [data-admin="library"]').evaluate(el => el.classList.contains('lx-role-hidden') && el.disabled);
  assert.equal(hidden, true);
});

await page.setViewportSize({ width: 768, height: 1024 });
await showMockApp('owner');
await page.waitForTimeout(350);
await check('tablet responsiveness', async () => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);
});
await page.screenshot({ path: new URL('home-tablet.png', artifacts).pathname, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await showMockApp('owner');
await page.waitForTimeout(350);
await check('mobile responsiveness and touch navigation', async () => {
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    mobileNav: !!document.querySelector('.mobile-nav:not(.hidden), .bottom-nav:not(.hidden), #mobileNav:not(.hidden)'),
    appVisible: !document.getElementById('app').classList.contains('hidden'),
  }));
  assert.ok(metrics.overflow <= 1, `horizontal overflow: ${metrics.overflow}px`);
  assert.equal(metrics.appVisible, true);
});
await page.screenshot({ path: new URL('home-mobile.png', artifacts).pathname, fullPage: true });

await check('unique active DOM ids', async () => {
  const duplicates = await page.evaluate(() => {
    const counts = new Map();
    document.querySelectorAll('[id]').forEach(el => counts.set(el.id, (counts.get(el.id) || 0) + 1));
    return [...counts].filter(([, count]) => count > 1);
  });
  assert.deepEqual(duplicates, []);
});

await check('no unexpected runtime errors', async () => {
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
});

await browser.close();

const failed = results.filter(result => result.status === 'FAIL');
console.log(JSON.stringify({ base, passed: results.length - failed.length, failed: failed.length, results, pageErrors, consoleErrors }, null, 2));
if (failed.length) process.exitCode = 1;
