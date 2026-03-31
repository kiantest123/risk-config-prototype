
import React, { useState, useMemo } from 'react';
import { Action, ActionType, FeatureStatus, FeatureLifecycle, t, DraftItem, ReleaseType } from '../types';
import { ActionDetail } from './ActionDetail';
import { ActionEditor } from './ActionEditor';
import { Plus, Search, GitBranch, CheckCircle2, Archive, ShoppingCart, FileText, Trash2, PlayCircle, StopCircle, X, Edit } from 'lucide-react';
import { mockActions, mockRules } from '../mockData';

interface ActionListProps {
  onAddToDrafts: (item: DraftItem) => void;
}

const getActionTypeBadge = (type: ActionType) => {
  switch (type) {
    case ActionType.TAG:
      return <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-medium">{t(type)}</span>;
    case ActionType.WEBHOOK:
      return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-medium">{t(type)}</span>;
    case ActionType.NOTIFY:
      return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-xs font-medium">{t(type)}</span>;
    case ActionType.FEATURE_MUTATION:
      return <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-xs font-medium">{t(type)}</span>;
  }
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

export const ActionList: React.FC<ActionListProps> = ({ onAddToDrafts }) => {
  const [actions, setActions] = useState<Action[]>(mockActions);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
  const [currentAction, setCurrentAction] = useState<Action | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --- Search Params State ---
  const [searchParams, setSearchParams] = useState({
    name: '',
    type: 'ALL',
    lifecycle: 'ALL' as FeatureLifecycle | 'ALL',
    status: 'ALL',
  });

  // --- Applied Filters State ---
  const [appliedFilters, setAppliedFilters] = useState(searchParams);

  const handleSearch = () => {
    setAppliedFilters({ ...searchParams });
    setSelectedIds(new Set());
  };

  const handleDetail = (action: Action) => {
    setCurrentAction(action);
    setViewMode('DETAIL');
  };

  const handleCreate = () => {
    setCurrentAction(null);
    setViewMode('EDIT');
  };

  const handleOpenEditor = (action: Action) => {
    setCurrentAction(action);
    setViewMode('EDIT');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
    setCurrentAction(null);
    setSelectedIds(new Set());
  };

  const handleSave = (action: Action) => {
    let savedAction = action;
    setActions(prev => {
      if (action.id) {
        return prev.map(a => a.id === action.id ? action : a);
      } else {
        const newId = action.id || Date.now();
        savedAction = { ...action, id: newId };
        return [...prev, savedAction];
      }
    });

    setViewMode('LIST');
    setCurrentAction(null);
    return savedAction;
  };

  // --- Compute related rules count for each action ---
  const getRelatedRulesCount = (actionName: string): number => {
    return mockRules.filter(rule => rule.actions.some(a => a.actionName === actionName)).length;
  };

  // --- Filtering Logic ---
  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const matchesName = a.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
      const matchesType = appliedFilters.type === 'ALL' || a.type === appliedFilters.type;
      const matchesLifecycle = appliedFilters.lifecycle === 'ALL' || a.lifecycleState === appliedFilters.lifecycle;
      const matchesStatus = appliedFilters.status === 'ALL' || a.status.toString() === appliedFilters.status;
      return matchesName && matchesType && matchesLifecycle && matchesStatus;
    });
  }, [actions, appliedFilters]);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredActions.map(a => a.id!)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteOne = (id: number) => {
    if (confirm('确定要删除该动作模板吗？此操作不可恢复。')) {
      setActions(prev => prev.filter(a => a.id !== id));
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    }
  };

  const handleBatchRelease = () => {
    const selectedActions = actions.filter(a => selectedIds.has(a.id!));
    const eligible = selectedActions.filter(a => a.lifecycleState === FeatureLifecycle.DRAFT);
    eligible.forEach(a => {
      onAddToDrafts({
        id: `DFT-${Date.now()}-${a.id}`,
        type: ReleaseType.ACTION,
        targetId: a.id!,
        targetName: a.name,
        version: 'vNext',
        updatedAt: new Date().toISOString(),
        editor: 'current_user',
        changeSummary: '批量加入发布清单',
      });
    });
    setActions(prev => prev.map(a => {
      if (eligible.find(item => item.id === a.id)) {
        return { ...a, lifecycleState: FeatureLifecycle.READY_FOR_RELEASE };
      }
      return a;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchEnable = () => {
    setActions(prev => prev.map(a => {
      if (selectedIds.has(a.id!) && a.status === FeatureStatus.DISABLED) {
        return { ...a, status: FeatureStatus.ENABLED, lifecycleState: FeatureLifecycle.DRAFT, updateAt: new Date().toISOString() };
      }
      return a;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchDisable = () => {
    setActions(prev => prev.map(a => {
      if (selectedIds.has(a.id!) && a.status === FeatureStatus.ENABLED) {
        return { ...a, status: FeatureStatus.DISABLED, lifecycleState: FeatureLifecycle.DRAFT, updateAt: new Date().toISOString() };
      }
      return a;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm('确定要批量删除选中的动作模板吗？')) {
      setActions(prev => prev.filter(a => !selectedIds.has(a.id!) || a.lifecycleState !== FeatureLifecycle.DRAFT));
      setSelectedIds(new Set());
    }
  };

  if (viewMode === 'EDIT') {
    return (
      <ActionEditor
        initialAction={currentAction}
        onSave={handleSave}
        onCancel={handleBackToList}
      />
    );
  }

  if (viewMode === 'DETAIL' && currentAction) {
    return (
      <ActionDetail
        action={currentAction}
        onBack={handleBackToList}
        onEdit={handleOpenEditor}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">

        {/* Batch Actions Toolbar */}
        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-md p-3 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">
                已选 {selectedIds.size} 项
              </div>
              <span className="text-sm text-indigo-900">请选择批量操作：</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBatchRelease} className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded text-sm hover:bg-indigo-100 transition-colors">
                <ShoppingCart className="w-4 h-4 mr-2" /> 批量待发布
              </button>
              <button onClick={handleBatchEnable} className="flex items-center px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded text-sm hover:bg-green-50 transition-colors">
                <PlayCircle className="w-4 h-4 mr-2" /> 批量启用
              </button>
              <button onClick={handleBatchDisable} className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-sm hover:bg-slate-50 transition-colors">
                <StopCircle className="w-4 h-4 mr-2" /> 批量禁用
              </button>
              <div className="w-px h-6 bg-indigo-200 mx-1"></div>
              <button onClick={handleBatchDelete} className="flex items-center px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4 mr-2" /> 批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-slate-400 hover:text-slate-600 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          // Standard Filters
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">

              {/* 动作名称 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">动作名称</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入动作标识"
                    className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                    value={searchParams.name}
                    onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* 动作类型 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">动作类型</label>
                <select
                  className="w-36 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.type}
                  onChange={(e) => setSearchParams({ ...searchParams, type: e.target.value })}
                >
                  <option value="ALL">全部类型</option>
                  {Object.values(ActionType).map(tVal => <option key={tVal} value={tVal}>{t(tVal)}</option>)}
                </select>
              </div>

              {/* 生命周期 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">生命周期</label>
                <select
                  className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.lifecycle}
                  onChange={(e) => setSearchParams({ ...searchParams, lifecycle: e.target.value as FeatureLifecycle | 'ALL' })}
                >
                  <option value="ALL">全部状态</option>
                  <option value={FeatureLifecycle.PUBLISHED}>已发布</option>
                  <option value={FeatureLifecycle.READY_FOR_RELEASE}>待发布</option>
                  <option value={FeatureLifecycle.DRAFT}>草稿</option>
                </select>
              </div>

              {/* 运行状态 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">运行状态</label>
                <select
                  className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.status}
                  onChange={(e) => setSearchParams({ ...searchParams, status: e.target.value })}
                >
                  <option value="ALL">全部</option>
                  <option value={FeatureStatus.ENABLED.toString()}>已启用</option>
                  <option value={FeatureStatus.DISABLED.toString()}>已禁用</option>
                </select>
              </div>

              <div className="flex-1 flex justify-end gap-3 items-end">
                <button
                  onClick={handleSearch}
                  className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-[#1890ff] rounded hover:bg-[#40a9ff] shadow-sm transition-colors whitespace-nowrap"
                >
                  <Search className="w-4 h-4 mr-2" />
                  查询
                </button>
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-[#1890ff] bg-indigo-50 border border-[#1890ff] rounded hover:bg-indigo-100 shadow-sm transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={filteredActions.length > 0 && selectedIds.size === filteredActions.length} onChange={handleSelectAll} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">动作名称</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">动作类型</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">关联规则数</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">生命周期</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">运行状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间/操作人</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredActions.map((action) => {
                const relatedCount = getRelatedRulesCount(action.name);
                return (
                  <tr key={action.id} className={`hover:bg-[#f0f7ff] transition-colors group ${selectedIds.has(action.id!) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={selectedIds.has(action.id!)} onChange={() => handleSelectOne(action.id!)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline" onClick={() => handleDetail(action)}>
                        {action.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionTypeBadge(action.type)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{action.description}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {relatedCount > 0 ? (
                        <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded text-xs font-medium">
                          {relatedCount} 条规则
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getLifecycleBadge(action.lifecycleState)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${action.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : action.status === FeatureStatus.DISABLED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {t(action.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {action.updateAt?.split('T')[0] || '-'}
                      <div className="text-xs text-slate-400">{action.operator}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDetail(action)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="查看详情"><FileText className="w-4 h-4 mr-1" />查看</button>
                        <button onClick={() => handleOpenEditor(action)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="编辑动作"><Edit className="w-4 h-4 mr-1" />编辑</button>
                        <button onClick={() => handleDeleteOne(action.id!)} className="flex items-center text-slate-400 hover:text-red-600 transition-colors" title="删除动作"><Trash2 className="w-4 h-4 mr-1" />删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredActions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>暂无符合条件的动作模板</p>
                      <button onClick={handleSearch} className="text-indigo-600 text-xs mt-2 hover:underline">请点击查询按钮搜索</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
