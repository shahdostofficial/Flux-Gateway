const puppeteer = require('puppeteer-core');
const path = require('path');

async function generatePDF(htmlFile, pdfFile) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    headless: 'new',
  });

  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, htmlFile);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });

  const outputPath = path.resolve(__dirname, '..', pdfFile);
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  console.log(`✅ Generated: ${outputPath}`);
  await browser.close();
}

(async () => {
  await generatePDF('free-models.html', 'Flux-Gateway_Free-Models.pdf');
  await generatePDF('limited-free-paid-models.html', 'Flux-Gateway_Limited-Free-Paid-Models.pdf');
  console.log('\n🎉 Both PDFs generated successfully!');
})();
