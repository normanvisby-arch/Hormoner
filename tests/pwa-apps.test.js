const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Tester lunge-, hypothyreose-, diabetes-, infektion- og nyre-appen som selvstændige apps:
// manifest, ikoner, service worker, offline og installér-knap.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const APPS = [
  { dir: 'lunge', name: 'Lunger i almen praksis', pages: ['kol.html', 'astma.html', 'huskeskema.html'], nav: ['Oversigt', 'KOL', 'Astma', 'Huskeskema'], cards: 3 },
  { dir: 'thyreoidea', name: 'Hypothyreose i almen praksis', pages: ['hypothyreose.html', 'huskeskema.html'], nav: ['Oversigt', 'Hypothyreose', 'Huskeskema'], cards: 2 },
  { dir: 'diabetes', name: 'Type 2-diabetes i almen praksis', pages: ['behandling.html', 'aarskontrol.html', 'huskeskema.html'], nav: ['Oversigt', 'Behandling', 'Årskontrol', 'Huskeskema'], cards: 3 },
  { dir: 'infektion', name: 'Infektioner i almen praksis', pages: ['luftveje.html', 'urinveje.html', 'hud.html', 'huskeskema.html'], nav: ['Oversigt', 'Luftveje', 'Urinveje', 'Hud'], cards: 4 },
  { dir: 'nyre', name: 'Nyrer i almen praksis', pages: ['ckd.html', 'dosis.html', 'huskeskema.html'], nav: ['Oversigt', 'Kronisk nyresygdom', 'Dosis efter nyrefunktion'], cards: 3 },
];
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  for (const a of APPS) {
    const APP = ROOT + a.dir + '/';
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto(APP + 'index.html');
    const man = await (await p.request.get(APP + 'manifest.webmanifest')).json();
    check(`${a.dir} manifest`, man.name === a.name && man.start_url === 'index.html' && man.scope === './' && man.display === 'standalone', man.name);
    for (const ic of man.icons) check(`${a.dir} icon ${ic.src}`, (await p.request.get(APP + ic.src)).ok());
    const reg = await p.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    check(`${a.dir} SW scope`, reg === APP, reg);
    await p.reload(); await p.waitForTimeout(300);
    check(`${a.dir} SW controls page`, await p.evaluate(() => !!navigator.serviceWorker.controller));
    check(`${a.dir} ${a.cards} kort`, (await p.locator('.tool').count()) === a.cards);
    check(`${a.dir} installér-knap skjult uden prompt`, (await p.locator('[data-install]').count()) === 1 && (await p.locator('[data-install]').isHidden()));
    // Simulér browserens installationstilbud.
    await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
    check(`${a.dir} installér-knap vises ved tilbud`, await p.locator('[data-install]').isVisible());
    await p.click('[data-install]'); await p.waitForTimeout(100);
    check(`${a.dir} knap åbner installation`, await p.evaluate(() => window.__prompted === true) && (await p.locator('[data-install]').isHidden()));
    const andre = await p.locator('.note', { hasText: 'Andre apps' }).innerText();
    check(`${a.dir} links til andre apps`, andre.includes('Kvindesundhed') && andre.includes('Hjerte-kar') && !andre.includes(a.name.split(' ')[0] + ' ('));
    for (const f of a.pages) {
      await p.goto(APP + f); await p.waitForTimeout(150);
      const nav = await p.locator('nav').first().innerText();
      check(`${a.dir}/${f} nav`, a.nav.every((x) => nav.includes(x)), nav.replace(/\n/g, ' | '));
      check(`${a.dir}/${f} manifest-link`, (await p.locator('link[rel="manifest"]').getAttribute('href')) === 'manifest.webmanifest');
    }
    await ctx.setOffline(true);
    for (const f of ['index.html', ...a.pages]) {
      const r = await p.goto(APP + f).catch(() => null);
      check(`${a.dir} offline ${f}`, r && r.ok() && (await p.locator('h1').count()) > 0);
    }
    await p.goto(APP + a.pages[0]); await p.waitForTimeout(150);
    check(`${a.dir} offline: værktøj kører med stil`, (await p.locator('#output .box').count()) > 0 && (await p.evaluate(() => getComputedStyle(document.querySelector('.topbar')).backgroundImage)).includes('gradient'));
    await ctx.setOffline(false);
    check(`${a.dir} JS errors`, errors.length === 0, JSON.stringify(errors));
    await ctx.close();
  }
  console.log('FAILS:', fails); await b.close();
})();
