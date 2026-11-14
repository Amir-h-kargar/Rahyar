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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

async function shot(name, fullPage = false) {
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage });
  console.log('SHOT', name);
}

async function nav(tab) {
  await page.getByTestId(`nav-${tab}`).click();
  await page.waitForTimeout(700);
}

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await shot('10-onboarding-viewport');

await page.getByTestId('onboarding-start').click();
await page.getByTestId('now-hero').waitFor({ timeout: 15000 });
await shot('11-now-viewport');
await shot('12-now-full', true);

await page.getByTestId('complete-now').click();
await page.getByTestId('reward-card').waitFor();
await shot('13-reward');
await page.getByTestId('reward-card').getByText('ادامه', { exact: true }).click();

await nav('advisor');
await shot('14-advisor');
await page.getByTestId('cmd-lighten').click();
await page.waitForTimeout(500);
await shot('15-advisor-lighten');
await page.getByTestId('cmd-focus').click();
await page.locator('.command-panel .area-choice').filter({ hasText: 'خانواده' }).click();
await page.waitForTimeout(500);
await nav('now');
await shot('16-now-focus');

await nav('portfolio');
await shot('17-portfolio');
await shot('18-portfolio-full', true);

await nav('plan');
await shot('19-plan');
await page.getByRole('tab', { name: 'اهداف' }).click();
await shot('20-goals');
await page.getByRole('tab', { name: 'آیین‌ها' }).click();
await shot('21-rituals');
await page.getByRole('tab', { name: 'دفتر تصمیم' }).click();
await shot('22-journal');

await nav('review');
await shot('23-review');

await page.setViewportSize({ width: 1440, height: 950 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: 'artifacts/30-desktop-now.png' });
console.log('SHOT desktop-now');
await page.getByTestId('rail-advisor').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'artifacts/31-desktop-advisor.png' });
await page.getByTestId('rail-portfolio').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'artifacts/32-desktop-portfolio.png' });
await page.getByTestId('rail-plan').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'artifacts/33-desktop-plan.png' });
await page.getByTestId('rail-review').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'artifacts/34-desktop-review.png' });

console.log('ERRORS:', errors);
await browser.close();
