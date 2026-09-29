// Laver PNG-ikoner til en app ud fra dens icons/icon.svg.
// Brug: NODE_PATH=/opt/node22/lib/node_modules node tools/mkicons.js lunge
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', process.argv[2] || '.', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
// Uden runde hjørner og med symbolet inden for sikkerhedszonen (maskable/Apple).
const bleed = svg.replace(' rx="112"', '').replace('<g fill', '<g transform="translate(256 256) scale(0.78) translate(-256 -256)" fill');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const shots = [['icon-192.png', 192, svg], ['icon-512.png', 512, svg], ['icon-maskable-512.png', 512, bleed], ['apple-touch-icon.png', 180, bleed]];
  for (const [name, size, src] of shots) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await p.screenshot({ path: path.join(dir, name), omitBackground: true });
    await p.close();
  }
  await b.close();
})();
