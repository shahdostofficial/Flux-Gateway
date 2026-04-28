const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
  });

  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, 'combined-models.html');
  await page.goto('file://' + filePath, { waitUntil: 'networkidle0' });

  const outputPath = path.resolve(__dirname, '..', 'Meridianblue_Models.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '15px', bottom: '15px', left: '15px', right: '15px' },
  });

  console.log('✅ Generated: ' + outputPath);
  await browser.close();
})();
