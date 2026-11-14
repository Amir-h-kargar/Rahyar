import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
console.log('TITLE:', await page.title());
console.log('ONBOARDING:', (await page.locator('body').innerText()).slice(0, 300));
await page.screenshot({ path: 'artifacts/00-onboarding-mobile.png', fullPage: true });

await page.getByTestId('onboarding-start').click();
await page.getByTestId('now-hero').waitFor({ timeout: 15000 });
await page.screenshot({ path: 'artifacts/01-now-mobile.png', fullPage: true });
console.log('NOW:', (await page.locator('body').innerText()).slice(0, 700));
console.log('ERRORS:', errors);
await browser.close();
