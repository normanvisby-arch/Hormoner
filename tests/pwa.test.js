const { chromium } = require('playwright');
// Kør via tests/run_all.sh (starter en lokal server). BASE_URL kan pege på en anden server.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const SHOTS = process.env.SHOT_DIR || require('os').tmpdir() + '/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const BASE = ROOT;
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  await p.goto(BASE + 'oversigt.html');
  const man = await (await p.request.get(BASE + 'manifest.webmanifest')).json();
  check('manifest start_url/display', man.start_url === 'oversigt.html' && man.display === 'standalone');
  for (const ic of man.icons) check('icon ' + ic.src, (await p.request.get(BASE + ic.src)).ok());
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForTimeout(300);
  check('SW controls page', await p.evaluate(() => !!navigator.serviceWorker.controller));
  check('9 tool cards', (await p.locator('.tool').count()) === 9);
  check('url shown absolute', (await p.locator('.tool .url').first().innerText()) === BASE + 'index.html');
  check('no horizontal scroll', (await p.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await p.screenshot({ path: SHOTS + 'pwa_oversigt_mobile.png', fullPage: true });
  // Every page: loads, has nav with Oversigt + Huskeskema, no calendar link, no claude.ai links
  for (const f of ['index.html', 'risiko.html', 'huskeskema.html', 'praevention.html', 'mrs.html']) {
    await p.goto(BASE + f); await p.waitForTimeout(150);
    const nav = await p.locator('nav').first().innerText();
    const html = await p.content();
    check(f + ' nav', nav.includes('Oversigt') && nav.includes('Huskeskema') && !nav.includes('Blødningskalender'), nav.replace(/\n/g, ' | '));
    check(f + ' no calendar/claude links', !html.includes('href="bloedningskalender.html"') && !html.includes('claude.ai/artifact'));
    check(f + ' manifest link', await p.locator('link[rel="manifest"]').count() === 1);
  }
  // Offline
  await ctx.setOffline(true);
  for (const f of ['oversigt.html', 'risiko.html', 'huskeskema.html', 'index.html', 'osteoporose.html', 'fraktur.html', 'osteoplan.html', 'osteohuskeskema.html']) {
    const r = await p.goto(BASE + f).catch((e) => null);
    check('offline ' + f, r && r.ok() && (await p.locator('h1').count()) > 0);
  }
  await p.goto(BASE + 'risiko.html'); await p.waitForTimeout(200);
  check('offline risk tool computes', (await p.locator('#output').innerText()).includes('NNH'));
  await ctx.setOffline(false);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
