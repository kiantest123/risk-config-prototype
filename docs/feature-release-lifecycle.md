# 风控特征配置与发布单逻辑说明

> 适用范围：`风控配置平台产品原型图` 原型。本文不讨论后端实现方式，仅面向产品和交互设计同学，帮助理解「特征 → 待发布清单 → 发布单」之间的逻辑关系以及字段含义。

## 1. 流程总览

1. **特征（Feature）** 是策略同学维护的核心实体，包含运行开关、计算口径、依赖、脚本等信息，一条特征可同时存在多个版本（草稿与线上）。
2. **待发布清单（Draft Pool / DraftItem）** 承载所有已经开发完成、待提交发布的变更对象。它是一个跨实体的“购物车”，支持特征、策略、规则等混合收集。
3. **发布单（ReleaseOrder）** 从待发布清单中挑选若干对象，形成一次性的发布批次，配套审批、审核意见与上线记录。

> 原型中的列表/抽屉/弹窗都以 `mockData.ts` + `types.ts` 定义的数据结构为基础，字段说明如下所述。

## 2. 核心实体与字段

### 2.1 Feature（特征定义）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 特征唯一 ID，列表与发布单引用此值。 |
| `name` | string | 英文唯一标识（如 `user_login_count_1h`），创建后不可改。 |
| `description` | string | 中文描述，供策略/运营快速理解业务含义。 |
| `status` | `FeatureStatus` | 运行态开关：`1-ENABLED` 表示线上执行，`2-DISABLED` 表示线上跳过计算。 |
| `lifecycleState` | `FeatureLifecycle` | 研发流程阶段，`DRAFT → READY → PUBLISHED → ARCHIVED`。决定是否能加入发布单。 |
| `type` | `FeatureType` | DirectStorage / HistoryStorage / Aggregation / OfflineStorage。驱动表单的字段展示。 |
| `writeSource` | `WriteSource` | REALTIME / ASYNC_BACKFILL / BOTH。描述值写入渠道。 |
| `valueType` | `FeatureValueType` | STRING / INTEGER / DOUBLE / LIST / JSON……用于校验规则比较方式。 |
| `eventPoints` | string[] | 触发该特征计算的接入点列表（如 `EP00000001`）。 |
| `dependentFeatures` | string[] | 依赖的其它特征名称，聚合/派生时由下拉选择。 |
| `conditionExpression` | ConditionExpression | 前置条件表达式，满足条件才执行计算。 |
| `compositeKeyJsonPaths` | string | JSON 串，描述复合键配置（维度字段 + 默认值）。 |
| `calculationConfig` | string | JSON 串，按特征类型存储计算 Schema（方法、窗口、来源字段等）。 |
| `includeCurrentEvent` | boolean | 聚合计算是否包含本次事件。 |
| `createAt/updateAt` | string | 创建/更新时间，展示在详情页，供溯源。 |
| `operator` | string | 最近一次修改人。 |

**状态限制：**
- `lifecycleState = DRAFT`：仅编辑者可见，可继续修改或复制，不可直接发布。
- `lifecycleState = READY`：表示自测完成，可被加入待发布清单或发布单。
- `lifecycleState = PUBLISHED`：线上版本，只读，编辑时会 fork 新草稿。

### 2.2 DraftItem（待发布清单条目）

DraftItem 用于承接“草稿→待发布”阶段的变更。它是一个轻量的清单，不包含所有特征字段，只保留发布所需信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 清单条目的唯一标识（如 `DFT-001`），便于前端 diff 与批量操作。 |
| `type` | `ReleaseType` | 对象类型，原型中常见的是 `FEATURE` 或 `POLICY`。 |
| `targetId` | string / number | 指向真实对象（如特征 ID、策略 ID）。 |
| `targetName` | string | 对象名称，展示在列表主列。 |
| `version` | string | 版本号，记录本次迭代的版本信息（如 `v4`）。 |
| `relatedKeys` | string | 关键检索字段，如事件点、Scope、FeatureName，方便筛选。 |
| `updatedAt` | string | 最近修改时间，用于排序 & 新鲜度提示。 |
| `editor` | string | 负责该条变更的编辑人。 |
| `changeSummary` | string | 对本次修改的说明，会同步到发布单中。 |

**来源：**
- 当特征进入 `READY` 状态时，点击“提交待发布”即可生成 DraftItem。
- 支持批量将多个草稿推入清单，便于一次性组建版本包。

### 2.3 ReleaseOrder（发布单）

发布单承载审批与上线记录，一个发布单可以包含多个 `ReleaseTarget` 项。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 发布单编号（如 `REL-20251101-003`），列表主键。 |
| `title` | string | 对本次发布的命名，出现在详情页标题。 |
| `items` | `ReleaseTarget[]` | 发布内容列表。单项字段：`type/targetId/targetName/changeSummary/relatedKeys`。 |
| `status` | `ReleaseStatus` | 发布单状态机：`PENDING → APPROVED → PUBLISHING → PUBLISHED`，或 `REJECTED/FAILED` 结束。 |
| `applicant` | string | 申请人，通常是策略或开发。 |
| `approver` | string | 审批人，审核通过后写入。 |
| `applyTime` | string | 提交时间。 |
| `finishTime` | string | 发布完成时间，仅成功后填充。 |
| `description` | string | 对本次发布背景/影响的详细说明。 |

**状态含义：**
- `PENDING`：待审核，审批操作区展示通过/驳回按钮。
- `APPROVED`：已审核，等待发布负责人执行上线。
- `PUBLISHING`：正在执行上线动作（原型中按钮进入 loading 状态）。
- `PUBLISHED`：上线完成，展示完成时间与成功提示。
- `REJECTED/FAILED`：审批驳回或发布失败，需重新提单。

## 3. 实体关系

```
Feature (草稿/已发布) --提交待发布--> DraftItem --选择条目--> ReleaseOrder.items --审批/发布--> 更新 Feature lifecycle/status
```

- **特征到待发布清单：** 仅当 `Feature.lifecycleState` 为 `READY`（或草稿提交待发布）时，才会生成 DraftItem。DraftItem 保存的是“准备发布的版本快照”描述，不再包含完整配置。
- **待发布清单到发布单：** 在 ReleaseOrderEditor 中勾选 DraftItem 或手动添加 `ReleaseTarget`。提交后 DraftItem 的 `changeSummary/relatedKeys` 被带入发布单内容卡片。
- **发布单回写：** 发布成功后，需要把涉及的 Feature 或 Policy 标记为 `PUBLISHED` 并记录 `finishTime`。如果发布失败，对应条目可回落到 DraftItem 继续调整。

## 4. 关键操作场景

1. **新增/编辑特征：** 在特征列表中点击“新增”或“编辑”。保存后特征默认为 `DRAFT`，仅编辑者可见。
2. **提交待发布：** 草稿通过自测后点击“提交待发布”，系统校验必填字段无误并生成 DraftItem。此时特征生命周期进入 `READY`。
3. **批量加入发布单：** 在“待发布清单”勾选多个 DraftItem，点击“创建发布单”进入 ReleaseOrderEditor，录入标题、背景、上线说明。
4. **审批/驳回：** 审批人在发布单详情页查看列表与 diff，填写审核意见后选择通过或驳回。驳回时 DraftItem 保留在清单中。
5. **执行发布：** 审批通过后，发布负责人点击“发布到线上”，状态进入 `PUBLISHING`，完成后标记为 `PUBLISHED` 并展示完成时间。

## 5. 原型主要入口对应关系

| 页面/组件 | 作用 | 关键信息 |
| --- | --- | --- |
| Feature 列表 (`FeatureList.tsx`) | 展示特征、筛选 `status` 与 `lifecycleState`，支持查看、编辑、启停、提交待发布。 | `Feature` 实体。 |
| 草稿池 / 待发布清单 (`ReleaseOrderManager` 顶部列表) | 罗列全部 DraftItem，支持搜索、批量勾选。 | `DraftItem` 字段展示 + 快速过滤。 |
| 发布单管理 (`ReleaseOrderManager.tsx`) | 包含发布单列表与详情、审核按钮、发布按钮。 | `ReleaseOrder` 及其 `items`。 |
| 发布单编辑器 (`ReleaseOrderEditor.tsx`) | 选择 DraftItem、输入发布信息、生成 `ReleaseOrder`。 | `ReleaseTarget` 组装逻辑。 |

## 6. 设计要点提示

- **选择策略**：特征、策略、规则在 DraftItem 中共用 `ReleaseType` 字段，UI 上需要用不同颜色/标签（参考 `getTypeBadge`）帮助区分。
- **依赖透出**：在发布单条目中要充分利用 `relatedKeys`（如事件点、Scope）提示影响范围，便于审批判断。
- **多版本可视化**：详情页需能快速切换 `PUBLISHED` 与最新 `DRAFT`，并展示 `changeSummary`，帮助审核人理解差异。
- **批量操作反馈**：批量提交/加入发布单后，应明确提示成功加入的条目数及失败原因（如生命周期不符合要求）。

本说明可直接提供给产品经理和交互设计，确保在原型阶段即理解实体关系与字段语义，后续交付技术实现时也有统一参照。 
