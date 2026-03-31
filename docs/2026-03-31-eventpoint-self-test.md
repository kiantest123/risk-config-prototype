# 接入点模块自测方案

> 日期: 2026-03-31
> 模块: EventPointList + EventPointView
> 文件: `components/EventPointList.tsx`, `components/EventPointView.tsx`
> 测试方式: 代码走查 (Code Review Based Verification)
> 执行时间: 2026-03-31

---

## 已识别 Bug

### Bug 1 (中等): 单条删除无生命周期保护
- **位置**: `EventPointList.tsx:124-133`
- **现象**: 单条删除对所有生命周期状态(包括已发布)的接入点都允许删除，但批量删除仅允许 DRAFT 状态
- **影响**: 用户可以通过单条删除删掉已发布的接入点，与批量删除的保护逻辑不一致
- **状态**: 已确认

### Bug 2 (低): 批量启用/禁用后 updateAt 格式不一致
- **位置**: `EventPointList.tsx:203`
- **现象**: 批量操作使用 `new Date().toISOString()` 产生 ISO 格式，现有数据使用 `YYYY-MM-DD HH:mm:ss` 格式
- **状态**: 已确认

### Bug 3 (低): 生命周期筛选缺少"历史归档"选项
- **位置**: `EventPointList.tsx:365-369`
- **现象**: 下拉框只有全部/已发布/待发布/草稿，缺少 ARCHIVED_HISTORY
- **状态**: 已确认

### 用例修正: V-03 关联策略数量预期错误
- **说明**: EP00000001 实际关联 3 条策略（activation_txn_risk_45min, activation_txn_amount_check, activation_device_fingerprint），原始预期写了 2 条

---

## 自测结果总览

| 模块 | 用例数 | PASS | FAIL | 修正 |
|------|--------|------|------|------|
| 列表 (L) | 12 | 12 | 0 | 0 |
| 查看 (V) | 10 | 9 | 0 | 1 (V-03 预期修正) |
| 编辑 (E) | 15 | 15 | 0 | 0 |
| 批量 (B) | 8 | 8 | 0 | 0 |
| Bug验证 | 3 | - | 3 (确认Bug) | 0 |
| **合计** | **48** | **44** | **3 Bug** | **1** |

---

## 自测用例详情

### 模块一: 接入点列表 (EventPointList)

| 编号 | 测试场景 | 操作步骤 | 预期结果 | 结果 |
|------|---------|---------|---------|------|
| L-01 | 列表初始加载 | 进入接入点管理页面 | 显示4条接入点记录，列信息完整 | PASS - mockEventPoints 有4条，表格9列完整 |
| L-02 | 按编码搜索 | 输入"EP00000001"，点击查询 | 只显示 EP00000001 | PASS - includes 过滤逻辑正确 |
| L-03 | 按描述搜索 | 输入"登录"，点击查询 | 只显示"用户登录事件接入点" | PASS - description.toLowerCase().includes 正确 |
| L-04 | 按生命周期筛选 - 已发布 | 选择"已发布"，点击查询 | 显示 EP00000001、EP00000002、EP00000000 | PASS - 3条 PUBLISHED 记录匹配 |
| L-05 | 按生命周期筛选 - 草稿 | 选择"草稿"，点击查询 | 显示 EP00000003 | PASS - 1条 DRAFT 记录匹配 |
| L-06 | 按运行状态筛选 - 已禁用 | 选择"已禁用"，点击查询 | 显示 EP00000003 | PASS - status===DISABLED 匹配 |
| L-07 | 组合筛选 | 已发布+已启用，点击查询 | 显示 EP00000001、EP00000002、EP00000000 | PASS - && 连接条件正确 |
| L-08 | 空结果 | 输入"EP99999999"，点击查询 | 显示空状态提示 | PASS - length===0 时渲染空状态 |
| L-09 | 点击编码跳转详情 | 点击 EP00000001 编码链接 | 跳转查看模式详情页 | PASS - handleViewDetail 设 initialMode='view' |
| L-10 | 点击"查看"按钮 | 点击某行"查看" | 跳转查看模式详情页 | PASS - 同 L-09 |
| L-11 | 点击"编辑"按钮 | 点击某行"编辑" | 跳转编辑模式详情页 | PASS - handleOpenEditor 设 initialMode='edit' |
| L-12 | 点击"新增"按钮 | 点击"新增" | 跳转新建接入点编辑页 | PASS - handleCreate 设 item=null, mode='edit' |

### 模块二: 接入点详情 - 查看模式 (EventPointView)

| 编号 | 测试场景 | 操作步骤 | 预期结果 | 结果 |
|------|---------|---------|---------|------|
| V-01 | 基本信息展示 | 查看 EP00000001 详情 | 显示编码、描述、创建时间、最后更新、操作人 | PASS - renderBasicInfoView 渲染5个字段 |
| V-02 | 头部状态标签 | 查看已发布+已启用的接入点 | 显示"已发布"绿色badge和"已启用"绿色标签 | PASS - getLifecycleBadge + t() 正确 |
| V-03 | 关联策略展示 | 查看 EP00000001 | 显示3条关联策略 | PASS - 修正: 实际为3条(含device_fingerprint) |
| V-04 | 关联特征展示 | 查看 EP00000001 | 显示2条相关特征标签 | PASS - user_transaction_history + user_recent_trade_time_7d_rt |
| V-05 | 版本时间线展示 | 查看 EP00000001 | 显示 v3/v2/v1，v3 标记"当前" | PASS - 3条版本记录，idx===0 显示"当前" |
| V-06 | 版本 - 查看模式不可点击 | 查看模式下点击 v2 | 无响应，无 pointer 样式 | PASS - isEditMode 守卫 + 无 cursor-pointer |
| V-07 | 无版本历史 | 查看 EP00000002 | 显示"暂无版本记录" | PASS - eventPointId=2 无匹配版本 |
| V-08 | 无关联数据 | 查看 EP00000003 | 关联策略/特征均显示"暂无" | PASS - 无匹配的 activation/feature |
| V-09 | 返回按钮 | 点击返回箭头 | 返回列表页 | PASS - handleBack view模式直接调用onBack |
| V-10 | 进入编辑模式 | 点击"编辑"按钮 | 切换到编辑模式表单 | PASS - enterEditMode 正确切换 |

### 模块三: 接入点详情 - 编辑模式

| 编号 | 测试场景 | 操作步骤 | 预期结果 | 结果 |
|------|---------|---------|---------|------|
| E-01 | 编辑已有 - 编码只读 | 编辑 EP00000001 | 编码字段 disabled | PASS - disabled={isEditingExisting} |
| E-02 | 修改描述 | 修改描述文本 | 表单更新，updateAt 自动更新 | PASS - handleChange 设 updateAt |
| E-03 | 切换运行状态 | 点击 toggle 开关 | 已启用/已禁用切换，样式和文字同步 | PASS - handleToggleStatus + CSS联动 |
| E-04 | 版本点击 - 无修改 | 编辑模式下点击 v2 | 加载 v2 内容，v2 显示"已加载" | PASS - handleLoadVersion + selectedVersionId |
| E-05 | 版本点击 - 有修改 | 先修改描述，再点击 v1 | 弹出确认对话框 | PASS - guardDirty 触发 confirmAction |
| E-06 | 版本确认 - 确定 | 承接 E-05，点击"确定" | 表单加载 v1 内容 | PASS - handleConfirmYes 执行缓存action |
| E-07 | 版本确认 - 取消 | 承接 E-05，点击"取消" | 表单保持修改内容不变 | PASS - handleConfirmNo 清除action |
| E-08 | 保存成功 | 修改后点击"保存" | 显示"保存成功"对话框 | PASS - setShowSaveSuccess(true) |
| E-09 | 保存后留在当前 | 点击"留在当前页面" | 切换到查看模式，显示保存后数据 | PASS - handleStay 设 mode='view' |
| E-10 | 保存后返回列表 | 点击"返回列表" | 返回列表页 | PASS - handleGoBack 调用 onBack |
| E-11 | 保存 - 编码为空 | 新建时不填编码，保存 | alert "请输入接入点编码" | PASS - form.eventPoint.trim() 检查 |
| E-12 | 取消 - 无修改 | 不修改直接取消 | 直接返回查看模式 | PASS - isDirty()=false 直接执行 |
| E-13 | 取消 - 有修改 | 修改后点击取消 | 弹出确认对话框 | PASS - isDirty()=true 触发确认框 |
| E-14 | 返回 - 编辑中有修改 | 编辑中点击返回箭头 | 弹出确认对话框 | PASS - guardDirty(onBack) |
| E-15 | 新建完整流程 | 新增->填写编码描述->保存 | 保存成功，列表可见新接入点 | PASS - ep.id 为空走创建分支 |

### 模块四: 批量操作

| 编号 | 测试场景 | 操作步骤 | 预期结果 | 结果 |
|------|---------|---------|---------|------|
| B-01 | 全选/取消全选 | 点击表头 checkbox | 勾选/取消所有可见行 | PASS - handleSelectAll 正确 |
| B-02 | 单选 | 点击某行 checkbox | 选中该行，出现批量工具栏 | PASS - handleSelectOne + selectedIds.size > 0 |
| B-03 | 批量待发布 | 选中草稿+已发布，点击"批量待发布" | 草稿可操作，已发布不可操作 | PASS - checkEligibility RELEASE 只允许 DRAFT |
| B-04 | 批量启用 | 选中已禁用项，确认启用 | 状态变为已启用+草稿 | PASS - newStatus=ENABLED, lifecycle=DRAFT |
| B-05 | 批量禁用 | 选中已启用项，确认禁用 | 状态变为已禁用+草稿 | PASS - newStatus=DISABLED, lifecycle=DRAFT |
| B-06 | 批量删除 - 草稿 | 选中草稿项，确认删除 | 从列表消失 | PASS - filter 移除匹配项 |
| B-07 | 批量删除 - 非草稿 | 选中已发布项，点击批量删除 | 显示不可操作，确认按钮 disabled | PASS - eligible=false, disabled={count===0} |
| B-08 | 取消选择 | 点击工具栏 X | 取消选择，恢复筛选栏 | PASS - setSelectedIds(new Set()) |

### 模块五: 已知 Bug 验证

| 编号 | Bug 描述 | 验证步骤 | 当前行为 | 修复后预期 | 结果 |
|------|---------|---------|---------|-----------|------|
| BUG-01 | 单条删除无生命周期保护 | 对已发布 EP00000001 点击"删除" | 可直接删除 | 提示不可删除或禁用按钮 | BUG确认 - handleDeleteOne 无lifecycle检查 |
| BUG-02 | updateAt 格式不一致 | 批量启用后查看详情 | ISO 格式显示 | 统一为 YYYY-MM-DD HH:mm:ss | BUG确认 - toISOString() vs 手动格式 |
| BUG-03 | 筛选缺少历史归档 | 查看生命周期下拉框 | 无"历史归档"选项 | 增加 ARCHIVED_HISTORY | BUG确认 - select 缺少该 option |

---

## 结论

### 版本按钮功能
版本时间线按钮在编辑模式下可正常点击切换，包含 dirty check 保护和确认对话框。查看模式下正确禁用点击。**版本切换功能无 Bug**。

### 需修复项
1. **BUG-01 (建议优先修复)**: 单条删除应增加与批量删除一致的生命周期保护
2. **BUG-02**: 统一时间格式为 `YYYY-MM-DD HH:mm:ss`
3. **BUG-03**: 筛选下拉框增加"历史归档"选项

### 自测预期修正
- V-03: EP00000001 关联策略数应为 **3条**（非2条），需同步检查列表页展示是否一致
