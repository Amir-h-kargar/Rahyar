import { chromium } from 'playwright-core';
import { mkdir, readFile, stat } from 'node:fs/promises';

const BASE = 'http://127.0.0.1:4173';
const executablePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: 'fa-IR',
  timezoneId: 'Asia/Tehran',
});
const page = await context.newPage();
page.setDefaultTimeout(12_000);

const errors = [];
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

const results = [];
function ok(name, condition = true, detail = '') {
  if (!condition) throw new Error(`FAILED: ${name}${detail ? ` — ${detail}` : ''}`);
  results.push(`✓ ${name}`);
  console.log(`✓ ${name}`);
}

async function screenshot(name) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `artifacts/${name}.png` });
}

async function nav(tab) {
  await page.getByTestId(`nav-${tab}`).click();
  await page.waitForTimeout(500);
}

async function closeReward() {
  const reward = page.getByTestId('reward-card');
  if (await reward.isVisible().catch(() => false)) {
    await reward.getByRole('button', { name: 'ادامه', exact: true }).click();
    await reward.waitFor({ state: 'hidden' });
  }
}

async function openSheet(title) {
  await page.locator('.sheet').filter({ hasText: title }).waitFor();
}

async function toastContains(text) {
  await page.locator('.toast').filter({ hasText: text }).first().waitFor();
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('onboarding-start').waitFor();
  ok('onboarding renders', true);

  await page.locator('#onboarding-name').fill('آرش');
  await page.locator('.area-choice').filter({ hasText: 'مالی' }).click();
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('now-hero').waitFor();
  ok('starter plan builds and Now renders');
  ok('name is used in greeting', (await page.locator('.page-title').innerText()).includes('آرش'));
  await screenshot('e2e-01-now');

  const firstTitle = await page.locator('.hero-title').innerText();
  await page.getByTestId('complete-now').click();
  await page.getByTestId('reward-card').waitFor();
  ok('reward appears after completion');
  await screenshot('e2e-02-reward');
  await page.getByTestId('reward-card').getByRole('button', { name: 'بازگردان', exact: true }).click();
  await page.getByTestId('reward-card').waitFor({ state: 'hidden' });
  await page.getByTestId('now-hero').waitFor();
  ok('undo restores the completed task', (await page.locator('.hero-title').innerText()) === firstTitle);
  await page.getByTestId('complete-now').click();
  await page.getByTestId('reward-card').waitFor();
  await closeReward();
  ok('completion sticks after closing reward');

  await page.getByTestId('quick-input').fill('تست کار سریع');
  await page.getByTestId('quick-input').press('Enter');
  await toastContains('به برنامه اضافه شد');
  ok('quick add works');
  await page.getByLabel('افزودن کار').click();
  await openSheet('یک قدم تازه');
  await screenshot('e2e-02a-add-sheet');
  await page.getByTestId('add-title').fill('خرید نان تست');
  await page.locator('.sheet .choice-chip').filter({ hasText: 'سلامت' }).click();
  await page.locator('.sheet .choice-chip').filter({ hasText: 'فردا' }).click();
  await page.getByTestId('add-submit').click();
  await page.locator('.sheet').filter({ hasText: 'یک قدم تازه' }).waitFor({ state: 'hidden' });
  ok('full add-task sheet works');

  await page.locator('[data-testid="now-hero"]').getByRole('button', { name: 'واگذاری', exact: true }).click();
  await openSheet('واگذاری با بریف آماده');
  await screenshot('e2e-03a-delegate-sheet');
  const brief = await page.locator('#brief').inputValue();
  ok('delegation brief is generated', brief.includes('بریف واگذاری') && brief.includes('خروجی مورد انتظار'));
  await page.locator('#delegate-to').fill('سارا');
  await page.getByRole('button', { name: 'ثبت واگذاری', exact: true }).click();
  await toastContains('واگذار شد');
  ok('delegation is saved');
  await screenshot('e2e-03-after-delegate');

  await nav('advisor');
  await page.getByTestId('cmd-summary').click();
  await page.locator('.latest-reply').waitFor();
  ok('advisor summary responds', (await page.locator('.latest-reply').innerText()).includes('امروز'));
  await page.getByTestId('cmd-lighten').click();
  await page.waitForTimeout(400);
  await page.getByTestId('cmd-focus').click();
  await page.locator('.command-panel .area-choice').filter({ hasText: 'خانواده' }).click();
  await page.locator('.latest-reply').filter({ hasText: 'تمرکز امروز' }).waitFor();
  ok('focus command sets a focus area');
  await page.getByTestId('cmd-deep').click();
  await page.locator('.command-panel .duration-chip').filter({ hasText: '۲۵' }).click();
  ok('deep-work block starts');
  await page.getByTestId('cmd-motivate').click();
  await page.locator('.latest-reply').waitFor();
  await screenshot('e2e-04-advisor');
  await nav('now');
  ok('deep-work banner is visible', await page.locator('.banner--deep').isVisible());
  await page.locator('.banner--deep').getByRole('button', { name: 'پایان', exact: true }).click();
  ok('deep-work block can be closed', (await page.locator('.banner--deep').count()) === 0);
  await page.locator('.focus-strip').getByRole('button', { name: 'برداشتن تمرکز' }).click();
  ok('focus can be cleared', (await page.locator('.focus-strip').count()) === 0);

  await nav('portfolio');
  await screenshot('e2e-05-portfolio-top');
  await page.getByTestId('add-area').click();
  await openSheet('حوزهٔ تازه');
  await page.locator('#area-title').fill('یادگیری');
  await page.locator('.emoji-picker button').nth(6).click();
  await page.getByRole('button', { name: 'ساختن حوزه', exact: true }).click();
  await toastContains('ساخته شد');
  await page.locator('.area-card').filter({ hasText: 'یادگیری' }).waitFor();
  ok('new area is created');
  await page.locator('.area-card').filter({ hasText: 'یادگیری' }).getByLabel('ویرایش یادگیری').click();
  await openSheet('ویرایش حوزه');
  await page.locator('#area-title').fill('یادگیری عمیق');
  await page.getByRole('button', { name: 'ذخیرهٔ تغییرات', exact: true }).click();
  await page.locator('.area-card').filter({ hasText: 'یادگیری عمیق' }).waitFor();
  ok('area can be edited');
  await screenshot('e2e-05-portfolio');

  await nav('plan');
  await page.locator('.filter-chip').filter({ hasText: 'امروز' }).click();
  await page.waitForTimeout(300);
  await page.locator('.filter-chip').filter({ hasText: 'فعال' }).click();
  const quickRow = page.locator('.task-row').filter({ hasText: 'تست کار سریع' }).first();
  await quickRow.waitFor();
  await quickRow.locator('.task-row-main').click();
  await openSheet('ویرایش کار');
  await screenshot('e2e-04a-task-editor');
  await page.locator('#task-title').fill('تست ویرایش شده');
  await page.getByRole('button', { name: 'ذخیره', exact: true }).click();
  await page.locator('.task-row').filter({ hasText: 'تست ویرایش شده' }).waitFor();
  ok('task can be edited');

  await page.getByRole('tab', { name: 'اهداف' }).click();
  await page.getByRole('button', { name: 'هدف تازه', exact: true }).click();
  await openSheet('هدف تازه');
  await page.locator('#goal-title').fill('هدف تستی');
  await page.locator('.sheet').getByRole('button', { name: 'افزودن', exact: true }).click();
  await page.locator('.milestone-editor-row input').fill('نقطهٔ عطف اول');
  await page.getByRole('button', { name: 'ساختن هدف', exact: true }).click();
  await page.locator('.goal-card').filter({ hasText: 'هدف تستی' }).waitFor();
  ok('goal with a milestone is created');
  await page.locator('.goal-card').filter({ hasText: 'هدف تستی' }).locator('.milestone-check').first().click();
  ok('milestone can be completed');

  await page.getByRole('tab', { name: 'آیین‌ها' }).click();
  await page.locator('.ritual-card').first().getByRole('button', { name: 'انجام شد', exact: true }).click();
  await page.getByTestId('reward-card').waitFor();
  await closeReward();
  ok('ritual can be completed');
  await page.getByRole('button', { name: 'آیین تازه', exact: true }).click();
  await openSheet('آیین تازه');
  await page.locator('#ritual-title').fill('آیین تستی');
  await page.getByRole('button', { name: 'ساختن آیین', exact: true }).click();
  await page.locator('.ritual-card').filter({ hasText: 'آیین تستی' }).waitFor();
  ok('ritual can be created');

  await page.getByRole('tab', { name: 'دفتر تصمیم' }).click();
  await page.getByRole('button', { name: 'تصمیم تازه', exact: true }).click();
  await openSheet('ثبت یک تصمیم');
  await page.locator('#decision-title').fill('تصمیم تستی');
  await page.locator('#decision-chosen').fill('گزینهٔ اول');
  await page.locator('#decision-alt').fill('گزینهٔ دوم\nگزینهٔ سوم');
  await page.getByRole('button', { name: 'ثبت در دفتر', exact: true }).click();
  await page.locator('.journal-card').filter({ hasText: 'تصمیم تستی' }).waitFor();
  ok('decision journal entry is saved');
  await screenshot('e2e-06-plan');

  await page.getByRole('tab', { name: 'کارها' }).click();
  await page.locator('.filter-chip').filter({ hasText: 'واگذارشده' }).click();
  await page.locator('.task-row').filter({ hasText: 'واگذار به سارا' }).waitFor();
  ok('delegated task is listed');
  await page.locator('.filter-chip').filter({ hasText: 'فعال' }).click();
  const archiveTarget = page.locator('.task-row').filter({ hasText: 'خرید نان تست' }).first();
  await archiveTarget.locator('.task-row-main').click();
  await openSheet('ویرایش کار');
  await page.getByRole('button', { name: 'کنار گذاشتن', exact: true }).click();
  await toastContains('کنار گذاشته شد');
  await page.locator('.filter-chip').filter({ hasText: 'بایگانی' }).click();
  await page.locator('.task-row').filter({ hasText: 'خرید نان تست' }).waitFor();
  await page.locator('.task-row').filter({ hasText: 'خرید نان تست' }).locator('.task-row-main').click();
  await openSheet('ویرایش کار');
  await page.getByRole('button', { name: 'بازگرداندن به برنامه', exact: true }).click();
  await toastContains('به برنامه برگشت');
  ok('archive and restore work');

  await nav('review');
  await page.locator('button[title="انرژی امروز: زیاد"]').click();
  await page.locator('#review-note').fill('فردا با یک قدم کوچک شروع می‌کنم.');
  await page.getByTestId('review-save').click();
  await page.locator('.saved-badge').waitFor();
  await toastContains('امروز بسته شد');
  ok('end-of-day review saves');
  await screenshot('e2e-07-review');

  await page.getByLabel('تنظیمات').click();
  await openSheet('تنظیمات');
  await screenshot('e2e-07a-settings');
  ok('settings sheet opens', await page.locator('#profile-name').isVisible());

  const downloadPromise = page.waitForEvent('download');
  await page.getByLabel('دانلود پشتیبان').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const downloadStat = downloadPath ? await stat(downloadPath) : null;
  ok(
    'backup export downloads a JSON file',
    Boolean(downloadStat && downloadStat.size > 1000) &&
      download.suggestedFilename().startsWith('rahyar-backup-'),
  );

  let imported = false;
  if (downloadPath) {
    const backup = JSON.parse(await readFile(downloadPath, 'utf8'));
    backup.profile.name = 'آرش واردشده';
    await page.locator('input[type="file"]').setInputFiles({
      name: 'rahyar-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await toastContains('بازیابی شدند');
    await page.locator('.sheet').filter({ hasText: 'تنظیمات' }).waitFor({ state: 'hidden' });
    imported = true;
    await nav('now');
    ok(
      'backup import restores the profile',
      (await page.locator('.page-title').innerText()).includes('آرش واردشده'),
    );
    await nav('review');
  }

  if (!imported) {
    await page.getByRole('button', { name: 'بستن', exact: true }).first().click();
    await page.locator('.sheet').filter({ hasText: 'تنظیمات' }).waitFor({ state: 'hidden' });
  }

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('review-save').waitFor();
  ok('state persists across reload', await page.locator('.saved-badge').isVisible());
  await page.evaluate(() => localStorage.setItem('rahyar.e2e', 'ok'));
  ok('local storage is available');

  // PWA / offline
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }
  });
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  ok('service worker controls the page', controlled);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.page-title').waitFor({ timeout: 15000 });
  ok('app works offline', (await page.locator('.page-title').innerText()).includes('مرور'));
  await context.setOffline(false);

  // Recovery mode on a later visit. initScript runs before the app boots on reload,
  // after the previous page has flushed its state.
  await page.goto(`${BASE}/#now`, { waitUntil: 'networkidle' });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('rahyar.recoveryTest')) return;
    const key = 'rahyar.state.v1';
    const raw = JSON.parse(localStorage.getItem(key));
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    raw.settings.lastVisit = day;
    raw.settings.recoveryDismissedOn = null;
    localStorage.setItem(key, JSON.stringify(raw));
    sessionStorage.setItem('rahyar.recoveryTest', '1');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.banner--recovery').waitFor();
  ok('recovery banner appears after days away');
  await screenshot('e2e-07b-recovery');
  await page.locator('.banner--recovery').getByRole('button', { name: 'بعداً', exact: true }).click();
  await page.locator('.banner--recovery').waitFor({ state: 'hidden' });
  ok('recovery banner can be dismissed');

  // Desktop visual pass
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/#now`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  ok('desktop rail is visible', await page.locator('.rail').isVisible());
  ok('desktop dock is hidden', !(await page.locator('.dock').isVisible()));
  await page.screenshot({ path: 'artifacts/e2e-08-desktop-now.png' });
  await page.getByTestId('rail-portfolio').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/e2e-09-desktop-portfolio.png' });
  await page.getByTestId('rail-advisor').click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'artifacts/e2e-10-desktop-advisor.png' });

  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(`${BASE}/#now`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  ok('no horizontal overflow at 320px', overflow <= 1, `overflow=${overflow}px`);
  await page.screenshot({ path: 'artifacts/e2e-12-small-now.png' });

  // Empty-state flow in a fresh profile
  const emptyContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
  });
  const emptyPage = await emptyContext.newPage();
  emptyPage.on('pageerror', (error) => errors.push(`empty pageerror: ${error.message}`));
  await emptyPage.goto(BASE, { waitUntil: 'networkidle' });
  await emptyPage.evaluate(() => localStorage.clear());
  await emptyPage.reload({ waitUntil: 'networkidle' });
  await emptyPage.locator('.demo-toggle').click();
  await emptyPage.getByTestId('onboarding-start').click();
  await emptyPage.locator('.hero--empty').waitFor();
  ok('clean start shows the empty state');
  await emptyPage.screenshot({ path: 'artifacts/e2e-11-empty-state.png' });
  await emptyPage.locator('.start-suggestion').first().click();
  await emptyPage.getByTestId('now-hero').waitFor();
  ok('starter suggestion creates the first task');
  await emptyContext.close();

  console.log('\nALL CHECKS PASSED');
  console.log(results.join('\n'));
  if (errors.length) {
    console.log('\nBROWSER ERRORS:');
    console.log(errors.join('\n'));
  }
  await browser.close();
} catch (error) {
  console.error('\nE2E FAILED:', error.message);
  console.error('BROWSER ERRORS:', errors);
  await page.screenshot({ path: 'artifacts/e2e-failure.png', fullPage: true }).catch(() => {});
  await browser.close();
  process.exitCode = 1;
}
