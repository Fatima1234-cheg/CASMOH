let browserPromise = null;

async function getBrowser() {
  let puppeteer;
  try {
    // Try full puppeteer first (bundles Chromium automatically)
    puppeteer = require('puppeteer');
  } catch (e) {
    try {
      // Fallback to puppeteer-core if full puppeteer isn't installed
      puppeteer = require('puppeteer-core');
    } catch (e2) {
      const err = new Error("Puppeteer n'est pas installé. Lancez: npm install puppeteer");
      err.status = 500;
      throw err;
    }
  }

  if (!browserPromise) {
    // Detect the executable path based on environment:
    // - In production (Linux/Docker/Railway): use the bundled Chromium or system Chrome
    // - In development (Windows): use the local Chrome installation
    let executablePath;

    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      // Allow overriding via environment variable
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (typeof puppeteer.executablePath === 'function') {
      try {
        const resolvedPath = puppeteer.executablePath();
        if (resolvedPath) {
          executablePath = resolvedPath;
        }
      } catch (e) {
        executablePath = undefined;
      }
    } else if (process.platform === 'win32') {
      executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'darwin') {
      executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',   // Important for Docker — avoids /dev/shm running out of space
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',          // Required in some Railway/Docker environments
      ],
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browserPromise = puppeteer.launch(launchOptions).catch((e) => {
      browserPromise = null; // Reset so next call retries
      const err = new Error(`Impossible de lancer Chromium (Puppeteer): ${e && e.message ? e.message : e}`);
      err.status = 500;
      throw err;
    });
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
    return buffer;
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { generatePdfBufferFromHtml };