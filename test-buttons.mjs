import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 14'];
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const context = await browser.newContext({ ...iPhone });
const page = await context.newPage();

await page.goto('http://localhost:3000/fresh-graduate');
await page.waitForLoadState('networkidle');

// 输入薪资并计算
const salaryInput = page.locator('input[type="number"]').first();
await salaryInput.fill('15000');
await page.waitForTimeout(300);

const calcButton = page.locator('.fixed.bottom-0 button:has-text("开始评测")');
await calcButton.tap();
await page.waitForTimeout(1000);

// 截图看生活成本卡片
const card = page.locator('text=生活成本分析');
if (await card.count() > 0) {
  // 滚动到卡片位置
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-living-1-default.png', fullPage: true });
  console.log('Screenshot 1: default state (should be buy mode)');

  // 点击租房
  const rentBtn = page.locator('button:has-text("租房")');
  await rentBtn.first().tap();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-living-2-rent.png', fullPage: true });
  console.log('Screenshot 2: rent mode');

  // 切换到整租
  const sharedBtn = page.locator('button:has-text("合租")');
  await sharedBtn.tap();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-living-3-shared.png', fullPage: true });
  console.log('Screenshot 3: rent + shared');
}

await browser.close();
