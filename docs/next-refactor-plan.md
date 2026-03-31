# 下一步重构：合并详情页与编辑页

## 背景

当前每个模块有三个独立组件：List、Detail、Editor。Detail 和 Editor 布局差异大，用户在"查看→编辑"之间切换时有割裂感。

## 目标

将 Detail 和 Editor 合并为一个 View 组件，通过 `mode: 'view' | 'edit'` 切换。用户感知是"同一个页面切了个开关"。

## 改动范围

以下 5 个模块都需要改造，改法一致：

### 1. 接入点（EventPoint）
- **删除** `EventPointDetail.tsx` 和 `EventPointEditor.tsx`
- **新建** `EventPointView.tsx`
- 接收 `mode: 'view' | 'edit'`
- 基本信息区域：view 模式渲染文本，edit 模式渲染输入框（同一个网格布局）
- 关联策略表格：始终只读展示
- 关联特征标签：始终只读展示
- 右侧版本时间线：始终可见，edit 模式下点击可加载历史内容到表单
- 顶部操作栏：view 模式显示"编辑"按钮，edit 模式显示"取消"/"保存"按钮

### 2. 策略（Activation）
- **删除** `ActivationDetail.tsx` 和 `ActivationEditor.tsx`
- **新建** `ActivationView.tsx`
- 同上结构，额外包含：
  - 风险阈值区域：view 模式渲染可视化色块，edit 模式渲染动态表格
  - 关联规则表格：始终只读展示

### 3. 规则（Rule）
- **删除** `RuleDetail.tsx` 和 `RuleEditor.tsx`
- **新建** `RuleView.tsx`
- 同上结构，额外包含：
  - 评分配置区域：view 模式渲染六格卡片，edit 模式渲染表单输入
  - 条件表达式：view 模式渲染只读树，edit 模式渲染可编辑树（复用 ConditionExpressionEditor）
  - 关联动作区域：view 模式渲染只读表格，edit 模式可增删动作并配置

### 4. 动作（Action）
- **删除** `ActionDetail.tsx` 和 `ActionEditor.tsx`
- **新建** `ActionView.tsx`
- 同上结构，额外包含：
  - configSchema 区域：view 模式渲染美化 JSON，edit 模式渲染 textarea
  - 关联规则表格：始终只读展示

### 5. 特征（Feature）
- **删除** `FeatureDetail.tsx` 和 `FeatureEditor.tsx`
- **新建** `FeatureView.tsx`
- 同上结构，额外包含：
  - 条件表达式：view/edit 模式切换
  - 计算配置：view/edit 模式切换
  - 复合键配置：view/edit 模式切换

## 统一布局模板

```
┌──────────────────────────────────────────────────────────┐
│ ← 返回   实体名称   [状态badges]           [操作按钮]     │
├──────────────────────────────────┬───────────────────────┤
│                                  │                       │
│  基本信息（view: 文本 / edit: 输入框）│  版本记录              │
│                                  │  ● v3 当前             │
│  模块特有区域                      │  ○ v2                 │
│  （阈值/评分/条件/动作等）           │  ○ v1 ← edit可点击加载  │
│                                  │                       │
│  关联实体（始终只读）               │                       │
│                                  │                       │
└──────────────────────────────────┴───────────────────────┘
```

## 对 List 组件的影响

- 去掉 `viewMode` 的 `'EDIT'` 值，改为 `'LIST' | 'VIEW'`
- View 组件内部管理自己的 view/edit 模式切换
- List 只负责：列表展示、进入 View、新建（直接进 View edit 模式）

## 实施顺序

1. 先改接入点（最简单）作为模板
2. 再改动作（较简单）
3. 改策略（中等）
4. 改规则（最复杂，有条件表达式编辑器和关联动作配置）
5. 最后改特征（最复杂，条件表达式+计算配置+复合键）
