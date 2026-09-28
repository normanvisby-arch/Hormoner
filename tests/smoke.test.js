const { chromium } = require('playwright');
// Kør via tests/run_all.sh. Indlæser alle sider og fejler ved JavaScript-fejl eller vandret scroll på mobil.
const ROOT = process.env.BASE_URL || 'http://localhost:8795/';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
const PAGES = ['oversigt.html', 'index.html', 'risiko.html', 'huskeskema.html', 'praevention.html', 'mrs.html', 'bloedningskalender.html', 'osteoporose.html', 'fraktur.html', 'osteoplan.html', 'osteohuskeskema.html'];
(async () => {
  const b = await chromium.launch({ executablePath: CHROMIUM });
  let fails = 0;
  for (const f of PAGES) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; p.on('pageerror', (e) => errors.push(String(e)));
    const r = await p.goto(ROOT + f); await p.waitForTimeout(200);
    const w = await p.evaluate(() => document.documentElement.scrollWidth);
    const ok = r.ok() && errors.length === 0 && w <= 390;
    console.log((ok ? 'PASS ' : 'FAIL ') + f + (ok ? '' : `  status=${r.status()} width=${w} ${JSON.stringify(errors)}`));
    if (!ok) fails++;
    await p.close();
  }
  console.log('FAILS:', fails); await b.close();
})();
