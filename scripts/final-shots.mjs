import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173';
const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const errors = [];

async function prepare(context, viewport) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  return page;
}

async function start(page, name = 'آرش') {
  await page.locator('#onboarding-name').fill(name);
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('now-hero').waitFor();
  await page.waitForTimeout(1300);
}

async function shot(page, name, fullPage = false) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `artifacts/final-${name}.png`, fullPage });
  console.log('shot', name);
}

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'fa-IR',
  timezoneId: 'Asia/Tehran',
});
const page = await prepare(mobile, { width: 390, height: 844 });
await shot(page, 'mobile-onboarding');
await start(page);
await shot(page, 'mobile-now');

await page.getByTestId('complete-now').click();
await page.getByTestId('reward-card').waitFor();
await page.waitForTimeout(500);
await shot(page, 'mobile-reward');
await page.getByTestId('reward-card').getByRole('button', { name: 'ادامه', exact: true }).click();
await page.waitForTimeout(400);

await page.getByTestId('nav-advisor').click();
await page.waitForTimeout(800);
await shot(page, 'mobile-advisor');

await page.getByTestId('nav-portfolio').click();
await page.waitForTimeout(800);
await shot(page, 'mobile-portfolio');

await page.getByTestId('nav-plan').click();
await page.waitForTimeout(800);
await shot(page, 'mobile-plan');

await page.getByTestId('nav-review').click();
await page.waitForTimeout(800);
await shot(page, 'mobile-review');

await page.getByLabel('تنظیمات').click();
await page.locator('.sheet').filter({ hasText: 'تنظیمات' }).waitFor();
await page.waitForTimeout(500);
await shot(page, 'mobile-settings');
await page.locator('.sheet').getByRole('button', { name: 'بستن', exact: true }).first().click();
await page.getByTestId('nav-now').click();
await page.waitForTimeout(500);

await page.getByLabel('افزودن کار').click();
await page.locator('.sheet').filter({ hasText: 'یک قدم تازه' }).waitFor();
await page.waitForTimeout(500);
await shot(page, 'mobile-add-task');
await mobile.close();

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  locale: 'fa-IR',
  timezoneId: 'Asia/Tehran',
});
const desk = await prepare(desktop, { width: 1440, height: 950 });
await shot(desk, 'desktop-onboarding');
await start(desk);
await shot(desk, 'desktop-now');
await desk.getByTestId('rail-advisor').click();
await desk.waitForTimeout(800);
await shot(desk, 'desktop-advisor');
await desk.getByTestId('rail-portfolio').click();
await desk.waitForTimeout(800);
await shot(desk, 'desktop-portfolio');
await desk.getByTestId('rail-plan').click();
await desk.waitForTimeout(800);
await shot(desk, 'desktop-plan');
await desk.getByTestId('rail-review').click();
await desk.waitForTimeout(800);
await shot(desk, 'desktop-review');
await desktop.close();

const empty = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: 'fa-IR',
});
const emptyPage = await prepare(empty, { width: 390, height: 844 });
await emptyPage.locator('.demo-toggle').click();
await emptyPage.getByTestId('onboarding-start').click();
await emptyPage.locator('.hero--empty').waitFor();
await emptyPage.waitForTimeout(1200);
await shot(emptyPage, 'mobile-empty');
await empty.close();

console.log('ERRORS:', errors);
await browser.close();
