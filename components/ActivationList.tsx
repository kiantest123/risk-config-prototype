
import React, { useState, useMemo } from 'react';
import { Activation, FeatureStatus, FeatureLifecycle, DraftItem, ReleaseType, t } from '../types';
import { ActivationDetail } from './ActivationDetail';
import { ActivationEditor } from './ActivationEditor';
import { Plus, Search, GitBranch, CheckCircle2, Archive, ShoppingCart, Trash2, PlayCircle, StopCircle, X, Edit, FileText } from 'lucide-react';
import { mockActivations, mockEventPoints, mockRules } from '../mockData';

interface ActivationListProps {
  onAddToDrafts: (item: DraftItem) => void;
}

type BatchActionType = 'RELEASE' | 'ENABLE' | 'DISABLE' | 'DELETE';

export const ActivationList: React.FC<ActivationListProps> = ({ onAddToDrafts }) => {
  const [activations, setActivations] = useState<Activation[]>(mockActivations);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
  const [currentActivation, setCurrentActivation] = useState<Activation | null>(null);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Batch Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<BatchActionType>('RELEASE');
  const [batchResult, setBatchResult] = useState<{ success: Activation[]; skipped: Activation[] } | null>(null);

  // --- Search Params State (Inputs) ---
  const [searchParams, setSearchParams] = useState({
    name: '',
    eventPoint: 'ALL',
    lifecycle: 'ALL' as FeatureLifecycle | 'ALL',
    status: 'ALL',
  });

  // --- Applied Filters State (Triggered by Search Button) ---
  const [appliedFilters, setAppliedFilters] = useState(searchParams);

  // Trigger Search
  const handleSearch = () => {
    setAppliedFilters({ ...searchParams });
    setSelectedIds(new Set());
  };

  const handleCreate = () => {
    setCurrentActivation(null);
    setViewMode('EDIT');
  };

  const handleViewDetail = (activation: Activation) => {
    setCurrentActivation(activation);
    setViewMode('DETAIL');
  };

  const handleOpenEditor = (activation: Activation) => {
    setCurrentActivation(activation);
    setViewMode('EDIT');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
    setCurrentActivation(null);
    setSelectedIds(new Set());
  };

  const handleSave = (activation: Activation) => {
    let saved = activation;
    setActivations(prev => {
      if (activation.id) {
        return prev.map(a => (a.id === activation.id ? activation : a));
      } else {
        const newId = Date.now();
        saved = { ...activation, id: newId };
        return [...prev, saved];
      }
    });

    setViewMode('LIST');
    setCurrentActivation(null);
    return saved;
  };

  // --- Filtering Logic ---
  const filteredActivations = useMemo(() => {
    return activations.filter(a => {
      const matchesName = a.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
      const matchesEP = appliedFilters.eventPoint === 'ALL' || a.eventPoint === appliedFilters.eventPoint;
      const matchesLifecycle = appliedFilters.lifecycle === 'ALL' || a.lifecycleState === appliedFilters.lifecycle;
      const matchesStatus = appliedFilters.status === 'ALL' || a.status.toString() === appliedFilters.status;
      return matchesName && matchesEP && matchesLifecycle && matchesStatus;
    });
  }, [activations, appliedFilters]);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredActivations.map(a => a.id!)));
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
    if (confirm('确定要删除该策略吗？此操作不可恢复。')) {
      setActivations(prev => prev.filter(a => a.id !== id));
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    }
  };

  // --- Batch Actions ---
  const openBatchModal = (action: BatchActionType) => {
    setBatchAction(action);
    setBatchResult(null);
    setShowBatchModal(true);
  };

  const checkEligibility = (a: Activation, action: BatchActionType): { eligible: boolean; reason?: string } => {
    switch (action) {
      case 'RELEASE':
        if (a.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
        return { eligible: false, reason: `非草稿状态 (${t(a.lifecycleState)})` };
      case 'ENABLE':
        if (a.status === FeatureStatus.DISABLED) return { eligible: true };
        return { eligible: false, reason: '已处于启用状态' };
      case 'DISABLE':
        if (a.status === FeatureStatus.ENABLED) return { eligible: true };
        return { eligible: false, reason: '已处于禁用状态' };
      case 'DELETE':
        if (a.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
        return { eligible: false, reason: `非草稿状态 (${t(a.lifecycleState)})，不可直接删除` };
      default:
        return { eligible: false };
    }
  };

  const confirmBatchAction = () => {
    const selectedItems = activations.filter(a => selectedIds.has(a.id!));
    const eligibleItems: Activation[] = [];
    const ineligibleItems: Activation[] = [];

    selectedItems.forEach(a => {
      if (checkEligibility(a, batchAction).eligible) {
        eligibleItems.push(a);
      } else {
        ineligibleItems.push(a);
      }
    });

    if (batchAction === 'RELEASE') {
      eligibleItems.forEach(a => {
        onAddToDrafts({
          id: `DFT-${Date.now()}-${a.id}`,
          type: ReleaseType.ACTIVATION,
          targetId: a.id!,
          targetName: a.name,
          version: 'vNext',
          relatedKeys: a.eventPoint,
          updatedAt: new Date().toISOString(),
          editor: 'current_user',
          changeSummary: '批量加入发布清单',
        });
      });
      setActivations(prev =>
        prev.map(a => {
          if (eligibleItems.find(item => item.id === a.id)) {
            return { ...a, lifecycleState: FeatureLifecycle.READY_FOR_RELEASE };
          }
          return a;
        })
      );
    } else if (batchAction === 'ENABLE' || batchAction === 'DISABLE') {
      const newStatus = batchAction === 'ENABLE' ? FeatureStatus.ENABLED : FeatureStatus.DISABLED;
      setActivations(prev =>
        prev.map(a => {
          if (eligibleItems.find(item => item.id === a.id)) {
            return { ...a, status: newStatus, lifecycleState: FeatureLifecycle.DRAFT, updateAt: new Date().toISOString() };
          }
          return a;
        })
      );
    } else if (batchAction === 'DELETE') {
      setActivations(prev => prev.filter(a => !eligibleItems.find(item => item.id === a.id)));
    }

    setSelectedIds(new Set());
    setBatchResult({ success: eligibleItems, skipped: ineligibleItems });
  };

  const handleCloseBatchModal = () => {
    setShowBatchModal(false);
    setBatchResult(null);
    setSelectedIds(new Set());
  };

  // --- UI Helpers ---
  const getLifecycleBadge = (state: FeatureLifecycle) => {
    switch (state) {
      case FeatureLifecycle.DRAFT:
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center border border-slate-200 w-fit"><GitBranch className="w-3 h-3 mr-1" />草稿</span>;
      case FeatureLifecycle.READY_FOR_RELEASE:
        return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs flex items-center border border-purple-200 w-fit"><ShoppingCart className="w-3 h-3 mr-1" />待发布</span>;
      case FeatureLifecycle.PUBLISHED:
        return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs flex items-center border border-green-200 w-fit"><CheckCircle2 className="w-3 h-3 mr-1" />已发布</span>;
      case FeatureLifecycle.ARCHIVED_HISTORY:
        return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs flex items-center border border-orange-200 w-fit"><Archive className="w-3 h-3 mr-1" />历史归档</span>;
    }
  };

  const getRuleCount = (activationName: string) => {
    return mockRules.filter(r => r.activationName === activationName).length;
  };

  const renderThresholdTags = (thresholds: Activation['thresholds']) => {
    return (
      <div className="flex flex-wrap gap-1">
        {thresholds.map((th, idx) => {
          // First = green (pass), Last = red (reject), Middle = yellow (review)
          let colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
          if (idx === 0) colorClass = 'bg-green-50 text-green-700 border-green-200';
          if (idx === thresholds.length - 1) colorClass = 'bg-red-50 text-red-700 border-red-200';

          let label = '';
          if (idx === 0) {
            label = `${th.name} <${th.score}`;
          } else if (th.score === null) {
            const prevScore = thresholds[idx - 1].score;
            label = `${th.name} \u2265${prevScore}`;
          } else {
            const prevScore = thresholds[idx - 1].score;
            label = `${th.name} ${prevScore}-${th.score}`;
          }

          return (
            <span key={idx} className={`${colorClass} text-[10px] px-1.5 py-0.5 rounded border font-mono`}>
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  const getModalConfig = () => {
    switch (batchAction) {
      case 'RELEASE':
        return {
          title: '批量提交待发布确认',
          icon: <ShoppingCart className="w-5 h-5 text-indigo-600" />,
          infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的策略可以提交至待发布清单。其他状态将被自动忽略。',
          confirmText: '确认提交',
          confirmBtnClass: 'bg-indigo-600 hover:bg-indigo-700',
        };
      case 'ENABLE':
        return {
          title: '批量启用确认',
          icon: <PlayCircle className="w-5 h-5 text-green-600" />,
          infoBox: '批量启用将为选中的策略生成新的 <strong>草稿 (Draft)</strong>，并将状态置为启用。',
          confirmText: '确认启用',
          confirmBtnClass: 'bg-green-600 hover:bg-green-700',
        };
      case 'DISABLE':
        return {
          title: '批量禁用确认',
          icon: <StopCircle className="w-5 h-5 text-slate-600" />,
          infoBox: '批量禁用将为选中的策略生成新的 <strong>草稿 (Draft)</strong>，并将状态置为禁用。',
          confirmText: '确认禁用',
          confirmBtnClass: 'bg-slate-600 hover:bg-slate-700',
        };
      case 'DELETE':
        return {
          title: '批量删除确认',
          icon: <Trash2 className="w-5 h-5 text-red-600" />,
          infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的策略将被删除。',
          confirmText: '确认删除',
          confirmBtnClass: 'bg-red-600 hover:bg-red-700',
        };
    }
  };

  // --- Route to sub-views ---
  if (viewMode === 'EDIT') {
    return (
      <ActivationEditor
        initialActivation={currentActivation}
        onSave={handleSave}
        onCancel={handleBackToList}
      />
    );
  }

  if (viewMode === 'DETAIL' && currentActivation) {
    return (
      <ActivationDetail
        activation={currentActivation}
        onBack={handleBackToList}
        onEdit={handleOpenEditor}
      />
    );
  }

  const selectedActivationsList = activations.filter(a => selectedIds.has(a.id!));
  const modalConfig = getModalConfig();
  const eligibleCountPreview = selectedActivationsList.filter(a => checkEligibility(a, batchAction).eligible).length;

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
        {/* Batch Actions Toolbar */}
        {selectedIds.size > 0 ? (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-md p-3 mb-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">已选 {selectedIds.size} 项</div>
              <span className="text-sm text-indigo-900">请选择批量操作：</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openBatchModal('RELEASE')} className="flex items-center px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded text-sm hover:bg-indigo-100 transition-colors">
                <ShoppingCart className="w-4 h-4 mr-2" /> 批量待发布
              </button>
              <button onClick={() => openBatchModal('ENABLE')} className="flex items-center px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded text-sm hover:bg-green-50 transition-colors">
                <PlayCircle className="w-4 h-4 mr-2" /> 批量启用
              </button>
              <button onClick={() => openBatchModal('DISABLE')} className="flex items-center px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded text-sm hover:bg-slate-50 transition-colors">
                <StopCircle className="w-4 h-4 mr-2" /> 批量禁用
              </button>
              <div className="w-px h-6 bg-indigo-200 mx-1"></div>
              <button onClick={() => openBatchModal('DELETE')} className="flex items-center px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded text-sm hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4 mr-2" /> 批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="p-1.5 text-slate-400 hover:text-slate-600 ml-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
              {/* 策略名称 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">策略名称</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入策略标识"
                    className="w-48 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                    value={searchParams.name}
                    onChange={e => setSearchParams({ ...searchParams, name: e.target.value })}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* 所属接入点 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">所属接入点</label>
                <select
                  className="w-44 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.eventPoint}
                  onChange={e => setSearchParams({ ...searchParams, eventPoint: e.target.value })}
                >
                  <option value="ALL">全部接入点</option>
                  {mockEventPoints.map(ep => (
                    <option key={ep.eventPoint} value={ep.eventPoint}>{ep.eventPoint} - {ep.description}</option>
                  ))}
                </select>
              </div>

              {/* 生命周期 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">生命周期</label>
                <select
                  className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                  value={searchParams.lifecycle}
                  onChange={e => setSearchParams({ ...searchParams, lifecycle: e.target.value as FeatureLifecycle | 'ALL' })}
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
                  onChange={e => setSearchParams({ ...searchParams, status: e.target.value })}
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

      {/* Activation Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={filteredActivations.length > 0 && selectedIds.size === filteredActivations.length} onChange={handleSelectAll} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">策略名称</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">所属接入点</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">规则数</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">风险阈值</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">生命周期</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">运行状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredActivations.map(activation => (
                <tr key={activation.id} className={`hover:bg-[#f0f7ff] transition-colors group ${selectedIds.has(activation.id!) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={selectedIds.has(activation.id!)} onChange={() => handleSelectOne(activation.id!)} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline" onClick={() => handleViewDetail(activation)}>
                      {activation.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-600">{activation.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                      {activation.eventPoint}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded border border-yellow-200 font-medium">
                      P{activation.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-pink-50 text-pink-600 text-xs px-2 py-0.5 rounded border border-pink-200 font-medium">
                      {getRuleCount(activation.name)} 条
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {renderThresholdTags(activation.thresholds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getLifecycleBadge(activation.lifecycleState)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${activation.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      {t(activation.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {activation.updateAt?.split('T')[0] || activation.updateAt || '-'}
                    <div className="text-xs text-slate-400">{activation.operator}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleViewDetail(activation)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="查看详情">
                        <FileText className="w-4 h-4 mr-1" />查看
                      </button>
                      <button onClick={() => handleOpenEditor(activation)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="编辑策略">
                        <Edit className="w-4 h-4 mr-1" />编辑
                      </button>
                      <button onClick={() => handleDeleteOne(activation.id!)} className="flex items-center text-slate-400 hover:text-red-600 transition-colors" title="删除策略">
                        <Trash2 className="w-4 h-4 mr-1" />删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredActivations.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>暂无符合条件的策略</p>
                      <button onClick={handleSearch} className="text-indigo-600 text-xs mt-2 hover:underline">请点击查询按钮搜索</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Action Modal */}
      {showBatchModal && modalConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              {modalConfig.icon}
              <h3 className="text-lg font-semibold text-slate-900">{modalConfig.title}</h3>
              <button onClick={handleCloseBatchModal} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4">
              {!batchResult ? (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4 text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: modalConfig.infoBox }} />
                  <div className="text-sm text-slate-700 mb-2">
                    已选中 <strong>{selectedIds.size}</strong> 个策略，其中 <strong className="text-green-600">{eligibleCountPreview}</strong> 个符合操作条件。
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto mb-4">
                    {selectedActivationsList.map(a => {
                      const elig = checkEligibility(a, batchAction);
                      return (
                        <div key={a.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded ${elig.eligible ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
                          <span className="font-mono">{a.name}</span>
                          {elig.eligible ? (
                            <span className="text-green-600">可操作</span>
                          ) : (
                            <span className="text-slate-400">{elig.reason}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {batchResult.success.length > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-md p-3">
                      <div className="text-sm font-medium text-green-700 mb-1">操作成功 ({batchResult.success.length})</div>
                      {batchResult.success.map(a => <div key={a.id} className="text-xs text-green-600 font-mono">{a.name}</div>)}
                    </div>
                  )}
                  {batchResult.skipped.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-md p-3">
                      <div className="text-sm font-medium text-slate-600 mb-1">已跳过 ({batchResult.skipped.length})</div>
                      {batchResult.skipped.map(a => <div key={a.id} className="text-xs text-slate-500 font-mono">{a.name}</div>)}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              {!batchResult ? (
                <>
                  <button onClick={handleCloseBatchModal} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50">取消</button>
                  <button
                    onClick={confirmBatchAction}
                    disabled={eligibleCountPreview === 0}
                    className={`px-4 py-2 text-sm text-white rounded ${modalConfig.confirmBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {modalConfig.confirmText}
                  </button>
                </>
              ) : (
                <button onClick={handleCloseBatchModal} className="px-4 py-2 text-sm text-white bg-[#1890ff] rounded hover:bg-[#40a9ff]">关闭</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
