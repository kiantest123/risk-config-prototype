# EventPoint 详情页与编辑页合并设计

## 背景

当前 EventPoint 模块有三个独立组件：`EventPointList`、`EventPointDetail`、`EventPointEditor`。Detail 和 Editor 布局差异大（Detail 是多卡片只读展示，Editor 是单卡片表单），用户在"查看 -> 编辑"之间切换时有割裂感。

## 目标

将 `EventPointDetail` 和 `EventPointEditor` 合并为一个 `EventPointView` 组件，通过 `mode: 'view' | 'edit'` 内部状态切换。用户感知是同一个页面切了个开关。

## 改动范围

### 新建

- `components/EventPointView.tsx`

### 删除

- `components/EventPointDetail.tsx`
- `components/EventPointEditor.tsx`

### 修改

- `components/EventPointList.tsx` — viewMode 从 `'LIST' | 'DETAIL' | 'EDIT'` 简化为 `'LIST' | 'VIEW'`

## EventPointView 组件接口

```typescript
interface EventPointViewProps {
  item: EventPoint | null;        // null = 新建
  initialMode: 'view' | 'edit';   // List 告知初始模式
  onBack: () => void;             // 返回列表
  onSave: (ep: EventPoint) => EventPoint; // 保存回调，返回保存后的实体
}
```

## 统一布局

```
┌──────────────────────────────────────────────────────────┐
│ ← 返回   EP00000001  [草稿] [启用]     [编辑] / [取消][保存] │
│          描述文字(view模式)                                │
├──────────────────────────────────┬───────────────────────┤
│ ┌─ 基本信息 ─────────────────┐  │  版本记录              │
│ │ view: 2列网格文本展示       │  │  ● v3 当前             │
│ │ edit: 纵向表单输入          │  │  ○ v2 (edit可点击)     │
│ └────────────────────────────┘  │  ○ v1 (edit可点击)     │
│                                  │                       │
│ ┌─ 关联策略 (始终只读) ──────┐  │                       │
│ │ 表格展示                   │  │                       │
│ └────────────────────────────┘  │                       │
│                                  │                       │
│ ┌─ 关联特征 (始终只读) ──────┐  │                       │
│ │ 标签展示                   │  │                       │
│ └────────────────────────────┘  │                       │
└──────────────────────────────────┴───────────────────────┘
```

## 各区域行为详解

### Header

| 元素 | view 模式 | edit 模式 | 新建模式 (edit + item=null) |
|------|----------|----------|--------------------------|
| 返回按钮 | 返回列表 | 触发未保存确认后返回 | 触发未保存确认后返回 |
| 标题 | 显示接入点编码 | 显示接入点编码 | 显示"新建接入点" |
| 生命周期徽章 | 显示 | 显示 | 不显示 |
| 状态徽章 | 显示 | 显示 | 不显示 |
| 操作按钮 | "编辑"按钮 | "取消" + "保存"按钮 | "取消" + "保存"按钮 |

### 基本信息区域

**view 模式：** 复用现有 Detail 的 `grid grid-cols-2` 布局，展示接入点编码、描述、创建时间、最后更新、操作人。

**edit 模式：** 复用现有 Editor 的纵向表单布局：
- 接入点编码：input（编辑时 disabled，新建时可输入）
- 描述：textarea
- 运行状态：toggle 开关

**过渡动画：** 模式切换时基本信息区域有 ~200ms fade 动画 (`transition-opacity duration-200`)。

### 关联策略表格

始终只读展示，与现有 Detail 一致。新建模式下显示空状态"暂无关联策略"。

### 关联特征标签

始终只读展示，与现有 Detail 一致。新建模式下显示空状态"暂无关联特征"。

### 版本时间线（右侧 260px）

| 场景 | 行为 |
|------|------|
| view 模式 | 只读展示版本列表，不可点击 |
| edit 模式 | 可点击加载历史版本内容到表单 |
| 新建模式 | 不显示版本时间线区域 |

点击历史版本时，如果表单有未保存修改，弹出确认框"有未保存的修改，确定要加载历史版本吗？"。

## 交互流程

### 模式切换

1. 用户在 view 模式点击"编辑" → 切换到 edit 模式，当前数据填入表单
2. 用户在 edit 模式点击"取消" → 如果有未保存修改，弹确认框；确认后切回 view 模式，恢复原始数据
3. 新建模式点击"取消" → 如果有未保存修改，弹确认框；确认后调用 `onBack()` 返回列表

### 保存流程

1. 用户点击"保存"
2. 前端校验：接入点编码不能为空
3. 调用 `onSave(eventPoint)` 回调
4. 弹出保存成功提示框，包含两个按钮：
   - **返回列表** → 调用 `onBack()`
   - **留在当前页面** → 关闭弹框，切回 view 模式，展示最新保存的数据

### 未保存修改检测

通过比较当前表单数据与进入 edit 模式时的快照来判断是否有未保存修改。以下操作在检测到未保存修改时需要弹出确认框：

- 点击"取消"按钮
- 点击返回按钮（edit 模式下）
- 点击版本时间线加载历史版本

确认框内容："有未保存的修改，确定要放弃吗？"，按钮为"确定"和"取消"。

## EventPointList 改动

```typescript
// 之前
const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');

// 之后
const [viewMode, setViewMode] = useState<'LIST' | 'VIEW'>('LIST');
const [initialMode, setInitialMode] = useState<'view' | 'edit'>('view');

// 查看
const handleView = (item: EventPoint) => {
  setCurrentItem(item);
  setInitialMode('view');
  setViewMode('VIEW');
};

// 编辑
const handleEdit = (item: EventPoint) => {
  setCurrentItem(item);
  setInitialMode('edit');
  setViewMode('VIEW');
};

// 新建
const handleCreate = () => {
  setCurrentItem(null);
  setInitialMode('edit');
  setViewMode('VIEW');
};

// 渲染
if (viewMode === 'VIEW') {
  return (
    <EventPointView
      item={currentItem}
      initialMode={initialMode}
      onBack={handleBackToList}
      onSave={handleSave}
    />
  );
}
```

## 技术细节

- 内部状态 `mode` 由 `initialMode` prop 初始化，之后由组件内部管理
- 进入 edit 模式时保存数据快照 `editSnapshot`，用于未保存修改检测和取消恢复
- 保存成功弹框使用内部 state 控制，不依赖外部 UI 库
- 动画使用 Tailwind 的 `transition-opacity duration-200` 实现 fade 效果
