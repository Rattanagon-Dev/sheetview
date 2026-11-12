import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.error('BROWSER ERROR:', err));
  page.on('response', (r) => {
    if (r.status() >= 400) console.log('ERR RESPONSE:', r.status(), r.url());
  });

  await page.goto('http://localhost:4173');
  console.log('--- Initial Page State ---');

  console.log('--- Clicking Sample XLSX ---');
  await page.click('[data-testid="sample-xlsx"]');

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => ({
      hasGrid: !!document.querySelector('[data-testid="grid"]'),
      hasLoading: document.body.innerText.includes('Opening'),
      hasError:
        document.body.innerText.includes('error') ||
        document.body.innerText.includes("Couldn't"),
      text: document.body.innerText.slice(0, 100),
    }));
    console.log(`Step ${i} (${(i + 1) * 500}ms):`, JSON.stringify(state));
    if (state.hasGrid) {
      console.log('Grid appeared at step', i);
      break;
    }
  }

  await browser.close();
})();
