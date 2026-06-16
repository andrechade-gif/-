const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport matching slide dimensions
  await page.setViewportSize({ width: 1440, height: 810 });

  const htmlPath = path.resolve(__dirname, 'slides.html');
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for fonts and images
  await page.waitForTimeout(2000);

  // Viewport is 1440×810 CSS px (96dpi). PDF uses pt (72dpi).
  // scale=4/3 makes each CSS px = 1pt, so 1440px→1440pt, 810px→810pt.
  await page.pdf({
    path: path.resolve(__dirname, '../../doutor_ai_apresentacao_institucional.pdf'),
    width: '20in',      // 1440pt
    height: '11.25in',  // 810pt
    printBackground: true,
    scale: 4 / 3,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();
  console.log('PDF rendered OK');
})();
