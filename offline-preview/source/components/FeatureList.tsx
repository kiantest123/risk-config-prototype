
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Feature, FeatureStatus, FeatureLifecycle, FeatureType, t, DraftItem, ReleaseType } from '../types';
import { FeatureEditor } from './FeatureEditor';
import { FeatureDetail } from './FeatureDetail';
import { Plus, Search, Database, Clock, Zap, Layers, ShoppingCart, GitBranch, CheckCircle2, Archive, FileText, Trash2, PlayCircle, StopCircle, CheckSquare, X, Edit, AlertCircle, Info, ChevronDown, Check } from 'lucide-react';
import { mockFeatures, mockFeatureVersions, suggestionData } from '../mockData';

interface FeatureListProps {
  onAddToDrafts: (item: DraftItem) => void;
}

type BatchActionType = 'RELEASE' | 'ENABLE' | 'DISABLE' | 'DELETE';

// --- Internal Component: MultiSelect Dropdown ---
interface MultiSelectProps {
  options: { id: string; desc: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = '请选择' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const displayValue = useMemo(() => {
    if (selected.length === 0) return placeholder;
    // 只展示ID，不展示描述，更简洁
    return selected.join(', ');
  }, [selected, placeholder]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="min-w-[12rem] w-auto max-w-xs pl-3 pr-8 py-1.5 text-left rounded border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-all relative group"
        onClick={() => setIsOpen(!isOpen)}
        title={selected.map(id => {
            const opt = options.find(o => o.id === id);
            return opt ? `${id} (${opt.desc})` : id;
        }).join('\n')}
      >
        <span className="block truncate">
          {displayValue}
        </span>
        <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-slate-400 group-hover:text-slate-600" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
          <div className="p-2 space-y-1">
             {options.map(opt => {
               const isSelected = selected.includes(opt.id);
               return (
                 <div 
                   key={opt.id} 
                   className={`flex items-start p-2 rounded cursor-pointer text-sm ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                   onClick={() => toggleOption(opt.id)}
                 >
                   <div className={`w-4 h-4 mr-2 border rounded flex items-center justify-center mt-0.5 shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                   </div>
                   <div>
                     <div className="font-medium font-mono">{opt.id}</div>
                     <div className="text-xs text-slate-400">{opt.desc}</div>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>
      )}
    </div>
  );
};

export const FeatureList: React.FC<FeatureListProps> = ({ onAddToDrafts }) => {
  const [features, setFeatures] = useState<Feature[]>(mockFeatures);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL' | 'EDIT'>('LIST');
  const [detailMode, setDetailMode] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [currentFeature, setCurrentFeature] = useState<Feature | null>(null);
  const [readOnlyEditor, setReadOnlyEditor] = useState(false);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Batch Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAction, setBatchAction] = useState<BatchActionType>('RELEASE');
  const [batchResult, setBatchResult] = useState<{ success: Feature[], skipped: Feature[] } | null>(null);

  // --- Search Params State (Inputs) ---
  const [searchParams, setSearchParams] = useState({
    name: '',
    desc: '',
    type: 'ALL',
    lifecycle: 'ALL' as FeatureLifecycle | 'ALL',
    status: 'ALL',
    eventPoints: [] as string[]
  });

  // --- Applied Filters State (Triggered by Search Button) ---
  const [appliedFilters, setAppliedFilters] = useState(searchParams);

  // Trigger Search
  const handleSearch = () => {
    setAppliedFilters({ ...searchParams });
    setSelectedIds(new Set()); // Reset selection on search
  };

  // Logic: Show Online version if exists, otherwise show Draft
  const handleSmartDetail = (feature: Feature) => {
    if (feature.lifecycleState === FeatureLifecycle.PUBLISHED) {
        setCurrentFeature(feature);
        setDetailMode('VIEW');
        setViewMode('DETAIL');
        return;
    }
    const onlineVersion = mockFeatureVersions.find(
        v => v.featureId === feature.id && v.content.lifecycleState === FeatureLifecycle.PUBLISHED
    );
    if (onlineVersion) {
        setCurrentFeature({ ...onlineVersion.content });
    } else {
        setCurrentFeature(feature);
    }
    setDetailMode('VIEW');
    setViewMode('DETAIL');
  };

  const handleCreate = () => {
    setCurrentFeature(null);
    setReadOnlyEditor(false);
    setViewMode('EDIT');
  };

  const handleOpenEditor = (feature: Feature) => {
    setCurrentFeature(feature);
    setReadOnlyEditor(false);
    setViewMode('EDIT');
  };

  const handleViewSnapshot = (feature: Feature) => {
    setCurrentFeature(feature);
    setReadOnlyEditor(true);
    setViewMode('EDIT');
  };

  const handleDetailEditMode = (feature: Feature) => {
    setCurrentFeature(feature);
    setDetailMode('EDIT');
    setViewMode('DETAIL');
  };

  const handleBackToList = () => {
    setViewMode('LIST');
    setCurrentFeature(null);
    setReadOnlyEditor(false);
    setSelectedIds(new Set());
  };

  const handleBackToDetail = () => {
    setReadOnlyEditor(false);
    if (currentFeature?.id) {
       setViewMode('DETAIL');
    } else {
       setViewMode('LIST');
    }
  };

  const handleSave = (feature: Feature) => {
    let savedFeature = feature;
    setFeatures(prev => {
      if (feature.id) {
        return prev.map(f => f.id === feature.id ? feature : f);
      } else {
        const newId = feature.id || Date.now();
        savedFeature = { ...feature, id: newId };
        return [...prev, savedFeature];
      }
    });
    
    if (feature.id) {
        setCurrentFeature(savedFeature);
        setViewMode('DETAIL');
    } else {
        setViewMode('LIST');
    }
    return savedFeature;
  };

  // --- Filtering Logic (Uses appliedFilters) ---
  const filteredFeatures = useMemo(() => {
      return features.filter(f => {
        const matchesName = f.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
        const matchesDesc = f.description.toLowerCase().includes(appliedFilters.desc.toLowerCase());
        const matchesType = appliedFilters.type === 'ALL' || f.type === appliedFilters.type;
        const matchesLifecycle = appliedFilters.lifecycle === 'ALL' || f.lifecycleState === appliedFilters.lifecycle;
        const matchesStatus = appliedFilters.status === 'ALL' || f.status.toString() === appliedFilters.status;
        
        // Multi-select Access Point Logic (OR condition: match ANY selected EP)
        let matchesEP = true;
        if (appliedFilters.eventPoints.length > 0) {
           matchesEP = f.eventPoints.some(ep => appliedFilters.eventPoints.includes(ep));
        }

        return matchesName && matchesDesc && matchesLifecycle && matchesType && matchesStatus && matchesEP;
      });
  }, [features, appliedFilters]);

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredFeatures.map(f => f.id!)));
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
    if (confirm('确定要删除该特征吗？此操作不可恢复。')) {
        setFeatures(prev => prev.filter(f => f.id !== id));
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

  const checkEligibility = (f: Feature, action: BatchActionType): { eligible: boolean; reason?: string } => {
      switch (action) {
          case 'RELEASE':
              if (f.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
              return { eligible: false, reason: `非草稿状态 (${t(f.lifecycleState)})` };
          case 'ENABLE':
              if (f.status === FeatureStatus.DISABLED) return { eligible: true };
              return { eligible: false, reason: '已处于启用状态' };
          case 'DISABLE':
              if (f.status === FeatureStatus.ENABLED) return { eligible: true };
              return { eligible: false, reason: '已处于禁用状态' };
          case 'DELETE':
              if (f.lifecycleState === FeatureLifecycle.DRAFT) return { eligible: true };
              return { eligible: false, reason: `非草稿状态 (${t(f.lifecycleState)})，不可直接删除` };
          default:
              return { eligible: false };
      }
  };

  const confirmBatchAction = () => {
    const selectedItems = features.filter(f => selectedIds.has(f.id!));
    const eligibleItems: Feature[] = [];
    const ineligibleItems: Feature[] = [];

    selectedItems.forEach(f => {
        if (checkEligibility(f, batchAction).eligible) {
            eligibleItems.push(f);
        } else {
            ineligibleItems.push(f);
        }
    });

    if (batchAction === 'RELEASE') {
        eligibleItems.forEach(f => {
            onAddToDrafts({
                id: `DFT-${Date.now()}-${f.id}`,
                type: ReleaseType.FEATURE,
                targetId: f.id!,
                targetName: f.name,
                version: 'vNext', 
                relatedKeys: f.eventPoints.join(', '), 
                updatedAt: new Date().toISOString(),
                editor: 'current_user',
                changeSummary: '批量加入发布清单'
            });
        });
        setFeatures(prev => prev.map(f => {
            if (eligibleItems.find(item => item.id === f.id)) {
                return { ...f, lifecycleState: FeatureLifecycle.READY_FOR_RELEASE };
            }
            return f;
        }));
    } 
    else if (batchAction === 'ENABLE' || batchAction === 'DISABLE') {
        const newStatus = batchAction === 'ENABLE' ? FeatureStatus.ENABLED : FeatureStatus.DISABLED;
        setFeatures(prev => prev.map(f => {
            if (eligibleItems.find(item => item.id === f.id)) {
                return { 
                    ...f, 
                    status: newStatus,
                    lifecycleState: FeatureLifecycle.DRAFT, 
                    updateAt: new Date().toISOString()
                };
            }
            return f;
        }));
    }
    else if (batchAction === 'DELETE') {
        setFeatures(prev => prev.filter(f => !eligibleItems.find(item => item.id === f.id)));
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

  const getTypeIcon = (type: FeatureType) => {
    switch (type) {
      case FeatureType.DIRECT_STORAGE: return <Zap className="w-4 h-4 text-orange-500" />;
      case FeatureType.HISTORY_STORAGE: return <Clock className="w-4 h-4 text-blue-500" />;
      case FeatureType.AGGREGATION: return <Layers className="w-4 h-4 text-indigo-500" />;
      default: return <Database className="w-4 h-4 text-slate-500" />;
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

  const getModalConfig = () => {
      switch (batchAction) {
          case 'RELEASE':
              return {
                  title: '批量提交待发布确认',
                  icon: <ShoppingCart className="w-5 h-5 text-indigo-600" />,
                  infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的特征可以提交至待发布清单。其他状态（如已发布、待发布）将被自动忽略。',
                  confirmText: '确认提交',
                  confirmBtnClass: 'bg-indigo-600 hover:bg-indigo-700'
              };
          case 'ENABLE':
              return {
                  title: '批量启用确认',
                  icon: <PlayCircle className="w-5 h-5 text-green-600" />,
                  infoBox: '批量启用将为选中的特征生成新的 <strong>草稿 (Draft)</strong>，并将状态置为启用。如果特征已启用，则会自动跳过。',
                  confirmText: '确认启用',
                  confirmBtnClass: 'bg-green-600 hover:bg-green-700'
              };
          case 'DISABLE':
              return {
                  title: '批量禁用确认',
                  icon: <StopCircle className="w-5 h-5 text-slate-600" />,
                  infoBox: '批量禁用将为选中的特征生成新的 <strong>草稿 (Draft)</strong>，并将状态置为禁用。如果特征已禁用，则会自动跳过。',
                  confirmText: '确认禁用',
                  confirmBtnClass: 'bg-slate-600 hover:bg-slate-700'
              };
          case 'DELETE':
              return {
                  title: '批量删除确认',
                  icon: <Trash2 className="w-5 h-5 text-red-600" />,
                  infoBox: '仅 <strong>草稿 (Draft)</strong> 状态的特征版本将被删除。若特征存在已上线或历史归档的版本，仅删除当前的草稿版本，历史数据将被保留。',
                  confirmText: '确认删除',
                  confirmBtnClass: 'bg-red-600 hover:bg-red-700'
              };
      }
  };

  if (viewMode === 'EDIT') {
    return (
      <FeatureEditor 
        initialFeature={currentFeature}
        onSave={handleSave}
        onCancel={handleBackToDetail}
        onAddToDrafts={onAddToDrafts}
        readOnly={readOnlyEditor}
      />
    );
  }

  if (viewMode === 'DETAIL' && currentFeature) {
    return (
      <FeatureDetail 
        feature={currentFeature}
        onBack={handleBackToList}
        onEdit={handleOpenEditor}
        onViewSnapshot={handleViewSnapshot}
        mode={detailMode}
      />
    );
  }

  const selectedFeaturesList = features.filter(f => selectedIds.has(f.id!));
  const modalConfig = getModalConfig();
  const previewData = selectedFeaturesList.map(feature => ({
    feature,
    eligibility: checkEligibility(feature, batchAction)
  }));
  const eligiblePreview = previewData.filter(item => item.eligibility.eligible);
  const ineligiblePreview = previewData.filter(item => !item.eligibility.eligible);
  const eligibleCountPreview = eligiblePreview.length;

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
                    
                    {/* 接入点 (Multi Select) - Moved to 1st Position */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">接入点</label>
                        <MultiSelect 
                           options={suggestionData.eventPoints}
                           selected={searchParams.eventPoints}
                           onChange={(selected) => setSearchParams({...searchParams, eventPoints: selected})}
                           placeholder="全部接入点"
                        />
                    </div>

                    {/* 特征类型 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">特征类型</label>
                        <select 
                            className="w-32 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                            value={searchParams.type}
                            onChange={(e) => setSearchParams({...searchParams, type: e.target.value})}
                        >
                            <option value="ALL">全部类型</option>
                            {Object.values(FeatureType).map(tVal => <option key={tVal} value={tVal}>{t(tVal)}</option>)}
                        </select>
                    </div>

                    {/* 特征名 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">特征名</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="输入特征标识" 
                                className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                                value={searchParams.name}
                                onChange={(e) => setSearchParams({...searchParams, name: e.target.value})}
                            />
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>

                    {/* 特征描述 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">特征描述</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="输入中文描述" 
                                className="w-40 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
                                value={searchParams.desc}
                                onChange={(e) => setSearchParams({...searchParams, desc: e.target.value})}
                            />
                            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>

                    {/* 发布状态 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">发布状态</label>
                        <select 
                            className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                            value={searchParams.lifecycle}
                            onChange={(e) => setSearchParams({...searchParams, lifecycle: e.target.value as FeatureLifecycle | 'ALL'})}
                        >
                            <option value="ALL">全部状态</option>
                            <option value={FeatureLifecycle.PUBLISHED}>已发布</option>
                            <option value={FeatureLifecycle.READY_FOR_RELEASE}>待发布</option>
                            <option value={FeatureLifecycle.DRAFT}>草稿</option>
                        </select>
                    </div>

                    {/* 启用状态 */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">启用状态</label>
                        <select 
                            className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                            value={searchParams.status}
                            onChange={(e) => setSearchParams({...searchParams, status: e.target.value})}
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

      {/* Feature Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-4 w-10">
                    <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={filteredFeatures.length > 0 && selectedIds.size === filteredFeatures.length} onChange={handleSelectAll} />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">特征信息</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">特征类型</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">数据来源</th>
                {/* New Column: Access Points */}
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">接入点</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">发布状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">启用状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间/操作人</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {filteredFeatures.map((feature) => (
                <tr key={feature.id} className={`hover:bg-[#f0f7ff] transition-colors group ${selectedIds.has(feature.id!) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                     <input type="checkbox" className="w-4 h-4 text-indigo-600 border-slate-300 rounded" checked={selectedIds.has(feature.id!)} onChange={() => handleSelectOne(feature.id!)} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                       <div className="mr-3 p-2 rounded bg-slate-50 text-slate-400 border border-slate-100">{getTypeIcon(feature.type)}</div>
                       <div>
                          <div className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline" onClick={() => handleSmartDetail(feature)}>{feature.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{feature.description}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">{t(feature.type)}</span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-xs text-slate-600 flex items-center">
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${feature.writeSource === 'REALTIME' ? 'bg-green-400' : 'bg-orange-400'}`}></span>
                        {t(feature.writeSource)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {feature.eventPoints && feature.eventPoints.length > 0 ? (
                           feature.eventPoints.map(ep => (
                             <span key={ep} className="bg-slate-50 text-slate-600 text-[10px] px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                               {ep}
                             </span>
                           ))
                        ) : <span className="text-xs text-slate-300">-</span>}
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getLifecycleBadge(feature.lifecycleState)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${feature.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : feature.status === FeatureStatus.DISABLED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                       {t(feature.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {feature.updateAt?.split('T')[0] || '-'}
                    <div className="text-xs text-slate-400">{feature.operator}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleSmartDetail(feature)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="查看详情"><FileText className="w-4 h-4 mr-1" />查看</button>
                        <button onClick={() => handleDetailEditMode(feature)} className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors" title="编辑特征"><Edit className="w-4 h-4 mr-1" />编辑</button>
                        <button onClick={() => handleDeleteOne(feature.id!)} className="flex items-center text-slate-400 hover:text-red-600 transition-colors" title="删除特征"><Trash2 className="w-4 h-4 mr-1" />删除</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFeatures.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 mb-2 opacity-20" />
                      <p>暂无符合条件的特征</p>
                      <button onClick={handleSearch} className="text-indigo-600 text-xs mt-2 hover:underline">请点击查询按钮搜索</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
      </div>

    {/* Batch Operation Modal */}
    {showBatchModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-8">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-full">
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
                {modalConfig?.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{modalConfig?.title}</h2>
                <p className="text-sm text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: modalConfig?.infoBox || '' }} />
              </div>
            </div>
            <button onClick={handleCloseBatchModal} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {batchResult ? (
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">批量提交成功</h3>
                  <p className="text-sm text-slate-500 mt-2">
                    {batchResult.success.length} 个特征已加入待发布清单，{batchResult.skipped.length} 个被自动跳过。
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-600">成功加入</p>
                    <p className="text-3xl font-semibold text-emerald-700 mt-1">{batchResult.success.length}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs text-amber-600">跳过处理</p>
                    <p className="text-3xl font-semibold text-amber-700 mt-1">{batchResult.skipped.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <p className="text-xs text-slate-500">批量动作</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">
                      {batchAction === 'RELEASE' ? '加入待发布' : batchAction === 'ENABLE' ? '批量启用' : batchAction === 'DISABLE' ? '批量禁用' : '批量删除'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                  <div className="border border-slate-100 rounded-xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-600">已加入待发布 ({batchResult.success.length})</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {batchResult.success.length === 0 && <p className="text-xs text-slate-400">暂无记录</p>}
                      {batchResult.success.map(item => (
                        <div key={item.id} className="bg-emerald-50 text-emerald-800 text-sm rounded-lg px-3 py-2 flex justify-between items-center">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-emerald-600">{t(item.lifecycleState)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-600">被跳过 ({batchResult.skipped.length})</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {batchResult.skipped.length === 0 && <p className="text-xs text-slate-400">没有特征被跳过</p>}
                      {batchResult.skipped.map(item => (
                        <div key={item.id} className="bg-white border border-amber-100 text-sm rounded-lg px-3 py-2">
                          <div className="font-medium text-slate-700">{item.name}</div>
                          <div className="text-xs text-amber-600 mt-1">原因：{t(item.lifecycleState)} / {t(item.status)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="text-xs text-slate-500">已选择</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">{selectedIds.size}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-600">符合条件</p>
                    <p className="text-2xl font-semibold text-emerald-700 mt-1">{eligibleCountPreview}</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-xs text-amber-600">将被跳过</p>
                    <p className="text-2xl font-semibold text-amber-700 mt-1">{ineligiblePreview.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-600">可立即处理 ({eligiblePreview.length})</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {eligiblePreview.length === 0 && <p className="text-xs text-slate-400">暂无符合条件的特征</p>}
                      {eligiblePreview.map(item => (
                        <div key={item.feature.id} className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          <span className="font-medium">{item.feature.name}</span>
                          <span className="text-xs text-slate-400">{t(item.feature.lifecycleState)} · {t(item.feature.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-slate-600">将被跳过 ({ineligiblePreview.length})</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {ineligiblePreview.length === 0 && <p className="text-xs text-slate-400">没有需要跳过的特征</p>}
                      {ineligiblePreview.map(item => (
                        <div key={item.feature.id} className="text-sm text-slate-600 bg-white border border-amber-100 rounded-lg px-3 py-2">
                          <div className="font-medium">{item.feature.name}</div>
                          <div className="text-xs text-amber-600 mt-1">{item.eligibility.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 p-6">
            <button onClick={handleCloseBatchModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
              取消
            </button>
            {batchResult ? (
              <button onClick={handleCloseBatchModal} className="px-5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800">
                关闭
              </button>
            ) : (
              <button onClick={confirmBatchAction} className={`px-5 py-2 rounded-lg text-white ${modalConfig?.confirmBtnClass || 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {modalConfig?.confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};
