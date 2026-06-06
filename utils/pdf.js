let browserPromise = null;

async function getBrowser() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    const err = new Error("Puppeteer n'est pas installé. Lancez: npm install puppeteer");
    err.status = 500;
    throw err;
  }
  if (!browserPromise) {
    try {
      browserPromise = puppeteer.launch({
        headless: true,
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // 👈 ajouté
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (e) {
      const err = new Error(`Impossible de lancer Chromium (Puppeteer): ${e && e.message ? e.message : e}`);
      err.status = 500;
      throw err;
    }
  }
  return browserPromise;
}

async function generatePdfBufferFromHtml(html, pdfOptions = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(String(html || ''), { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      ...pdfOptions,
    });
    // SUPPRIMEZ la ligne suivante (c'était l'erreur) :
    // const browser = await puppeteer.launch(...)
    return buffer;
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { generatePdfBufferFromHtml };