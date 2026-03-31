# EventPoint 详情页与编辑页合并 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 EventPointDetail 和 EventPointEditor 合并为一个 EventPointView 组件，通过 mode 切换查看/编辑/新建。

**Architecture:** 新建 EventPointView.tsx 替代 Detail + Editor，内部用 `mode: 'view' | 'edit'` 状态管理模式切换。List 的 viewMode 从三态简化为二态。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS + Lucide Icons

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| 创建 | `components/EventPointView.tsx` | 统一的查看/编辑/新建组件 |
| 修改 | `components/EventPointList.tsx` | viewMode 简化，移除对 Detail/Editor 的引用 |
| 删除 | `components/EventPointDetail.tsx` | 被 EventPointView 替代 |
| 删除 | `components/EventPointEditor.tsx` | 被 EventPointView 替代 |

---

### Task 1: 创建 EventPointView 组件 — Header 区域

**Files:**
- Create: `components/EventPointView.tsx`

- [ ] **Step 1: 创建 EventPointView.tsx，实现 props 接口和 Header**

```tsx
import React, { useState, useRef } from 'react';
import { EventPoint, EventPointVersion, FeatureStatus, FeatureLifecycle, t } from '../types';
import { ArrowLeft, Edit, Save, X, Clock, CheckCircle2, GitBranch, Archive, ShoppingCart, History, Layers, Zap } from 'lucide-react';
import { mockActivations, mockFeatures, mockEventPointVersions } from '../mockData';

interface EventPointViewProps {
  item: EventPoint | null;
  initialMode: 'view' | 'edit';
  onBack: () => void;
  onSave: (ep: EventPoint) => EventPoint;
}

export const EventPointView: React.FC<EventPointViewProps> = ({ item, initialMode, onBack, onSave }) => {
  const isCreate = item === null;

  // 当前展示的数据（view 模式用这个渲染，进入 edit 模式时拷贝到 form）
  const [currentData, setCurrentData] = useState<EventPoint>(
    item || {
      eventPoint: '',
      description: '',
      status: FeatureStatus.ENABLED,
      lifecycleState: FeatureLifecycle.DRAFT,
      createAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: 'current_user',
    }
  );

  // 模式状态
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);

  // 编辑表单数据
  const [form, setForm] = useState<EventPoint>({ ...currentData });

  // 进入 edit 模式时的快照，用于脏检查
  const editSnapshotRef = useRef<string>(JSON.stringify(currentData));

  // 保存成功弹框
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // 确认弹框
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const isDirty = () => JSON.stringify(form) !== editSnapshotRef.current;

  const handleEnterEdit = () => {
    const snapshot = { ...currentData };
    setForm(snapshot);
    editSnapshotRef.current = JSON.stringify(snapshot);
    setMode('edit');
  };

  const handleCancelEdit = () => {
    if (isDirty()) {
      setConfirmAction(() => () => {
        if (isCreate) {
          onBack();
        } else {
          setForm({ ...currentData });
          setMode('view');
        }
      });
    } else {
      if (isCreate) {
        onBack();
      } else {
        setMode('view');
      }
    }
  };

  const handleBack = () => {
    if (mode === 'edit' && isDirty()) {
      setConfirmAction(() => () => onBack());
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    if (!form.eventPoint.trim()) {
      alert('请输入接入点编码');
      return;
    }
    const saved = onSave(form);
    setCurrentData(saved);
    setShowSaveSuccess(true);
  };

  const getLifecycleBadge = (state: FeatureLifecycle) => {
    switch (state) {
      case FeatureLifecycle.DRAFT:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center border border-slate-200 w-fit"><GitBranch className="w-3 h-3 mr-1"/>草稿</span>;
      case FeatureLifecycle.READY_FOR_RELEASE:
        return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs flex items-center border border-purple-200 w-fit"><ShoppingCart className="w-3 h-3 mr-1"/>待发布</span>;
      case FeatureLifecycle.PUBLISHED:
        return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs flex items-center border border-green-200 w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/>已发布</span>;
      case FeatureLifecycle.ARCHIVED_HISTORY:
        return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs flex items-center border border-orange-200 w-fit"><Archive className="w-3 h-3 mr-1"/>历史归档</span>;
    }
  };

  const displayData = mode === 'edit' ? form : currentData;

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              {isCreate && mode === 'edit' ? (
                <span>新建接入点</span>
              ) : (
                <>
                  <span className="font-mono">{displayData.eventPoint}</span>
                  {getLifecycleBadge(displayData.lifecycleState)}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${displayData.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${displayData.status === FeatureStatus.ENABLED ? 'bg-green-500' : 'bg-red-400'}`}></span>
                    {t(displayData.status)}
                  </span>
                </>
              )}
              {mode === 'edit' && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs border border-slate-200 flex items-center">
                  <GitBranch className="w-3 h-3 mr-1" />
                  编辑中
                </span>
              )}
            </h2>
            {mode === 'view' && <div className="text-sm text-slate-500 mt-0.5">{currentData.description}</div>}
          </div>
        </div>
        <div className="flex gap-3">
          {mode === 'view' ? (
            <button
              onClick={handleEnterEdit}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center px-5 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </button>
            </>
          )}
        </div>
      </div>

      {/* TODO: Task 2 will add main content + version timeline here */}

      {/* 确认弹框 */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">确认</h3>
            <p className="text-sm text-slate-600 mb-6">有未保存的修改，确定要放弃吗？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={() => { confirmAction(); setConfirmAction(null); }}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存成功弹框 */}
      {showSaveSuccess && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[400px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">保存成功</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">接入点已保存成功。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowSaveSuccess(false); onBack(); }}
                className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
              >
                返回列表
              </button>
              <button
                onClick={() => { setShowSaveSuccess(false); setMode('view'); }}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                留在当前页面
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无 EventPointView 相关错误

---

### Task 2: EventPointView — 基本信息区域（view/edit 切换）

**Files:**
- Modify: `components/EventPointView.tsx`

- [ ] **Step 1: 替换 `{/* TODO: Task 2 will add main content + version timeline here */}` 为主内容区域**

在 Header 和确认弹框之间，插入主内容区域。包含左侧内容（基本信息 + 关联数据）和右侧版本时间线占位：

```tsx
      {/* Main Content + Version Timeline */}
      <div className="flex gap-6">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* 基本信息 */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-indigo-500" />
              基本信息
            </h3>

            <div className={`transition-opacity duration-200 ${mode === 'view' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
              {/* View 模式: 2列网格 */}
              <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
                <div className="space-y-1.5">
                  <span className="text-slate-500 block text-xs">接入点编码</span>
                  <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{currentData.eventPoint}</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-slate-500 block text-xs">描述</span>
                  <span className="font-medium text-slate-900">{currentData.description}</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-slate-500 block text-xs">创建时间</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">{currentData.createAt || '-'}</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-slate-500 block text-xs">最后更新</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">{currentData.updateAt || '-'}</span>
                </div>
                <div className="space-y-1.5">
                  <span className="text-slate-500 block text-xs">操作人</span>
                  <span className="font-medium text-slate-900">{currentData.operator || '-'}</span>
                </div>
              </div>
            </div>

            <div className={`transition-opacity duration-200 ${mode === 'edit' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'}`}>
              {/* Edit 模式: 纵向表单 */}
              <div className="max-w-[800px] space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    接入点编码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                    value={form.eventPoint}
                    onChange={(e) => setForm(prev => ({ ...prev, eventPoint: e.target.value, updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }))}
                    placeholder="请输入唯一编码，如 EP00000005"
                    disabled={!isCreate}
                  />
                  {isCreate && <p className="mt-1 text-xs text-slate-400">系统唯一标识，创建后不可修改。</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">描述</label>
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value, updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }))}
                    placeholder="请输入接入点的中文描述..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">运行状态</label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, status: prev.status === FeatureStatus.ENABLED ? FeatureStatus.DISABLED : FeatureStatus.ENABLED, updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        form.status === FeatureStatus.ENABLED ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                        form.status === FeatureStatus.ENABLED ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className={`text-sm font-medium ${form.status === FeatureStatus.ENABLED ? 'text-green-700' : 'text-slate-500'}`}>
                      {t(form.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">控制该接入点上线后是否实际生效。</p>
                </div>
              </div>
            </div>
          </div>

          {/* TODO: Task 3 will add related activations and features here */}
        </div>

        {/* TODO: Task 4 will add version timeline here */}
      </div>
```

- [ ] **Step 2: 验证编译通过**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无 EventPointView 相关错误

---

### Task 3: EventPointView — 关联策略表格和关联特征标签

**Files:**
- Modify: `components/EventPointView.tsx`

- [ ] **Step 1: 替换 `{/* TODO: Task 3 will add related activations and features here */}` 为关联数据区域**

在基本信息卡片下方、左侧内容区的 `</div>` 之前插入：

```tsx
          {/* 关联策略 */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                关联策略
                <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded border border-blue-200 ml-2">{relatedActivations.length}</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">策略名</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {relatedActivations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">暂无关联策略</td>
                    </tr>
                  ) : (
                    relatedActivations.map((activation) => (
                      <tr key={activation.id} className="hover:bg-[#f0f7ff] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline">{activation.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">P{activation.priority}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">{activation.description}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getLifecycleBadge(activation.lifecycleState)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 关联特征 */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-purple-500" />
              关联特征
              <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-0.5 rounded border border-purple-200 ml-2">{relatedFeatures.length}</span>
            </h3>
            {relatedFeatures.length === 0 ? (
              <p className="text-slate-400 text-sm">暂无关联特征</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {relatedFeatures.map(feature => (
                  <span key={feature.id} className="bg-purple-50 text-purple-700 text-xs font-mono px-3 py-1.5 rounded border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                    {feature.name}
                  </span>
                ))}
              </div>
            )}
          </div>
```

- [ ] **Step 2: 在组件顶部（`const displayData` 之前）添加关联数据计算**

```tsx
  // 关联数据（始终基于 currentData，不随编辑表单变化）
  const relatedActivations = mockActivations.filter(a => a.eventPoint === currentData.eventPoint);
  const relatedFeatures = mockFeatures.filter(f => f.eventPoints.includes(currentData.eventPoint));
```

- [ ] **Step 3: 验证编译通过**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 4: EventPointView — 版本时间线

**Files:**
- Modify: `components/EventPointView.tsx`

- [ ] **Step 1: 替换 `{/* TODO: Task 4 will add version timeline here */}` 为版本时间线**

```tsx
        {/* Right: Version Timeline */}
        {!isCreate && (
          <div className="w-[260px] shrink-0 border-l border-slate-200 pl-6">
            <div className="sticky top-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-500" />
                版本记录
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>

                <div className="space-y-6">
                  {history.length === 0 ? (
                    <p className="text-xs text-slate-400 pl-6">暂无版本记录</p>
                  ) : (
                    history.map((version, idx) => {
                      const isFirst = idx === 0;
                      const isSelected = selectedVersionId === version.id;
                      const dotActive = mode === 'edit'
                        ? (isSelected || (isFirst && !selectedVersionId))
                        : isFirst;

                      return (
                        <div
                          key={version.id}
                          className={`relative pl-6 py-1 px-1 -ml-1 transition-colors rounded-md ${
                            mode === 'edit' ? 'cursor-pointer' : ''
                          } ${isSelected ? 'bg-indigo-50' : mode === 'edit' ? 'hover:bg-slate-50' : ''}`}
                          onClick={() => {
                            if (mode !== 'edit') return;
                            handleLoadVersion(version);
                          }}
                        >
                          {/* Dot */}
                          <div className={`absolute left-0 top-2 w-[15px] h-[15px] rounded-full border-2 ${dotActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {dotActive && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">v{version.version}</span>
                              {isFirst && !selectedVersionId && <span className="text-[10px] text-indigo-600 font-medium">当前</span>}
                              {isSelected && mode === 'edit' && <span className="text-[10px] text-indigo-600 font-medium">已加载</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{version.commitMessage}</p>
                            <div className="flex items-center text-[10px] text-slate-400 mt-1 gap-1">
                              <Clock className="w-3 h-3" />
                              {version.createAt}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{version.editor}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 2: 在组件顶部添加版本相关的状态和方法**

在 `const editSnapshotRef` 之后添加：

```tsx
  // 版本历史
  const history = !isCreate
    ? mockEventPointVersions.filter(v => v.eventPointId === currentData.id)
    : [];

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleLoadVersion = (version: EventPointVersion) => {
    if (isDirty()) {
      setConfirmAction(() => () => {
        setSelectedVersionId(version.id);
        setForm({ ...version.content, id: currentData.id });
      });
    } else {
      setSelectedVersionId(version.id);
      setForm({ ...version.content, id: currentData.id });
    }
  };
```

- [ ] **Step 3: 在 handleEnterEdit 末尾重置 selectedVersionId**

在 `handleEnterEdit` 函数的 `setMode('edit')` 之前添加：

```tsx
    setSelectedVersionId(null);
```

- [ ] **Step 4: 验证编译通过**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty 2>&1 | head -30`

---

### Task 5: 改造 EventPointList — 简化 viewMode

**Files:**
- Modify: `components/EventPointList.tsx`

- [ ] **Step 1: 替换 import 语句**

将：
```tsx
import { EventPointDetail } from './EventPointDetail';
import { EventPointEditor } from './EventPointEditor';
```

替换为：
```tsx
import { EventPointView } from './EventPointView';
```

- [ ] **Step 2: 替换 viewMode 状态声明**

将：
```tsx
const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
```

替换为：
```tsx
const [viewMode, setViewMode] = useState<'LIST' | 'VIEW'>('LIST');
const [initialMode, setInitialMode] = useState<'view' | 'edit'>('view');
```

- [ ] **Step 3: 替换 handleCreate、handleViewDetail、handleOpenEditor**

将：
```tsx
  const handleCreate = () => {
    setCurrentEventPoint(null);
    setViewMode('EDIT');
  };

  const handleViewDetail = (ep: EventPoint) => {
    setCurrentEventPoint(ep);
    setViewMode('DETAIL');
  };

  const handleOpenEditor = (ep: EventPoint) => {
    setCurrentEventPoint(ep);
    setViewMode('EDIT');
  };
```

替换为：
```tsx
  const handleCreate = () => {
    setCurrentEventPoint(null);
    setInitialMode('edit');
    setViewMode('VIEW');
  };

  const handleViewDetail = (ep: EventPoint) => {
    setCurrentEventPoint(ep);
    setInitialMode('view');
    setViewMode('VIEW');
  };

  const handleOpenEditor = (ep: EventPoint) => {
    setCurrentEventPoint(ep);
    setInitialMode('edit');
    setViewMode('VIEW');
  };
```

- [ ] **Step 4: 修改 handleSave — 不再直接切回列表**

将：
```tsx
  const handleSave = (ep: EventPoint): EventPoint => {
    let savedEP = ep;
    setEventPoints(prev => {
      if (ep.id) {
        return prev.map(item => item.id === ep.id ? ep : item);
      } else {
        const newId = Date.now();
        savedEP = { ...ep, id: newId };
        return [...prev, savedEP];
      }
    });

    setViewMode('LIST');
    setCurrentEventPoint(null);
    return savedEP;
  };
```

替换为：
```tsx
  const handleSave = (ep: EventPoint): EventPoint => {
    let savedEP = ep;
    setEventPoints(prev => {
      if (ep.id) {
        return prev.map(item => item.id === ep.id ? ep : item);
      } else {
        const newId = Date.now();
        savedEP = { ...ep, id: newId };
        return [...prev, savedEP];
      }
    });
    return savedEP;
  };
```

- [ ] **Step 5: 替换条件渲染（EDIT 和 DETAIL 分支合并为 VIEW）**

将：
```tsx
  if (viewMode === 'EDIT') {
    return (
      <EventPointEditor
        initialEventPoint={currentEventPoint}
        onSave={handleSave}
        onCancel={handleBackToList}
      />
    );
  }

  if (viewMode === 'DETAIL' && currentEventPoint) {
    return (
      <EventPointDetail
        eventPoint={currentEventPoint}
        onBack={handleBackToList}
        onEdit={handleOpenEditor}
      />
    );
  }
```

替换为：
```tsx
  if (viewMode === 'VIEW') {
    return (
      <EventPointView
        item={currentEventPoint}
        initialMode={initialMode}
        onBack={handleBackToList}
        onSave={handleSave}
      />
    );
  }
```

- [ ] **Step 6: 验证编译通过**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: 无错误

---

### Task 6: 删除旧组件，验证完整功能

**Files:**
- Delete: `components/EventPointDetail.tsx`
- Delete: `components/EventPointEditor.tsx`

- [ ] **Step 1: 确认没有其他文件引用 EventPointDetail 或 EventPointEditor**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && grep -r "EventPointDetail\|EventPointEditor" --include="*.tsx" --include="*.ts" -l`

Expected: 只有即将删除的两个文件本身（EventPointList.tsx 应该已经不引用了）

- [ ] **Step 2: 删除旧文件**

```bash
cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图
rm components/EventPointDetail.tsx components/EventPointEditor.tsx
```

- [ ] **Step 3: 最终编译验证**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npx tsc --noEmit --pretty`
Expected: 无错误

- [ ] **Step 4: 启动开发服务器，手动验证所有场景**

Run: `cd /Users/zion/work/Projects/gitlab/风控配置平台产品原型图 && npm run dev`

手动验证清单：
1. 列表页点击接入点编码 → 进入 view 模式，显示基本信息/关联策略/关联特征/版本时间线
2. view 模式点击"编辑" → 基本信息切为表单，fade 过渡动画，右上角变为"取消"+"保存"
3. edit 模式修改描述 → 点击"取消" → 弹出确认框 → 点"确定"恢复为 view 模式
4. edit 模式点击版本时间线的历史版本 → 表单填入历史数据，时间线标记"已加载"
5. edit 模式修改后点"保存" → 弹出保存成功框 → 点"留在当前页面" → 切回 view 模式
6. 保存成功框点"返回列表" → 回到列表页
7. 列表页点"新增" → 进入 edit 模式空表单，标题为"新建接入点"，无版本时间线
8. 列表页点某行"编辑"按钮 → 进入 edit 模式，表单有数据
