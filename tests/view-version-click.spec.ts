import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const SHOTS = 'test-results/visual-shots';

async function goToEventPoints(page) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.locator('nav >> text=接入点管理').click();
  await page.waitForTimeout(500);
}

test.describe('查看模式版本切换', () => {

  test('查看模式下点击v2 - 内容切换+截图', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);

    // 确认处于查看模式
    await expect(page.locator('button:has-text("编辑")')).toBeVisible();

    // 确认初始描述
    await expect(page.locator('text=用户交易事件接入点').first()).toBeVisible();

    // 截图: 初始查看模式
    await page.screenshot({ path: `${SHOTS}/fix-01-view-before.png`, fullPage: true });

    // 点击 v2 版本
    await page.locator('span.font-mono:has-text("v2")').click();
    await page.waitForTimeout(500);

    // 截图: 点击v2后
    await page.screenshot({ path: `${SHOTS}/fix-02-view-v2-clicked.png`, fullPage: true });

    // 验证: v2 显示"已加载"标签
    await expect(page.locator('text=已加载')).toBeVisible();

    // 验证: 描述内容应切换为 v2 的内容
    await expect(page.locator('text=用户交易事件接入点（旧版）').first()).toBeVisible();
  });

  test('查看模式下点击v1 - 切换到最早版本', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);

    // 点击 v1
    await page.locator('span.font-mono:has-text("v1")').click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SHOTS}/fix-03-view-v1-clicked.png`, fullPage: true });

    // 验证 v1 内容
    await expect(page.locator('text=已加载')).toBeVisible();
    await expect(page.locator('text=交易事件接入点（初始版）').first()).toBeVisible();
  });

  test('查看模式切换版本后点编辑 - 基于当前版本', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);

    // 点击 v2
    await page.locator('span.font-mono:has-text("v2")').click();
    await page.waitForTimeout(500);

    // 进入编辑模式
    await page.click('button:has-text("编辑")');
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${SHOTS}/fix-04-edit-after-view-v2.png`, fullPage: true });

    // 编辑模式的 textarea 应包含 v2 的描述
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue('用户交易事件接入点（旧版）');
  });

  test('版本时间线有 cursor-pointer 样式', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);

    // 查看模式下版本项应有 cursor-pointer
    // 版本项的容器 div 应有 cursor-pointer
    const versionItem = page.locator('.cursor-pointer:has(span.font-mono:has-text("v2"))');
    await expect(versionItem).toHaveCount(1);
  });
});
