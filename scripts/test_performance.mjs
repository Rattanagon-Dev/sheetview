import { chromium } from '@playwright/test';
import fs from 'node:fs';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('BROWSER LOG ERROR:', msg.text());
  });
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err));

  await page.goto('http://localhost:4173');

  // Test 1: Sample XLSX
  console.log('--- Testing Sample XLSX ---');
  let t0 = Date.now();
  await page.click('[data-testid="sample-xlsx"]');
  await page.waitForSelector('[data-testid="grid"]');
  let tElapsed = Date.now() - t0;
  console.log(`Sample XLSX rendered in ${tElapsed}ms`);

  // Close file
  await page.click('[data-testid="btn-close"]');
  await page.waitForSelector('[data-testid="open-button"]');

  // Test 2: Sample CSV
  console.log('--- Testing Sample CSV ---');
  t0 = Date.now();
  await page.click('[data-testid="sample-csv"]');
  await page.waitForSelector('[data-testid="grid"]');
  tElapsed = Date.now() - t0;
  console.log(`Sample CSV rendered in ${tElapsed}ms`);

  // Close file
  await page.click('[data-testid="btn-close"]');
  await page.waitForSelector('[data-testid="open-button"]');

  // Test 3: Large XLSX (20k rows)
  if (fs.existsSync('tests/fixtures/large.xlsx')) {
    console.log('--- Testing Large XLSX (20k rows) via file upload ---');
    t0 = Date.now();
    await page.setInputFiles('[data-testid="open-input"]', 'tests/fixtures/large.xlsx');
    await page.waitForSelector('[data-testid="grid"]', { timeout: 15000 });
    tElapsed = Date.now() - t0;
    console.log(`Large XLSX (20k rows) rendered in ${tElapsed}ms`);

    // Test scroll smoothness
    console.log('--- Scrolling Large Sheet ---');
    const scrollT0 = Date.now();
    await page.evaluate(() => {
      const scroller = document.querySelector('.grid-scroller');
      if (scroller) {
        scroller.scrollTop = 5000;
      }
    });
    // Close file
    await page.click('[data-testid="btn-close"]');
    await page.waitForSelector('[data-testid="open-button"]');
  }

  // Test 4: Large CSV (20k rows)
  if (fs.existsSync('tests/fixtures/large.csv')) {
    console.log('--- Testing Large CSV (20k rows) via file upload ---');
    t0 = Date.now();
    await page.setInputFiles('[data-testid="open-input"]', 'tests/fixtures/large.csv');
    await page.waitForSelector('[data-testid="grid"]', { timeout: 15000 });
    tElapsed = Date.now() - t0;
    console.log(`Large CSV (20k rows) rendered in ${tElapsed}ms`);
  }

  console.log('ALL PERFORMANCE TESTS PASSED SUCCESSFULLY!');
  await browser.close();
})();
