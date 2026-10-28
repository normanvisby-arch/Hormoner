const { chromium } = require('playwright');
// Kør via tests/run_all.sh. "Alle apps med ét klik": den samlede app (alle/), installér-knap og
// zip med skrivebordsgenveje på downloadsiden, og at alle apps virker offline efter ét besøg.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const PAGES = 'https://normanvisby-arch.github.io/Hormoner/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0; const check = (n, c, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); if (!c) fails++; };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e)));

  // ---------------- Downloadsiden ----------------
  await p.goto(ROOT + 'apps.html'); await p.waitForTimeout(300);
  const manHref = await p.getAttribute('link[rel="manifest"]', 'href');
  check('D1 downloadsiden peger på den samlede apps manifest', manHref === 'alle/manifest.webmanifest', manHref);
  const man = await (await p.request.get(ROOT + 'alle/manifest.webmanifest')).json();
  check('D2 manifest: hele sitet som område, start i alle/', man.scope === '../' && man.start_url === 'index.html' && man.id === 'alle/' && man.display === 'standalone' && man.name === 'Alle klinikværktøjer');
  for (const ic of man.icons) check(`D3 ikon ${ic.src}`, (await p.request.get(ROOT + 'alle/' + ic.src)).ok());
  check('D4 installér-knap skjult uden tilbud fra browseren', await p.locator('.alle [data-install]').isHidden());
  await p.evaluate(() => { const e = new Event('beforeinstallprompt'); e.prompt = () => { window.__prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  check('D5 knappen "Installér alle apps" vises ved tilbud', await p.locator('.alle [data-install]').isVisible());
  await p.click('.alle [data-install]'); await p.waitForTimeout(100);
  check('D6 ét klik åbner installationen', await p.evaluate(() => window.__prompted === true));
  check('D7 link til den samlede app', (await p.getAttribute('#alleAaben', 'href')) === 'alle/index.html#installer');

  // Zip med genveje
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#genvejeBtn')]);
  check('D8 zip downloades med ét klik', dl.suggestedFilename() === 'klinikvaerktoejer-genveje.zip', dl.suggestedFilename());
  const zip = (await (await p.request.get(ROOT + 'alle/klinikvaerktoejer-genveje.zip')).body()).toString('latin1');
  const kort = await p.evaluate(() => [...document.querySelectorAll('#apps .app [data-kopier]')].map((x) => x.dataset.kopier));
  const urlFiler = (zip.match(/Klinikvaerktoejer\/Windows\/[^\0]*?\.url/g) || []).length;
  const webloc = (zip.match(/Klinikvaerktoejer\/Mac\/[^\0]*?\.webloc/g) || []).length;
  // Navnene står både i den lokale header og i den centrale fortegnelse.
  check('D9 genvej (Windows + Mac) til hver app og den samlede app', urlFiler === 2 * (kort.length + 1) && webloc === 2 * (kort.length + 1), `${urlFiler}/${webloc} for ${kort.length} apps`);
  check('D10 hver apps adresse er i genvejene', kort.every((u) => zip.includes('URL=' + u + '\r\n') && zip.includes('<string>' + u + '</string>')) && zip.includes('URL=' + PAGES + 'alle/'));
  const ikoner = [...zip.matchAll(/IconFile=(\S+)/g)].map((m) => m[1].replace(PAGES, ''));
  let ok = ikoner.length > 0;
  for (const i of new Set(ikoner)) ok = ok && (await p.request.get(ROOT + i)).ok();
  check('D11 alle ikoner (favicon.ico) findes', ok, ikoner.length + ' ikoner');
  check('D12 vejledning i zip-filen', zip.includes('LAES MIG.txt'));

  // ---------------- Den samlede app ----------------
  await p.goto(ROOT + 'alle/index.html'); await p.waitForTimeout(300);
  const tiles = await p.evaluate(() => [...document.querySelectorAll('.tile')].map((a) => ({ href: a.getAttribute('href'), img: a.querySelector('img').getAttribute('src'), navn: a.querySelector('strong').textContent })));
  check('S1 tolv apps i den samlede app', tiles.length === 12, tiles.map((t) => t.navn).join(', '));
  let alleOk = true;
  for (const t of tiles) alleOk = alleOk && (await p.request.get(ROOT + 'alle/' + t.href)).ok() && (await p.request.get(ROOT + 'alle/' + t.img)).ok();
  check('S2 alle links og ikoner virker', alleOk);
  const startsider = kort.map((u) => u.replace(PAGES, '').replace(/\/$/, '/index.html'));
  check('S3 samme apps som på downloadsiden', startsider.every((s) => tiles.some((t) => t.href === '../' + s)), startsider.join(' '));
  // Service workers for alle apps registreres, og filerne gemmes.
  await p.waitForFunction(() => document.documentElement.dataset.offlineKlar, null, { timeout: 30000 }).catch(() => {});
  const regs = await p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((r) => new URL(r.scope).pathname));
  const mapper = ['/', '/hjerte/', '/lunge/', '/thyreoidea/', '/diabetes/', '/infektion/', '/nyre/', '/svangre/', '/psyke/', '/boern/', '/kraeft/', '/restordre/', '/alle/'];
  check('S4 service worker for hver app', mapper.every((m) => regs.includes(m)), regs.join(' '));
  check('S5 status: alle apps klar uden internet', (await p.locator('#offlineStatus').innerText()).includes('Alle apps virker nu også uden internet'));
  await ctx.setOffline(true);
  const offline = ['alle/index.html', 'oversigt.html', 'index.html', 'hjerte/index.html', 'hjerte/af.html', 'lunge/kol.html', 'thyreoidea/hypothyreose.html', 'diabetes/behandling.html', 'infektion/urinveje.html', 'nyre/dosis.html', 'svangre/svangre.html', 'psyke/depression.html', 'psyke/demens.html', 'boern/boern.html', 'kraeft/kraeft.html', 'restordre/index.html'];
  const fejl = [];
  for (const s of offline) {
    const r = await p.goto(ROOT + s).catch(() => null);
    if (!(r && r.ok() && (await p.locator('h1').count()) > 0)) fejl.push(s);
  }
  check('S6 alle apps åbner uden internet efter ét besøg', fejl.length === 0, fejl.join(' '));
  await ctx.setOffline(false);

  // ---------------- Installér-knap og mobil ----------------
  await p.goto(ROOT + 'alle/index.html#installer'); await p.waitForTimeout(400);
  check('S7 #installer fremhæver installér-vejledningen', await p.evaluate(() => { const n = document.querySelector('[data-install]').closest('.note'); return !!n && n.style.outline.includes('3px'); }));
  const m = await ctx.newPage(); await m.setViewportSize({ width: 360, height: 800 });
  for (const s of ['alle/index.html', 'apps.html']) {
    await m.goto(ROOT + s); await m.waitForTimeout(200);
    check(`M1 ${s}: ingen vandret scroll på mobil`, await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  }
  const rodSw = await (await p.request.get(ROOT + 'sw.js')).text();
  check('M2 rod-service-worker hævet og uændret i omfang', rodSw.includes('"apps.html"'));

  check('Z1 ingen JavaScript-fejl', errors.length === 0, errors.join(' | '));
  console.log('FAILS:', fails); await b.close();
})();
