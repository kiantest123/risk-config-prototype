import { test } from '@playwright/test';

const BASE = 'http://localhost:5173';
const SHOTS = 'test-results/visual-shots';

async function goToEventPoints(page) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.locator('nav >> text=接入点管理').click();
  await page.waitForTimeout(500);
}

test('截图1: 接入点列表页', async ({ page }) => {
  await goToEventPoints(page);
  await page.screenshot({ path: `${SHOTS}/01-list.png`, fullPage: true });
});

test('截图2: EP00000001 查看模式详情页', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/02-view-detail.png`, fullPage: true });
});

test('截图3: EP00000001 编辑模式', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("编辑")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/03-edit-mode.png`, fullPage: true });
});

test('截图4: 编辑模式点击v2版本加载', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("编辑")');
  await page.waitForTimeout(300);
  await page.locator('span.font-mono:has-text("v2")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/04-version-v2-loaded.png`, fullPage: true });
});

test('截图5: 编辑模式修改后点击版本弹确认框', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("编辑")');
  await page.waitForTimeout(300);
  await page.locator('textarea').fill('测试修改');
  await page.locator('span.font-mono:has-text("v1")').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/05-dirty-confirm-dialog.png`, fullPage: true });
});

test('截图6: 运行状态toggle切换为已禁用', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("编辑")');
  await page.waitForTimeout(300);
  const toggle = page.locator('form').locator('button.rounded-full');
  await toggle.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/06-toggle-disabled.png`, fullPage: true });
});

test('截图7: 保存成功对话框', async ({ page }) => {
  await goToEventPoints(page);
  await page.locator('text=EP00000001').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("编辑")');
  await page.waitForTimeout(300);
  await page.locator('textarea').fill('保存测试');
  await page.click('button:has-text("保存")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/07-save-success.png`, fullPage: true });
});

test('截图8: 新建接入点页面', async ({ page }) => {
  await goToEventPoints(page);
  await page.click('button:has-text("新增")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/08-create-new.png`, fullPage: true });
});

test('截图9: 批量操作工具栏和模态框', async ({ page }) => {
  await goToEventPoints(page);
  const headerCheckbox = page.locator('thead input[type="checkbox"]');
  await headerCheckbox.check();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS}/09-batch-toolbar.png`, fullPage: true });
  await page.click('button:has-text("批量待发布")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/10-batch-modal.png`, fullPage: true });
});

test('截图10: EP00000003无关联数据+无版本', async ({ page }) => {
  await goToEventPoints(page);
  const rows = page.locator('tbody tr');
  await rows.nth(2).locator('button:has-text("查看")').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/11-ep3-empty.png`, fullPage: true });
});

test('截图11: BUG验证-单条删除已发布接入点弹confirm', async ({ page }) => {
  await goToEventPoints(page);
  page.on('dialog', async dialog => {
    await page.screenshot({ path: `${SHOTS}/12-bug01-delete-published.png` });
    await dialog.dismiss();
  });
  await page.locator('tbody tr').first().locator('button:has-text("删除")').click();
  await page.waitForTimeout(500);
});
