const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Downloadsiden (apps.html): alle apps med installér-link, delbart link og
// QR-koder (som peger på de rigtige adresser), fremhævning af installér-knappen (#installer), udskrift og mobil.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const PAGES = 'https://normanvisby-arch.github.io/Hormoner/';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(ROOT + 'apps.html'); await p.waitForTimeout(200);

  const kort = await p.$$eval('#apps .app', (els) => els.map((e) => ({
    id: e.dataset.app,
    navn: e.querySelector('h2').innerText,
    href: e.querySelector('a.btn-open').getAttribute('href'),
    kopi: e.querySelector('[data-kopier]').dataset.kopier,
    qr: e.querySelector('.qr-lille').getAttribute('src'),
    ikon: e.querySelector('.app-head img').getAttribute('src'),
    ny: e.querySelector('a.btn-open').getAttribute('target'),
  })));
  check('A1 ni apps', kort.length === 9, kort.map((k) => k.navn).join(', '));
  const dele = await p.locator('#delLink').innerText();
  check('A2 delbart link er GitHub Pages-adressen', dele === PAGES + 'apps.html', dele);

  // QR-koden til siden og til hver app indeholder præcis den adresse, der kopieres (title = kodet tekst; afkodet i tools/mkqr.py).
  const titel = async (src) => { const r = await p.request.get(ROOT + src); const t = await r.text(); const m = t.match(/<title>([^<]+)<\/title>/); return r.ok() && t.startsWith('<svg') && m ? m[1] : null; };
  check('A3 QR-koden til siden peger på det delbare link', (await titel('qr/apps.svg')) === dele);
  for (const k of kort) {
    const sti = k.href.replace('#installer', '');
    const side = await p.request.get(ROOT + sti);
    const html = await side.text();
    const pagesSti = k.kopi.replace(PAGES, '');
    check(`A4 ${k.navn}: link, manifest, installér-knap, QR og ikon`,
      side.ok() && /<link rel="manifest"/.test(html) && /data-install/.test(html) &&
      k.href.endsWith('#installer') && k.ny === '_blank' &&
      (sti === pagesSti || sti === pagesSti + 'index.html') &&
      (await titel(k.qr)) === k.kopi && (await p.request.get(ROOT + k.ikon)).ok(),
      `${k.href} ${k.kopi} ${k.qr}`);
  }
  // Alle apps med eget manifest er med.
  const manifester = ['manifest.webmanifest', 'hjerte/', 'lunge/', 'thyreoidea/', 'diabetes/', 'infektion/', 'nyre/', 'notat/', 'restordre/'];
  check('A5 alle apps med manifest er på siden', manifester.every((m) => kort.some((k) => (m === 'manifest.webmanifest' ? k.href.startsWith('oversigt.html') : k.href.startsWith(m)))));

  // Kopiér link
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: ROOT.replace(/\/$/, '') });
  await p.click('.del [data-kopier]'); await p.waitForTimeout(150);
  check('A6 kopiér link', (await p.evaluate(() => navigator.clipboard.readText())) === dele && (await p.locator('.del .status').innerText()).includes('Kopieret'));

  // Service worker gemmer siden og QR-koderne
  const sw = await (await p.request.get(ROOT + 'sw.js')).text();
  check('A7 rod-service-worker gemmer apps.html og alle QR-koder', sw.includes('"apps.html"') && kort.every((k) => sw.includes(`"${k.qr}"`)) && sw.includes('"qr/apps.svg"'));

  // Startsiderne linker til downloadsiden
  for (const s of ['oversigt.html', 'hjerte/index.html', 'lunge/index.html', 'thyreoidea/index.html', 'diabetes/index.html', 'infektion/index.html', 'nyre/index.html', 'notat/index.html']) {
    const html = await (await p.request.get(ROOT + s)).text();
    check(`A8 ${s} linker til apps.html (kun i appen)`, /href="(\.\.\/)?apps\.html"/.test(html) && /data-app-only[^]*?apps\.html/.test(html));
  }

  // #installer fremhæver installér-vejledningen på appens startside
  await p.goto(ROOT + 'hjerte/index.html#installer'); await p.waitForTimeout(400);
  check('B1 #installer fremhæver installér-noten', await p.evaluate(() => { const n = document.querySelector('[data-install]').closest('.note'); return !!n && n.style.outline.includes('3px'); }));
  await p.goto(ROOT + 'hjerte/index.html'); await p.waitForTimeout(300);
  check('B2 uden #installer: ingen fremhævning', await p.evaluate(() => !document.querySelector('[data-install]').closest('.note').style.outline));
  await p.goto(ROOT + 'restordre/index.html#installer'); await p.waitForTimeout(400);
  check('B3 Restordre har installér-knap (fremhæves)', await p.evaluate(() => { const k = document.querySelector('[data-install]'); return !!k && k.closest('.topbar-actions').style.outline.includes('3px'); }));

  // Udskrift: QR-koder vises, knapper skjules
  await p.goto(ROOT + 'apps.html'); await p.waitForTimeout(200);
  await p.emulateMedia({ media: 'print' });
  check('C1 udskrift: QR pr. app, ingen knapper', await p.evaluate(() => [...document.querySelectorAll('.print-qr')].every((i) => getComputedStyle(i).display === 'block' && i.complete && i.naturalWidth > 0) && [...document.querySelectorAll('.btn')].every((x) => getComputedStyle(x).display === 'none')));
  await p.emulateMedia({ media: 'screen', colorScheme: 'dark' }); await p.waitForTimeout(100);
  check('C2 mørk visning: QR-koden står på hvid baggrund', await p.evaluate(() => getComputedStyle(document.querySelector('.qr-stor')).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(document.body).backgroundColor !== 'rgb(255, 255, 255)'));

  // Mobil
  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 }); await m.goto(ROOT + 'apps.html'); await m.waitForTimeout(200);
  check('M1 mobil: ingen vandret scroll', (await m.evaluate(() => document.documentElement.scrollWidth)) <= 360);
  check('JS errors', errors.length === 0, JSON.stringify(errors));
  console.log(fails ? `FAILS: ${fails}` : 'FAILS: 0');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
