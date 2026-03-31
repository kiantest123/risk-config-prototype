
import React, { useState, useMemo } from 'react';
import { Rule, FeatureStatus, FeatureLifecycle, ActionType, RuleOperator, t, DraftItem, ReleaseType } from '../types';
import { RuleDetail } from './RuleDetail';
import { RuleEditor } from './RuleEditor';
import { Plus, Search, GitBranch, CheckCircle2, ShoppingCart, Archive, Trash2, PlayCircle, StopCircle, X, Edit, FileText } from 'lucide-react';
import { mockRules, mockActivations, mockEventPoints, mockActions } from '../mockData';

interface RuleListProps {
  onAddToDrafts: (item: DraftItem) => void;
}

export const RuleList: React.FC<RuleListProps> = ({ onAddToDrafts }) => {
  const [rules, setRules] = useState<Rule[]>(mockRules);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --- Search Params State ---
  const [searchParams, setSearchParams] = useState({
    name: '',
    activation: 'ALL',
    eventPoint: 'ALL',
    lifecycle: 'ALL' as FeatureLifecycle | 'ALL',
    status: 'ALL',
  });

  // --- Applied Filters ---
  const [appliedFilters, setAppliedFilters] = useState(searchParams);

  const handleSearch = () => {
    setAppliedFilters({ ...searchParams });
    setSelectedIds(new Set());
  };

  const handleCreate = () => {
    setCurrentRule(null);
    setViewMode('EDIT');
  };

  const handleViewDetail = (rule: Rule) => {
    setCurrentRule(rule);
    setViewMode('DETAIL');
  };

  const handleOpenEditor = (rule: Rule) => {
    setCurrentRule(rule);
    setViewMode('EDIT');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
    setCurrentRule(null);
    setSelectedIds(new Set());
  };

  const handleSave = (rule: Rule) => {
    let savedRule = rule;
    setRules(prev => {
      if (rule.id) {
        return prev.map(r => r.id === rule.id ? rule : r);
      } else {
        const newId = Date.now();
        savedRule = { ...rule, id: newId };
        return [...prev, savedRule];
      }
    });

    setViewMode('LIST');
    setCurrentRule(null);
    return savedRule;
  };

  // --- Filtering ---
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const matchesName = r.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
      const matchesActivation = appliedFilters.activation === 'ALL' || r.activationName === appliedFilters.activation;
      const matchesEP = appliedFilters.eventPoint === 'ALL' || r.eventPoint === appliedFilters.eventPoint;
      const matchesLifecycle = appliedFilters.lifecycle === 'ALL' || r.lifecycleState === appliedFilters.lifecycle;
      const matchesStatus = appliedFilters.status === 'ALL' || r.status.toString() === appliedFilters.status;
      return matchesName && matchesActivation && matchesEP && matchesLifecycle && matchesStatus;
    });
  }, [rules, appliedFilters]);

  // --- Selection ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredRules.map(r => r.id!)));
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
    if (confirm('确定要删除该规则吗？此操作不可恢复。')) {
      setRules(prev => prev.filter(r => r.id !== id));
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    }
  };

  // --- Batch Actions ---
  const handleBatchRelease = () => {
    const selectedItems = rules.filter(r => selectedIds.has(r.id!));
    selectedItems.forEach(r => {
      if (r.lifecycleState === FeatureLifecycle.DRAFT) {
        onAddToDrafts({
          id: `DFT-${Date.now()}-${r.id}`,
          type: ReleaseType.RULE,
          targetId: r.id!,
          targetName: r.name,
          version: 'vNext',
          relatedKeys: r.eventPoint,
          updatedAt: new Date().toISOString(),
          editor: 'current_user',
          changeSummary: '批量加入发布清单',
        });
      }
    });
    setRules(prev => prev.map(r => {
      if (selectedIds.has(r.id!) && r.lifecycleState === FeatureLifecycle.DRAFT) {
        return { ...r, lifecycleState: FeatureLifecycle.READY_FOR_RELEASE };
      }
      return r;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchEnable = () => {
    setRules(prev => prev.map(r => {
      if (selectedIds.has(r.id!) && r.status === FeatureStatus.DISABLED) {
        return { ...r, status: FeatureStatus.ENABLED, lifecycleState: FeatureLifecycle.DRAFT, updateAt: new Date().toISOString() };
      }
      return r;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchDisable = () => {
    setRules(prev => prev.map(r => {
      if (selectedIds.has(r.id!) && r.status === FeatureStatus.ENABLED) {
        return { ...r, status: FeatureStatus.DISABLED, lifecycleState: FeatureLifecycle.DRAFT, updateAt: new Date().toISOString() };
      }
      return r;
    }));
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (confirm(`确定要批量删除选中的 ${selectedIds.size} 条规则吗？`)) {
      setRules(prev => prev.filter(r => !(selectedIds.has(r.id!) && r.lifecycleState === FeatureLifecycle.DRAFT)));
      setSelectedIds(new Set());
    }
  };

  // --- UI Helpers ---
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

  const getActionTypeBadge = (type: ActionType) => {
    switch (type) {
      case ActionType.TAG:
        return <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] px-1.5 py-0.5 rounded font-medium">TAG</span>;
      case ActionType.WEBHOOK:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5 rounded font-medium">WEBHOOK</span>;
      case ActionType.NOTIFY:
        return <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] px-1.5 py-0.5 rounded font-medium">NOTIFY</span>;
      case ActionType.FEATURE_MUTATION:
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] px-1.5 py-0.5 rounded font-medium">MUTATION</span>;
    }
  };

  const getScoreFormula = (rule: Rule) => {
    if (rule.operator === RuleOperator.NONE) return `${rule.initScore}`;
    const opSymbol = { ADD: '+', SUB: '-', MUL: '*', DIV: '/' }[rule.operator] || '?';
    return `${rule.initScore} ${opSymbol} ${rule.operator}`;
  };

  // --- Render ---
  if (viewMode === 'EDIT') {
    return (
      <RuleEditor
        initialRule={currentRule}
        onSave={handleSave}
        onCancel={handleBackToList}
      />
    );
  }

  if (viewMode === 'DETAIL' && currentRule) {
    return (
      <RuleDetail
        rule={currentRule}
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

              {/* 规则名称 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">规则名称</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入规则标识"
                    className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                    value={searchParams.name}
                    onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* 所属策略 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">所属策略</label>
                <select
                  className="w-48 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.activation}
                  onChange={(e) => setSearchParams({ ...searchParams, activation: e.target.value })}
                >
                  <option value="ALL">全部策略</option>
                  {mockActivations.map(a => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* 所属接入点 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">所属接入点</label>
                <select
                  className="w-36 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.eventPoint}
                  onChange={(e) => setSearchParams({ ...searchParams, eventPoint: e.target.value })}
                >
                  <option value="ALL">全部接入点</option>
                  {mockEventPoints.map(ep => (
                    <option key={ep.eventPoint} value={ep.eventPoint}>{ep.eventPoint}</option>
                  ))}
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

      {/* Rule Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={filteredRules.length > 0 && selectedIds.size === filteredRules.length} onChange={handleSelectAll} />
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">规则名称</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">所属策略</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">接入点</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">评分配置</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">关联动作</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">生命周期</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">运行状态</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间</th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredRules.map((rule) => (
                <tr key={rule.id} className={`hover:bg-[#f0f7ff] transition-colors group ${selectedIds.has(rule.id!) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-4 py-4">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={selectedIds.has(rule.id!)} onChange={() => handleSelectOne(rule.id!)} />
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline" onClick={() => handleViewDetail(rule)}>{rule.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{rule.description}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 rounded font-mono">{rule.activationName}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-mono">{rule.eventPoint}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded font-bold">P{rule.priority}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <code className="text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">{getScoreFormula(rule)}</code>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1">
                      {rule.actions.map((action, idx) => (
                        <span key={idx}>{getActionTypeBadge(action.actionType)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">{getLifecycleBadge(rule.lifecycleState)}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${rule.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {t(rule.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                    {rule.updateAt?.split('T')[0] || '-'}
                    <div className="text-xs text-slate-400">{rule.editOperator}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleViewDetail(rule)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="查看详情"><FileText className="w-4 h-4 mr-1" />查看</button>
                      <button onClick={() => handleOpenEditor(rule)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="编辑规则"><Edit className="w-4 h-4 mr-1" />编辑</button>
                      <button onClick={() => handleDeleteOne(rule.id!)} className="flex items-center text-slate-400 hover:text-red-600 transition-colors" title="删除规则"><Trash2 className="w-4 h-4 mr-1" />删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>暂无符合条件的规则</p>
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
