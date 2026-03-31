import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';

// 导航到接入点管理页
async function goToEventPoints(page) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  // 菜单默认已展开，直接点击子菜单项
  await page.locator('nav >> text=接入点管理').click();
  await page.waitForTimeout(500);
}

// ============================================================
// 模块一: 接入点列表
// ============================================================

test.describe('模块一: 接入点列表', () => {

  test('L-01 列表初始加载 - 显示4条记录', async ({ page }) => {
    await goToEventPoints(page);
    // 初始未点击查询，appliedFilters 为空字符串，应显示全部
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(4);
  });

  test('L-02 按编码搜索', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('input[placeholder="输入编码"]').fill('EP00000001');
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('EP00000001');
  });

  test('L-03 按描述搜索', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('input[placeholder="输入描述关键词"]').fill('登录');
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('用户登录事件接入点');
  });

  test('L-04 按生命周期筛选 - 已发布', async ({ page }) => {
    await goToEventPoints(page);
    // 选择生命周期下拉框
    const lifecycleSelect = page.locator('select').first();
    await lifecycleSelect.selectOption('PUBLISHED');
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3);
  });

  test('L-05 按生命周期筛选 - 草稿', async ({ page }) => {
    await goToEventPoints(page);
    const lifecycleSelect = page.locator('select').first();
    await lifecycleSelect.selectOption('DRAFT');
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('EP00000003');
  });

  test('L-06 按运行状态筛选 - 已禁用', async ({ page }) => {
    await goToEventPoints(page);
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('2'); // FeatureStatus.DISABLED = 2
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('EP00000003');
  });

  test('L-07 组合筛选 - 已发布+已启用', async ({ page }) => {
    await goToEventPoints(page);
    const lifecycleSelect = page.locator('select').first();
    await lifecycleSelect.selectOption('PUBLISHED');
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('1'); // FeatureStatus.ENABLED = 1
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(3);
  });

  test('L-08 空结果', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('input[placeholder="输入编码"]').fill('EP99999999');
    await page.click('button:has-text("查询")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=暂无符合条件的接入点')).toBeVisible();
  });

  test('L-09 点击编码跳转详情(查看模式)', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    // 应进入查看模式 - 有"编辑"按钮
    await expect(page.locator('button:has-text("编辑")')).toBeVisible();
    // 显示基本信息 (view/edit 两份同时存在用 opacity 切换，取第一个)
    await expect(page.locator('text=基本信息').first()).toBeVisible();
  });

  test('L-10 点击"查看"操作按钮', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('button:has-text("查看")').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("编辑")')).toBeVisible();
  });

  test('L-11 点击"编辑"操作按钮', async ({ page }) => {
    await goToEventPoints(page);
    // 列表中的"编辑"按钮
    const editButtons = page.locator('td button:has-text("编辑")');
    await editButtons.first().click();
    await page.waitForTimeout(500);
    // 应进入编辑模式 - 有"保存"和"取消"按钮
    await expect(page.locator('button:has-text("保存")')).toBeVisible();
    await expect(page.locator('button:has-text("取消")')).toBeVisible();
  });

  test('L-12 点击"新增"按钮', async ({ page }) => {
    await goToEventPoints(page);
    await page.click('button:has-text("新增")');
    await page.waitForTimeout(500);
    // 应显示"新建接入点"标题
    await expect(page.locator('text=新建接入点')).toBeVisible();
    // 编码输入框应为空且可编辑
    const codeInput = page.locator('input[placeholder*="唯一编码"]');
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toBeEnabled();
  });
});

// ============================================================
// 模块二: 接入点详情 - 查看模式
// ============================================================

test.describe('模块二: 查看模式', () => {

  test('V-01 基本信息展示', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=基本信息').first()).toBeVisible();
    await expect(page.locator('text=接入点编码').first()).toBeVisible();
    await expect(page.locator('text=描述').first()).toBeVisible();
    await expect(page.locator('text=创建时间')).toBeVisible();
    await expect(page.locator('text=最后更新')).toBeVisible();
    await expect(page.locator('text=操作人')).toBeVisible();
  });

  test('V-02 头部状态标签', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    // 头部应包含"已发布"和"已启用"标签
    await expect(page.locator('h2:has-text("EP00000001")')).toBeVisible();
    await expect(page.locator('h2 >> text=已发布')).toBeVisible();
    await expect(page.locator('h2 >> text=已启用')).toBeVisible();
  });

  test('V-03 关联策略展示 - EP00000001 有3条', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    // 关联策略区域
    await expect(page.locator('text=关联策略')).toBeVisible();
    // 应有3条策略记录
    const strategyRows = page.locator('table').nth(1).locator('tbody tr');
    // nth(1) 可能不准确，用文字定位
    await expect(page.locator('text=activation_txn_risk_45min')).toBeVisible();
    await expect(page.locator('text=activation_txn_amount_check')).toBeVisible();
    await expect(page.locator('text=activation_device_fingerprint')).toBeVisible();
  });

  test('V-04 关联特征展示', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=关联特征')).toBeVisible();
    await expect(page.locator('text=user_transaction_history')).toBeVisible();
    await expect(page.locator('text=user_recent_trade_time_7d_rt')).toBeVisible();
  });

  test('V-05 版本时间线展示', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=版本记录')).toBeVisible();
    await expect(page.getByText('v3', { exact: true })).toBeVisible();
    await expect(page.getByText('v2', { exact: true })).toBeVisible();
    await expect(page.getByText('v1', { exact: true })).toBeVisible();
    // v3 应标记"当前"
    await expect(page.locator('text=当前').first()).toBeVisible();
  });

  test('V-06 查看模式版本不可点击', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    // 版本区域的 v2 - 查看模式下点击不应有cursor-pointer
    const v2Item = page.locator('span:has-text("v2")').first();
    const parentDiv = v2Item.locator('..');
    // 查看模式下不应有 cursor-pointer 类
    const classAttr = await parentDiv.locator('..').getAttribute('class') || '';
    expect(classAttr).not.toContain('cursor-pointer');
  });

  test('V-07 无版本历史', async ({ page }) => {
    await goToEventPoints(page);
    // 找到 EP00000002 行并点击查看
    await page.locator('button:has-text("查看")').nth(1).click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=暂无版本记录')).toBeVisible();
  });

  test('V-08 无关联数据 - EP00000003', async ({ page }) => {
    await goToEventPoints(page);
    // EP00000003 是第3行
    const rows = page.locator('tbody tr');
    await rows.nth(2).locator('button:has-text("查看")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=暂无关联策略')).toBeVisible();
    await expect(page.locator('text=暂无关联特征')).toBeVisible();
  });

  test('V-09 返回按钮', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    // 点击返回箭头按钮
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
    await page.waitForTimeout(500);
    // 应回到列表 - 能看到"新增"和"查询"按钮
    await expect(page.locator('button:has-text("查询")')).toBeVisible();
  });

  test('V-10 进入编辑模式', async ({ page }) => {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    await page.click('button:has-text("编辑")');
    await page.waitForTimeout(300);
    // 应切换到编辑模式
    await expect(page.locator('button:has-text("保存")')).toBeVisible();
    await expect(page.locator('button:has-text("取消")')).toBeVisible();
    await expect(page.locator('text=编辑中')).toBeVisible();
  });
});

// ============================================================
// 模块三: 编辑模式
// ============================================================

test.describe('模块三: 编辑模式', () => {

  // 进入 EP00000001 编辑模式的 helper
  async function enterEditMode(page) {
    await goToEventPoints(page);
    await page.locator('text=EP00000001').first().click();
    await page.waitForTimeout(500);
    await page.click('button:has-text("编辑")');
    await page.waitForTimeout(300);
  }

  test('E-01 编辑已有 - 编码只读', async ({ page }) => {
    await enterEditMode(page);
    const codeInput = page.locator('input[value="EP00000001"]');
    await expect(codeInput).toBeDisabled();
  });

  test('E-02 修改描述', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('修改后的描述');
    await expect(textarea).toHaveValue('修改后的描述');
  });

  test('E-03 切换运行状态', async ({ page }) => {
    await enterEditMode(page);
    // 找到 toggle 按钮
    // Toggle 是 form 内的 inline-flex h-6 w-11 rounded-full 按钮
    const formArea = page.locator('form');
    const toggle = formArea.locator('button.rounded-full');
    // 初始应为 ENABLED
    await expect(formArea.locator('text=已启用')).toBeVisible();
    await toggle.click();
    await page.waitForTimeout(200);
    await expect(formArea.locator('text=已禁用')).toBeVisible();
    // 再点一次回到已启用
    await toggle.click();
    await page.waitForTimeout(200);
    await expect(formArea.locator('text=已启用')).toBeVisible();
  });

  test('E-04 版本点击 - 无修改直接加载', async ({ page }) => {
    await enterEditMode(page);
    // 点击 v2 版本
    const v2 = page.locator('span.font-mono:has-text("v2")');
    await v2.click();
    await page.waitForTimeout(300);
    // 应显示"已加载"标签
    await expect(page.locator('text=已加载')).toBeVisible();
    // 描述应变为 v2 的内容
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue('用户交易事件接入点（旧版）');
  });

  test('E-05 版本点击 - 有修改弹确认框', async ({ page }) => {
    await enterEditMode(page);
    // 先修改描述
    const textarea = page.locator('textarea');
    await textarea.fill('我修改了描述');
    await page.waitForTimeout(100);
    // 再点击 v1
    const v1 = page.locator('span.font-mono:has-text("v1")');
    await v1.click();
    await page.waitForTimeout(300);
    // 应弹出确认框
    await expect(page.locator('text=有未保存的修改，确定要放弃吗？')).toBeVisible();
  });

  test('E-06 版本确认 - 确定放弃修改', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('我修改了描述');
    await page.waitForTimeout(100);
    const v1 = page.locator('span.font-mono:has-text("v1")');
    await v1.click();
    await page.waitForTimeout(300);
    // 点击"确定"
    await page.locator('.fixed button:has-text("确定")').click();
    await page.waitForTimeout(300);
    // 描述应变为 v1 内容
    await expect(textarea).toHaveValue('交易事件接入点（初始版）');
  });

  test('E-07 版本确认 - 取消保留修改', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('我修改了描述');
    await page.waitForTimeout(100);
    const v1 = page.locator('span.font-mono:has-text("v1")');
    await v1.click();
    await page.waitForTimeout(300);
    // 点击"取消"
    await page.locator('.fixed button:has-text("取消")').click();
    await page.waitForTimeout(300);
    // 描述应保持修改内容
    await expect(textarea).toHaveValue('我修改了描述');
  });

  test('E-08 保存成功', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('保存测试描述');
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(300);
    // 应显示保存成功对话框
    await expect(page.getByRole('heading', { name: '保存成功' })).toBeVisible();
    await expect(page.locator('text=接入点已保存成功。')).toBeVisible();
  });

  test('E-09 保存后留在当前页面', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('保存测试描述');
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("留在当前页面")');
    await page.waitForTimeout(300);
    // 应切换到查看模式
    await expect(page.locator('button:has-text("编辑")')).toBeVisible();
    // 描述应已更新
    await expect(page.locator('text=保存测试描述').first()).toBeVisible();
  });

  test('E-10 保存后返回列表', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('保存返回测试');
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("返回列表")');
    await page.waitForTimeout(300);
    // 应回到列表
    await expect(page.locator('button:has-text("查询")')).toBeVisible();
  });

  test('E-11 保存 - 编码为空', async ({ page }) => {
    await goToEventPoints(page);
    await page.click('button:has-text("新增")');
    await page.waitForTimeout(500);
    // 不填编码直接保存
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('请输入接入点编码');
      await dialog.accept();
    });
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(300);
  });

  test('E-12 取消 - 无修改直接返回查看模式', async ({ page }) => {
    await enterEditMode(page);
    // 不做修改直接取消
    await page.click('button:has-text("取消")');
    await page.waitForTimeout(300);
    // 应直接返回查看模式，不弹确认框
    await expect(page.locator('button:has-text("编辑")')).toBeVisible();
  });

  test('E-13 取消 - 有修改弹确认框', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('修改了');
    await page.click('button:has-text("取消")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=有未保存的修改，确定要放弃吗？')).toBeVisible();
  });

  test('E-14 返回按钮 - 编辑中有修改弹确认框', async ({ page }) => {
    await enterEditMode(page);
    const textarea = page.locator('textarea');
    await textarea.fill('修改了');
    // 点击返回箭头
    await page.locator('button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=有未保存的修改，确定要放弃吗？')).toBeVisible();
  });

  test('E-15 新建完整流程', async ({ page }) => {
    await goToEventPoints(page);
    await page.click('button:has-text("新增")');
    await page.waitForTimeout(500);
    // 填写编码
    await page.locator('input[placeholder*="唯一编码"]').fill('EP00000099');
    // 填写描述
    await page.locator('textarea').fill('自测新建的接入点');
    // 保存
    await page.click('button:has-text("保存")');
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: '保存成功' })).toBeVisible();
    // 返回列表
    await page.click('button:has-text("返回列表")');
    await page.waitForTimeout(300);
    // 列表应有5条记录
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(5);
  });
});

// ============================================================
// 模块四: 批量操作
// ============================================================

test.describe('模块四: 批量操作', () => {

  test('B-01 全选/取消全选', async ({ page }) => {
    await goToEventPoints(page);
    const headerCheckbox = page.locator('thead input[type="checkbox"]');
    await headerCheckbox.check();
    await page.waitForTimeout(200);
    // 所有行的 checkbox 应被选中
    const bodyCheckboxes = page.locator('tbody input[type="checkbox"]');
    const count = await bodyCheckboxes.count();
    expect(count).toBe(4);
    for (let i = 0; i < count; i++) {
      await expect(bodyCheckboxes.nth(i)).toBeChecked();
    }
    // 应显示"已选 4 项"
    await expect(page.locator('text=已选 4 项')).toBeVisible();
    // 取消全选
    await headerCheckbox.uncheck();
    await page.waitForTimeout(200);
    await expect(page.locator('text=已选')).not.toBeVisible();
  });

  test('B-02 单选', async ({ page }) => {
    await goToEventPoints(page);
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.waitForTimeout(200);
    await expect(page.locator('text=已选 1 项')).toBeVisible();
    // 应显示批量操作工具栏
    await expect(page.locator('text=批量待发布')).toBeVisible();
    await expect(page.locator('text=批量启用')).toBeVisible();
    await expect(page.locator('text=批量禁用')).toBeVisible();
    await expect(page.locator('text=批量删除')).toBeVisible();
  });

  test('B-03 批量待发布 - 草稿可操作/已发布不可操作', async ({ page }) => {
    await goToEventPoints(page);
    // 全选
    const headerCheckbox = page.locator('thead input[type="checkbox"]');
    await headerCheckbox.check();
    await page.waitForTimeout(200);
    // 点击"批量待发布"
    await page.click('button:has-text("批量待发布")');
    await page.waitForTimeout(300);
    // 模态框应显示
    await expect(page.locator('text=批量提交待发布确认')).toBeVisible();
    // EP00000003(草稿)应显示"可操作"
    await expect(page.locator('text=可操作')).toBeVisible();
    // 其他应显示"非草稿状态"
    const ineligibleTexts = page.locator('text=非草稿状态');
    expect(await ineligibleTexts.count()).toBeGreaterThanOrEqual(3);
  });

  test('B-04 批量启用', async ({ page }) => {
    await goToEventPoints(page);
    // 选中 EP00000003 (第3行，已禁用)
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.nth(2).check();
    await page.waitForTimeout(200);
    await page.click('button:has-text("批量启用")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=批量启用确认')).toBeVisible();
    await expect(page.locator('text=可操作')).toBeVisible();
    // 确认启用
    await page.click('button:has-text("确认启用")');
    await page.waitForTimeout(300);
    // 应显示成功结果
    await expect(page.locator('.fixed >> text=成功')).toBeVisible();
  });

  test('B-07 批量删除 - 非草稿不可操作', async ({ page }) => {
    await goToEventPoints(page);
    // 只选中 EP00000001 (已发布)
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    await checkboxes.first().check();
    await page.waitForTimeout(200);
    await page.click('button:has-text("批量删除")');
    await page.waitForTimeout(300);
    await expect(page.locator('text=批量删除确认')).toBeVisible();
    // 确认按钮应被禁用
    const confirmBtn = page.locator('.fixed button:has-text("确认删除")');
    await expect(confirmBtn).toBeDisabled();
  });

  test('B-08 取消选择', async ({ page }) => {
    await goToEventPoints(page);
    const firstCheckbox = page.locator('tbody input[type="checkbox"]').first();
    await firstCheckbox.check();
    await page.waitForTimeout(200);
    await expect(page.locator('text=已选 1 项')).toBeVisible();
    // 点击 X 按钮取消
    await page.locator('.lucide-x').first().click();
    await page.waitForTimeout(200);
    // 工具栏应消失
    await expect(page.locator('text=已选')).not.toBeVisible();
    // 筛选栏应恢复
    await expect(page.locator('button:has-text("查询")')).toBeVisible();
  });
});

// ============================================================
// 模块五: Bug 验证
// ============================================================

test.describe('模块五: Bug 验证', () => {

  test('BUG-01 单条删除无生命周期保护', async ({ page }) => {
    await goToEventPoints(page);
    // EP00000001 是已发布状态，不应该能直接删除
    page.on('dialog', async dialog => {
      // 如果弹出的是 confirm 而不是"不可删除"的提示，说明 bug 存在
      expect(dialog.message()).toContain('确定要删除');
      await dialog.dismiss(); // 点取消，不要真删
    });
    const deleteBtn = page.locator('tbody tr').first().locator('button:has-text("删除")');
    await deleteBtn.click();
    await page.waitForTimeout(300);
    // BUG确认: 已发布的接入点可弹出删除确认框
    // 修复后预期: 应弹出"非草稿状态不可删除"或按钮不可用
  });

  test('BUG-03 筛选缺少历史归档选项', async ({ page }) => {
    await goToEventPoints(page);
    const lifecycleSelect = page.locator('select').first();
    const options = lifecycleSelect.locator('option');
    const optionTexts: string[] = [];
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      optionTexts.push(await options.nth(i).innerText());
    }
    // BUG确认: 不包含"历史归档"选项
    expect(optionTexts).not.toContain('历史归档');
    // 修复后预期: 应包含"历史归档"
  });
});
