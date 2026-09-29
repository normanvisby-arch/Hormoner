const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Tester hjerte-appen som selvstændig app: manifest, ikoner, service worker og offline.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const APP = ROOT + 'hjerte/';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  await p.goto(APP + 'index.html');
  const man = await (await p.request.get(APP + 'manifest.webmanifest')).json();
  check('manifest: egen app', man.name === 'Hjerte-kar i almen praksis' && man.start_url === 'index.html' && man.scope === './' && man.display === 'standalone');
  for (const ic of man.icons) check('icon ' + ic.src, (await p.request.get(APP + ic.src)).ok());
  const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.scope; });
  check('SW scope = hjerte/', reg === APP, reg);
  await p.reload(); await p.waitForTimeout(300);
  check('SW controls page', await p.evaluate(() => !!navigator.serviceWorker.controller));
  check('3 tool cards', (await p.locator('.tool').count()) === 3);
  for (const f of ['cvrisiko.html', 'af.html', 'huskeskema.html']) {
    await p.goto(APP + f); await p.waitForTimeout(150);
    const nav = await p.locator('nav').first().innerText();
    check(f + ' nav', nav.includes('Oversigt') && nav.includes('CV-risiko') && nav.includes('Atrieflimren') && nav.includes('Huskeskema'), nav.replace(/\n/g, ' | '));
    check(f + ' manifest link', (await p.locator('link[rel="manifest"]').getAttribute('href')) === 'manifest.webmanifest');
  }
  await ctx.setOffline(true);
  for (const f of ['index.html', 'cvrisiko.html', 'af.html', 'huskeskema.html']) {
    const r = await p.goto(APP + f).catch(() => null);
    check('offline ' + f, r && r.ok() && (await p.locator('h1').count()) > 0);
  }
  await p.goto(APP + 'cvrisiko.html'); await p.fill('#alder', '50'); await p.fill('#sbp', '140'); await p.fill('#tchol', '6.3'); await p.fill('#hdl', '1.4');
  await p.check('input[name="koen"][value="mand"]'); await p.check('input[name="ryger"][value="ja"]'); await p.waitForTimeout(100);
  check('offline SCORE2 beregner (styles ok)', (await p.locator('#output .box h3').first().innerText()) === '10-års risiko: 6,3 % (SCORE2)' && (await p.evaluate(() => getComputedStyle(document.querySelector('.topbar')).backgroundImage)).includes('gradient'));
  await ctx.setOffline(false);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log('FAILS:', fails); await b.close();
})();
