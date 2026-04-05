# 特征类型配置字段补全设计

**日期：** 2026-04-05
**范围：** 特征管理 — 编辑页 & 详情页

---

## 背景

当前前端原型支持 4 种特征类型（DirectStorage、HistoryStorage、Aggregation、OfflineStorage），但存在以下问题：

1. **完全缺失**：StatefulStorage、ExternalDataSource 未实现
2. **字段缺失**：已实现的 4 种类型均有字段遗漏
3. **详情页**：calculationConfig 以原始 JSON 字符串直接渲染，不可读

后端支持的 6 种有效类型（BUCKET_AGGREGATION 和 DERIVED 为废弃状态，不实现）：
- DIRECT_STORAGE
- HISTORY_STORAGE
- AGGREGATION
- STATEFUL_STORAGE
- OFFLINE_STORAGE
- EXTERNAL_DATA_SOURCE

---

## 设计决策

### 架构：按类型拆分独立子组件

新增目录 `components/feature-configs/`，每种类型对应一个配置子组件：

```
components/feature-configs/
  DirectStorageConfig.tsx
  HistoryStorageConfig.tsx
  AggregationConfig.tsx
  StatefulStorageConfig.tsx
  OfflineStorageConfig.tsx
  ExternalDataSourceConfig.tsx
```

**原因：** FeatureEditor 已达 1160 行，将 StatefulStorage 的动态列表和 ExternalDataSource 的 Map 编辑器继续塞入会导致难以维护。独立子组件每个类型逻辑隔离清晰。

**统一接口：**
```tsx
interface FeatureConfigProps {
  config: Record<string, any>        // calculationConfig 解析后的对象
  onChange: (config: Record<string, any>) => void
  readOnly?: boolean                 // 详情页传 true
}
```

### 详情页：复用编辑页布局，只读模式

详情页传入 `readOnly={true}`，子组件将所有输入控件替换为静态展示：
- 文本输入 → `<span>`，空值显示 `—`
- 下拉选择 → Tag 徽标样式
- 复选框 → ✓ / ✗
- 动态列表 → 同样渲染每条卡片，字段只读，无添加/删除按钮
- 内联表格 → 纯展示，无操作列

---

## 各类型字段设计

### DirectStorageConfig（补 1 个字段）

| 字段 | 控件 | 说明 |
|------|------|------|
| valueJsonPath | 文本输入 | 值提取路径 |
| ttlSeconds | 数字输入 | TTL（秒） |
| writeMode | 下拉 | ALWAYS / SET_IF_ABSENT / INCREMENT / DECREMENT |

### HistoryStorageConfig（存储模式切换 + 补 3 个字段）

模式选择器：**卡片式大按钮**（固定容量 / 时间窗口），选中蓝色高亮边框。

| 字段 | 控件 | 显示条件 |
|------|------|---------|
| historySize | 数字输入 | 仅固定容量模式 |
| timeWindowSeconds | 数字输入 | 仅时间窗口模式 |
| timestampJsonPath | 文本输入（选填） | 仅时间窗口模式，空=系统时间 |
| valueJsonPath | 文本输入 | 始终显示 |
| ttlSeconds | 数字输入 | 始终显示 |
| writeMode | 下拉：ALWAYS / SET_IF_ABSENT | 始终显示 |

### AggregationConfig（补 1 个字段）

| 字段 | 控件 | 说明 |
|------|------|------|
| method | 下拉 | COUNT/SUM/AVG/MIN/MAX/VARIANCE/STDDEV/DISTINCT_COUNT/MEDIAN/PERCENTILE_95/PERCENTILE_99/RATE/FIRST/LAST/RANGE |
| sourceFeatureName | 文本输入 | 来源 HistoryStorage 特征名 |
| timeWindowSeconds | 数字输入 | 时间窗口（秒），空=全量聚合 |
| timestampJsonPath | 文本输入（选填） | 时间戳路径，空=系统时间 |

### StatefulStorageConfig（全新）

顶层字段：

| 字段 | 控件 | 说明 |
|------|------|------|
| ttlSeconds | 数字输入 | Redis Key TTL（秒），默认 172800，每次 ENTER/EXIT 刷新 |

transitions 动态列表（可添加/删除，B方案）：

每条卡片字段：

| 字段 | 控件 | 说明 |
|------|------|------|
| type | 下拉：ENTER / EXIT | 切换时联动 valueJsonPath 显示/隐藏 |
| conditionScript | 文本输入 | 触发条件 Groovy 脚本 |
| idJsonPath | 文本输入 | 业务唯一 ID 路径（Hash field key） |
| valueJsonPath | 文本输入 | 金额/数值路径，**仅 ENTER 显示** |

底部 `[+ 添加转换]` 虚线按钮。

### OfflineStorageConfig（补 5 个字段）

| 字段 | 控件 | 说明 |
|------|------|------|
| writeMode | 下拉：ALWAYS / SET_IF_ABSENT | 写入模式 |
| sourceTable | 文本输入 | 来源表名（已有） |
| sourceColumn | 文本输入 | 来源字段（已有） |
| entityIdColumn | 文本输入 | 主键列（已有） |
| datePartitionColumn | 文本输入 | 日期分区列名 |
| datePartitionValueStrategy | 下拉：TODAY / YESTERDAY | 分区日期取值策略 |
| datePartitionFormat | 下拉：YYYY_MM_DD / YYYYMMDD / YYYY_MM / YYYYMM | 分区日期格式 |
| datePartitionFallbackDays | 数字输入 | 分区缺失时回退天数 |

### ExternalDataSourceConfig（全新，平铺 + 内联表格）

基础字段：

| 字段 | 控件 | 说明 |
|------|------|------|
| protocol | 下拉：dubbo / http | 切换后 protocolConfig 区块联动 |
| method | 文本输入 | 方法名或 HTTP 子路径 |

protocolConfig 区块（protocol=dubbo）：

| 字段 | 控件 | 说明 |
|------|------|------|
| interface | 文本输入 | Dubbo 接口全限定名 |
| retries | 数字输入 | 重试次数 |

protocolConfig 区块（protocol=http）：

| 字段 | 控件 | 说明 |
|------|------|------|
| url | 文本输入 | HTTP 地址 |
| httpMethod | 下拉：GET / POST | 请求方式 |
| connectTimeoutMs | 数字输入 | 连接超时（ms） |

Map 字段（内联表格，可增删行）：

| 字段 | 说明 |
|------|------|
| paramMapping | 参数名 → riskFact JsonPath |
| constants | key → 常量值 |

其他字段：

| 字段 | 控件 | 说明 |
|------|------|------|
| resultPath | 文本输入 | 结果提取路径 |
| timeoutMs | 数字输入 | 调用超时（ms），默认 5000 |
| fallbackValue | 文本输入 | 降级值，超时/异常时返回 |
| retryOnError | 复选框 | 异常时重试一次，默认 false |

---

## 类型下拉 & 列表页图标

新增两个类型选项：

| 类型 | 图标（lucide-react） | 中文名 |
|------|---------------------|--------|
| StatefulStorage | `Repeat2` | 状态存储特征 |
| ExternalDataSource | `Globe` | 外部数据源特征 |

现有图标：Zap（Direct）、Clock（History）、Layers（Aggregation）、Database（Offline）

---

## 不在本次范围内

- BUCKET_AGGREGATION、DERIVED（已废弃，不实现）
- Mock 数据新增示例特征（可选，实施时酌情添加）
- 表单校验逻辑（当前原型无校验，维持现状）
