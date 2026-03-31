
import React, { useState, useMemo } from 'react';
import { EventPoint, FeatureStatus, FeatureLifecycle, t, DraftItem, ReleaseType } from '../types';
import { EventPointView } from './EventPointView';
import { Plus, Search, GitBranch, CheckCircle2, Archive, ShoppingCart, FileText, Trash2, PlayCircle, StopCircle, X, Edit, ChevronDown } from 'lucide-react';
import { mockEventPoints, mockActivations, mockFeatures } from '../mockData';

interface EventPointListProps {
  onAddToDrafts: (item: DraftItem) => void;
}

type BatchActionType = 'RELEASE' | 'ENABLE' | 'DISABLE' | 'DELETE';

export const EventPointList: React.FC<EventPointListProps> = ({ onAddToDrafts }) => {
  const [eventPoints, setEventPoints] = useState<EventPoint[]>(mockEventPoints);
  const [viewMode, setViewMode] = useState<'LIST' | 'VIEW'>('LIST');
  const [currentEventPoint, setCurrentEventPoint] = useState<EventPoint | null>(null);
  const [initialMode, setInitialMode] = useState<'view' | 'edit'>('view');

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Batch Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<BatchActionType>('RELEASE');
  const [batchResult, setBatchResult] = useState<{ success: EventPoint[], skipped: EventPoint[] } | null>(null);

  // --- Search Params State (Inputs) ---
  const [searchParams, setSearchParams] = useState({
    code: '',
    desc: '',
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

  const handleBackToList = () => {
    setViewMode('LIST');
    setCurrentEventPoint(null);
    setSelectedIds(new Set());
  };

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

  // --- Compute related counts ---
  const getRelatedActivationCount = (epCode: string) => {
    return mockActivations.filter(a => a.eventPoint === epCode).length;
  };

  const getRelatedFeatureCount = (epCode: string) => {
    return mockFeatures.filter(f => f.eventPoints.includes(epCode)).length;
  };

  // --- Filtering Logic (Uses appliedFilters) ---
  const filteredEventPoints = useMemo(() => {
    return eventPoints.filter(ep => {
      const matchesCode = ep.eventPoint.toLowerCase().includes(appliedFilters.code.toLowerCase());
      const matchesDesc = ep.description.toLowerCase().includes(appliedFilters.desc.toLowerCase());
      const matchesLifecycle = appliedFilters.lifecycle === 'ALL' || ep.lifecycleState === appliedFilters.lifecycle;
      const matchesStatus = appliedFilters.status === 'ALL' || ep.status.toString() === appliedFilters.status;
      return matchesCode && matchesDesc && matchesLifecycle && matchesStatus;
    });
  }, [eventPoints, appliedFilters]);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredEventPoints.map(ep => ep.id!)));
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

  // --- Actions ---
  const handleDeleteOne = (id: number) => {
    if (confirm('确定要删除该接入点吗？此操作不可恢复。')) {
      setEventPoints(prev => prev.filter(ep => ep.id !== id));
      if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
      }
    }
  };

  // --- Batch Actions Handlers ---
  const openBatchModal = (action: BatchActionType) => {
    setBatchAction(action);
    setBatchResult(null);
    setShowBatchModal(true);
  };

  const checkEligibility = (ep: EventPoint, action: BatchActionType): { eligible: boolean; reason?: string } => {
    switch (action) {
      case 'RELEASE':
        if (ep.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
        return { eligible: false, reason: `非草稿状态 (${t(ep.lifecycleState)})` };
      case 'ENABLE':
        if (ep.status === FeatureStatus.DISABLED) return { eligible: true };
        return { eligible: false, reason: '已处于启用状态' };
      case 'DISABLE':
        if (ep.status === FeatureStatus.ENABLED) return { eligible: true };
        return { eligible: false, reason: '已处于禁用状态' };
      case 'DELETE':
        if (ep.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
        return { eligible: false, reason: `非草稿状态 (${t(ep.lifecycleState)})，不可直接删除` };
      default:
        return { eligible: false };
    }
  };

  const confirmBatchAction = () => {
    const selectedItems = eventPoints.filter(ep => selectedIds.has(ep.id!));
    const eligibleItems: EventPoint[] = [];
    const ineligibleItems: EventPoint[] = [];

    selectedItems.forEach(ep => {
      if (checkEligibility(ep, batchAction).eligible) {
        eligibleItems.push(ep);
      } else {
        ineligibleItems.push(ep);
      }
    });

    if (batchAction === 'RELEASE') {
      eligibleItems.forEach(ep => {
        onAddToDrafts({
          id: `DFT-${Date.now()}-${ep.id}`,
          type: ReleaseType.EVENT_POINT,
          targetId: ep.id!,
          targetName: ep.eventPoint,
          version: 'vNext',
          relatedKeys: ep.eventPoint,
          updatedAt: new Date().toISOString(),
          editor: 'current_user',
          changeSummary: '批量加入发布清单'
        });
      });
      setEventPoints(prev => prev.map(ep => {
        if (eligibleItems.find(item => item.id === ep.id)) {
          return { ...ep, lifecycleState: FeatureLifecycle.READY_FOR_RELEASE };
        }
        return ep;
      }));
    }
    else if (batchAction === 'ENABLE' || batchAction === 'DISABLE') {
      const newStatus = batchAction === 'ENABLE' ? FeatureStatus.ENABLED : FeatureStatus.DISABLED;
      setEventPoints(prev => prev.map(ep => {
        if (eligibleItems.find(item => item.id === ep.id)) {
          return {
            ...ep,
            status: newStatus,
            lifecycleState: FeatureLifecycle.DRAFT,
            updateAt: new Date().toISOString()
          };
        }
        return ep;
      }));
    }
    else if (batchAction === 'DELETE') {
      setEventPoints(prev => prev.filter(ep => !eligibleItems.find(item => item.id === ep.id)));
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
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center border border-slate-200 w-fit"><GitBranch className="w-3 h-3 mr-1"/>草稿</span>;
      case FeatureLifecycle.READY_FOR_RELEASE:
        return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs flex items-center border border-purple-200 w-fit"><ShoppingCart className="w-3 h-3 mr-1"/>待发布</span>;
      case FeatureLifecycle.PUBLISHED:
        return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs flex items-center border border-green-200 w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/>已发布</span>;
      case FeatureLifecycle.ARCHIVED_HISTORY:
        return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs flex items-center border border-orange-200 w-fit"><Archive className="w-3 h-3 mr-1"/>历史归档</span>;
    }
  };

  const getModalConfig = () => {
    switch (batchAction) {
      case 'RELEASE':
        return {
          title: '批量提交待发布确认',
          icon: <ShoppingCart className="w-5 h-5 text-indigo-600" />,
          infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的接入点可以提交至待发布清单。其他状态（如已发布、待发布）将被自动忽略。',
          confirmText: '确认提交',
          confirmBtnClass: 'bg-indigo-600 hover:bg-indigo-700'
        };
      case 'ENABLE':
        return {
          title: '批量启用确认',
          icon: <PlayCircle className="w-5 h-5 text-green-600" />,
          infoBox: '批量启用将为选中的接入点生成新的 <strong>草稿 (Draft)</strong>，并将状态置为启用。如果接入点已启用，则会自动跳过。',
          confirmText: '确认启用',
          confirmBtnClass: 'bg-green-600 hover:bg-green-700'
        };
      case 'DISABLE':
        return {
          title: '批量禁用确认',
          icon: <StopCircle className="w-5 h-5 text-slate-600" />,
          infoBox: '批量禁用将为选中的接入点生成新的 <strong>草稿 (Draft)</strong>，并将状态置为禁用。如果接入点已禁用，则会自动跳过。',
          confirmText: '确认禁用',
          confirmBtnClass: 'bg-slate-600 hover:bg-slate-700'
        };
      case 'DELETE':
        return {
          title: '批量删除确认',
          icon: <Trash2 className="w-5 h-5 text-red-600" />,
          infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的接入点将被删除。已上线或历史归档的版本不会受影响。',
          confirmText: '确认删除',
          confirmBtnClass: 'bg-red-600 hover:bg-red-700'
        };
    }
  };

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

  const selectedEPList = eventPoints.filter(ep => selectedIds.has(ep.id!));
  const modalConfig = getModalConfig();
  const eligibleCountPreview = selectedEPList.filter(ep => checkEligibility(ep, batchAction).eligible).length;

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
          // Standard Filters
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">

              {/* 接入点编码 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">接入点编码</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入编码"
                    className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                    value={searchParams.code}
                    onChange={(e) => setSearchParams({ ...searchParams, code: e.target.value })}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              {/* 描述 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">描述</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入描述关键词"
                    className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                    value={searchParams.desc}
                    onChange={(e) => setSearchParams({ ...searchParams, desc: e.target.value })}
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>
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

      {/* EventPoint Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={filteredEventPoints.length > 0 && selectedIds.size === filteredEventPoints.length} onChange={handleSelectAll} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">接入点编码</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">关联策略数</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">关联特征数</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">生命周期</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">运行状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间/操作人</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredEventPoints.map((ep) => {
                const activationCount = getRelatedActivationCount(ep.eventPoint);
                const featureCount = getRelatedFeatureCount(ep.eventPoint);
                return (
                  <tr key={ep.id} className={`hover:bg-[#f0f7ff] transition-colors group ${selectedIds.has(ep.id!) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={selectedIds.has(ep.id!)} onChange={() => handleSelectOne(ep.id!)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline" onClick={() => handleViewDetail(ep)}>
                        {ep.eventPoint}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{ep.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded border border-blue-200">
                        {activationCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-0.5 rounded border border-purple-200">
                        {featureCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getLifecycleBadge(ep.lifecycleState)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${ep.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : ep.status === FeatureStatus.DISABLED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {t(ep.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {ep.updateAt?.split('T')[0] || '-'}
                      <div className="text-xs text-slate-400">{ep.operator}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleViewDetail(ep)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="查看详情"><FileText className="w-4 h-4 mr-1" />查看</button>
                        <button onClick={() => handleOpenEditor(ep)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="编辑接入点"><Edit className="w-4 h-4 mr-1" />编辑</button>
                        <button onClick={() => handleDeleteOne(ep.id!)} className="flex items-center text-slate-400 hover:text-red-600 transition-colors" title="删除接入点"><Trash2 className="w-4 h-4 mr-1" />删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEventPoints.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>暂无符合条件的接入点</p>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={handleCloseBatchModal}>
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              {modalConfig.icon}
              <h3 className="text-lg font-semibold text-slate-900">{modalConfig.title}</h3>
            </div>
            <div className="px-6 py-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-800 mb-4" dangerouslySetInnerHTML={{ __html: modalConfig.infoBox }} />

              {!batchResult ? (
                <>
                  <p className="text-sm text-slate-700 mb-3">
                    已选择 <strong>{selectedEPList.length}</strong> 个接入点，其中 <strong className="text-green-600">{eligibleCountPreview}</strong> 个符合操作条件。
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedEPList.map(ep => {
                      const result = checkEligibility(ep, batchAction);
                      return (
                        <div key={ep.id} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${result.eligible ? 'bg-green-50 border border-green-100' : 'bg-slate-50 border border-slate-100'}`}>
                          <span className="font-mono text-slate-700">{ep.eventPoint}</span>
                          {result.eligible
                            ? <span className="text-green-600 text-xs">可操作</span>
                            : <span className="text-slate-400 text-xs">{result.reason}</span>
                          }
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {batchResult.success.length > 0 && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-md">
                      <p className="text-sm font-medium text-green-800 mb-1">成功 ({batchResult.success.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {batchResult.success.map(ep => (
                          <span key={ep.id} className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-mono">{ep.eventPoint}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {batchResult.skipped.length > 0 && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-md">
                      <p className="text-sm font-medium text-slate-700 mb-1">已跳过 ({batchResult.skipped.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {batchResult.skipped.map(ep => (
                          <span key={ep.id} className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded font-mono">{ep.eventPoint}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              {!batchResult ? (
                <>
                  <button onClick={handleCloseBatchModal} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                    取消
                  </button>
                  <button
                    onClick={confirmBatchAction}
                    disabled={eligibleCountPreview === 0}
                    className={`px-4 py-2 text-sm text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${modalConfig.confirmBtnClass}`}
                  >
                    {modalConfig.confirmText} ({eligibleCountPreview})
                  </button>
                </>
              ) : (
                <button onClick={handleCloseBatchModal} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors">
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
