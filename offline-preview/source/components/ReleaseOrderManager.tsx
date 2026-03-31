
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ReleaseOrder, ReleaseStatus, ReleaseType, DraftItem, t } from '../types';
import { ReleaseOrderEditor } from './ReleaseOrderEditor';
import { Search, FileText, CheckCircle2, XCircle, Clock, Loader2, Plus, ArrowRight, Trash2, Filter, ChevronDown, Check, ArrowLeft, User, Calendar, ShieldCheck, AlertTriangle, Layers, Rocket, Play, Activity } from 'lucide-react';
import { suggestionData } from '../mockData';

// ---------------- Helper Components ----------------

const getStatusBadge = (status: ReleaseStatus) => {
  switch (status) {
    case ReleaseStatus.APPROVED:
      // 已审核 (Waiting for Publish)
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-xs flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/>{t(status)}</span>;
    case ReleaseStatus.PUBLISHED:
      // 已发布 (Done)
      return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/>{t(status)}</span>;
    case ReleaseStatus.REJECTED:
    case ReleaseStatus.FAILED:
      return <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs flex items-center w-fit"><XCircle className="w-3 h-3 mr-1"/>{t(status)}</span>;
    case ReleaseStatus.PUBLISHING:
      return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-xs flex items-center w-fit"><Loader2 className="w-3 h-3 mr-1 animate-spin"/>{t(status)}</span>;
    default:
      // 待审核 (Pending)
      return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-xs flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/>{t(status)}</span>;
  }
};

const getTypeBadge = (type: ReleaseType) => {
  const colors = {
      [ReleaseType.FEATURE]: 'text-purple-600 bg-purple-50 border-purple-100',
      [ReleaseType.POLICY]: 'text-blue-600 bg-blue-50 border-blue-100',
      [ReleaseType.RULE]: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      [ReleaseType.EVENT_POINT]: 'text-slate-600 bg-slate-50 border-slate-100'
  };
  return <span className={`px-2 py-0.5 rounded text-xs border ${colors[type]}`}>{t(type)}</span>;
};

// --- MultiSelect Dropdown (Shared Logic) ---
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
    return selected.map(id => {
       const opt = options.find(o => o.id === id);
       return opt ? opt.desc : id; // Show Desc instead of ID for cleaner UI in status filter
    }).join(', ');
  }, [selected, placeholder, options]);

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
                     <div className="font-medium">{opt.desc}</div>
                     <div className="text-xs text-slate-400 font-mono">{opt.id}</div>
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

// ---------------- Component 1: ReleaseCandidates (待发布清单) ----------------

interface ReleaseCandidatesProps {
  drafts: DraftItem[];
  onCreateOrder: (order: ReleaseOrder) => void;
}

export const ReleaseCandidates: React.FC<ReleaseCandidatesProps> = ({ drafts, onCreateOrder }) => {
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  
  // Search Inputs State
  const [inputs, setInputs] = useState({
    name: '',
    ep: [] as string[],
    type: 'ALL'
  });

  // Active Filters (Triggered by button)
  const [filters, setFilters] = useState(inputs);

  const handleSearch = () => {
    setFilters({...inputs});
    setSelectedDraftIds(new Set());
  };

  const handleToggleDraft = (id: string) => {
    const newSet = new Set(selectedDraftIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDraftIds(newSet);
  };

  const handleSaveOrder = (newOrder: ReleaseOrder) => {
    onCreateOrder(newOrder);
    setIsCreating(false);
    setSelectedDraftIds(new Set());
  };

  const filteredDrafts = drafts.filter(d => {
    const matchesName = d.targetName.toLowerCase().includes(filters.name.toLowerCase()) || 
                        d.targetId.toString().includes(filters.name.toLowerCase());
    
    // Access Point Logic: OR condition
    const matchesEp = filters.ep.length === 0 || 
                     (d.relatedKeys && filters.ep.some(filterEp => d.relatedKeys?.includes(filterEp)));

    const matchesType = filters.type === 'ALL' || d.type === filters.type;
    
    return matchesName && matchesEp && matchesType;
  });

  if (isCreating) {
    const selectedDraftItems = drafts.filter(d => selectedDraftIds.has(d.id));
    return (
      <ReleaseOrderEditor 
        initialDrafts={selectedDraftItems}
        onSave={handleSaveOrder}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Detailed Search Header */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
                
                {/* 接入点 (MultiSelect) - Moved to first position */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">接入点</label>
                    <MultiSelect 
                       options={suggestionData.eventPoints}
                       selected={inputs.ep}
                       onChange={(selected) => setInputs({...inputs, ep: selected})}
                       placeholder="全部接入点"
                    />
                </div>

                {/* 类型 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">类型</label>
                    <div className="relative">
                        <select 
                            className="appearance-none pl-9 pr-8 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] bg-white text-slate-700 w-40"
                            value={inputs.type}
                            onChange={(e) => setInputs({...inputs, type: e.target.value})}
                        >
                            <option value="ALL">全部类型</option>
                            {Object.values(ReleaseType).map(tVal => <option key={tVal} value={tVal}>{t(tVal)}</option>)}
                        </select>
                        <Filter className="absolute left-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* 对象名称 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">对象名称 / ID</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="输入名称或ID" 
                            className="w-48 pl-8 pr-3 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff]"
                            value={inputs.name}
                            onChange={(e) => setInputs({...inputs, name: e.target.value})}
                        />
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                    </div>
                </div>

                <div className="flex-1 text-right flex items-end justify-end gap-3">
                    <button 
                       onClick={handleSearch}
                       className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-[#1890ff] rounded shadow-sm hover:bg-[#40a9ff] transition-colors whitespace-nowrap"
                    >
                       <Search className="w-4 h-4 mr-2" />
                       查询
                    </button>
                    <button 
                        onClick={() => setIsCreating(true)}
                        disabled={selectedDraftIds.size === 0}
                        className={`inline-flex items-center px-4 py-1.5 text-sm font-medium text-[#1890ff] border border-[#1890ff] rounded shadow-sm transition-colors whitespace-nowrap bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed`}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        生成发布单 ({selectedDraftIds.size})
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Draft List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-[#fafafa]">
                <tr>
                  <th className="px-6 py-4 text-left w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDraftIds(new Set(filteredDrafts.map(d => d.id)));
                        else setSelectedDraftIds(new Set());
                      }}
                      checked={filteredDrafts.length > 0 && selectedDraftIds.size === filteredDrafts.length}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">类型</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">版本号</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">对象名称 / ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">接入点</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">变更摘要</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">更新时间/操作人</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDrafts.map(draft => (
                  <tr key={draft.id} className={`hover:bg-[#f0f7ff] transition-colors cursor-pointer ${selectedDraftIds.has(draft.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => handleToggleDraft(draft.id)}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedDraftIds.has(draft.id)}
                        onChange={() => handleToggleDraft(draft.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(draft.type)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                            {draft.version}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 whitespace-nowrap">{draft.targetName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 whitespace-nowrap">{draft.targetId}</div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                          {draft.relatedKeys || '-'}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={draft.changeSummary}>{draft.changeSummary}</td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      <div>{draft.updatedAt}</div>
                      <div className="text-slate-400">By {draft.editor}</div>
                    </td>
                  </tr>
                ))}
                {filteredDrafts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center">
                          <Search className="w-8 h-8 mb-2 opacity-20" />
                          <p>暂无符合条件的待发布项</p>
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

// ---------------- Component 2: ReleaseOrderDetail (发布单详情 & 审核) ----------------

interface ReleaseOrderDetailProps {
    order: ReleaseOrder;
    onBack: () => void;
    onAudit: (id: string, newStatus: ReleaseStatus, comment: string) => void;
    onPublish: (id: string) => void;
}

const ReleaseOrderDetail: React.FC<ReleaseOrderDetailProps> = ({ order, onBack, onAudit, onPublish }) => {
    const [auditComment, setAuditComment] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // 状态判断
    const isPending = order.status === ReleaseStatus.PENDING;
    const isApproved = order.status === ReleaseStatus.APPROVED;
    const isPublished = order.status === ReleaseStatus.PUBLISHED;

    const handlePublishClick = () => {
        setIsPublishing(true);
        // Simulate network delay
        setTimeout(() => {
            onPublish(order.id);
            setIsPublishing(false);
        }, 1500);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                            {order.title}
                            {getStatusBadge(order.status)}
                        </h2>
                        <div className="text-sm text-slate-500 font-mono mt-0.5">
                            {order.id}
                        </div>
                    </div>
                </div>
                {/* 状态展示区 (Top Right) */}
                {isPublished && (
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-sm text-blue-700 flex items-center gap-2">
                         <Rocket className="w-4 h-4" />
                         <span>发布完成: {order.finishTime || '-'}</span>
                    </div>
                )}
                {isApproved && (
                    <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-sm text-emerald-700 flex items-center gap-2">
                         <CheckCircle2 className="w-4 h-4" />
                         <span>审核通过，等待发布</span>
                         <span className="text-emerald-500 text-xs">| 审核人: {order.approver}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Items */}
                <div className="lg:col-span-2 space-y-6">
                     
                     {/* Basic Info Card */}
                     <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                             <FileText className="w-4 h-4 text-indigo-500" />
                             基础信息
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 block">申请人</span>
                                <div className="flex items-center gap-2 font-medium text-slate-700">
                                     <User className="w-3 h-3 text-slate-400" />
                                     {order.applicant}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-xs text-slate-500 block">申请时间</span>
                                <div className="flex items-center gap-2 font-medium text-slate-700">
                                     <Calendar className="w-3 h-3 text-slate-400" />
                                     {order.applyTime}
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <span className="text-xs text-slate-500 block">变更说明</span>
                                <div className="text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 leading-relaxed">
                                    {order.description}
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Items List */}
                     <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" />
                                变更对象清单 ({order.items.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="p-4 hover:bg-[#f8fafc] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {getTypeBadge(item.type)}
                                            <span className="font-medium text-slate-800 text-sm">{item.targetName}</span>
                                            <span className="text-xs font-mono text-slate-400">ID: {item.targetId}</span>
                                        </div>
                                        {item.relatedKeys && (
                                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                                接入点: {item.relatedKeys}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-600 pl-2 border-l-2 border-slate-200 ml-1 mt-2">
                                        变更摘要: {item.changeSummary || '无详细描述'}
                                    </div>
                                </div>
                            ))}
                        </div>
                     </div>
                </div>

                {/* Right Column: Action Panel */}
                <div className="space-y-6">
                    {/* CASE 1: 待审核 (Pending) */}
                    {isPending && (
                        <div className="bg-white rounded-lg border border-orange-200 shadow-lg p-6 sticky top-6">
                            <div className="flex items-center gap-2 mb-4 text-orange-700 font-bold text-lg">
                                <ShieldCheck className="w-5 h-5" />
                                审批操作
                            </div>
                            <div className="space-y-4">
                                <div className="p-3 bg-orange-50 rounded text-xs text-orange-800 leading-relaxed border border-orange-100">
                                    <AlertTriangle className="w-3 h-3 inline mr-1 mb-0.5" />
                                    请仔细核对左侧的变更清单。审批通过后，发布单将进入“待发布”状态。
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">审批意见</label>
                                    <textarea 
                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
                                        placeholder="请输入通过或驳回的理由..."
                                        value={auditComment}
                                        onChange={(e) => setAuditComment(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button 
                                        onClick={() => onAudit(order.id, ReleaseStatus.REJECTED, auditComment)}
                                        className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors text-sm"
                                    >
                                        驳回申请
                                    </button>
                                    <button 
                                        onClick={() => onAudit(order.id, ReleaseStatus.APPROVED, auditComment)}
                                        className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-medium transition-colors text-sm shadow-md shadow-orange-200"
                                    >
                                        审批通过
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CASE 2: 已审核 (Approved) -> 等待发布 */}
                    {isApproved && (
                         <div className="bg-white rounded-lg border border-emerald-200 shadow-lg p-6 sticky top-6 animate-in fade-in zoom-in duration-300">
                             <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold text-lg">
                                 <Rocket className="w-5 h-5" />
                                 发布操作
                             </div>
                             <div className="space-y-4">
                                 <div className="p-3 bg-emerald-50 rounded text-xs text-emerald-800 leading-relaxed border border-emerald-100">
                                     <Activity className="w-3 h-3 inline mr-1 mb-0.5" />
                                     发布单已审核通过。点击下方按钮将配置推送到线上环境。此操作不可逆。
                                 </div>
                                 
                                 <div className="bg-slate-50 p-3 rounded border border-slate-200">
                                     <div className="text-xs text-slate-500 mb-1">审批人留言:</div>
                                     <div className="text-sm text-slate-700 italic">"{order.description || '无'}"</div>
                                 </div>

                                 <button 
                                     onClick={handlePublishClick}
                                     disabled={isPublishing}
                                     className="w-full py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold transition-all text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:bg-emerald-400 disabled:cursor-wait"
                                 >
                                     {isPublishing ? (
                                         <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            正在发布中...
                                         </>
                                     ) : (
                                         <>
                                            <Play className="w-4 h-4 fill-current" />
                                            立即发布
                                         </>
                                     )}
                                 </button>
                             </div>
                         </div>
                    )}

                    {/* CASE 3: 已发布 (Published) or Rejected */}
                    {!isPending && !isApproved && (
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 sticky top-6">
                             <div className="text-center text-slate-400 mb-4">
                                 <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                 <p className="text-sm">该发布单流程已结束</p>
                             </div>
                             <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-slate-200">
                                    <span className="text-slate-500">最终状态</span>
                                    <span className="font-medium">{t(order.status)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-200">
                                    <span className="text-slate-500">处理人</span>
                                    <span className="font-medium">{order.approver || '-'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-200">
                                    <span className="text-slate-500">结束时间</span>
                                    <span className="font-medium">{order.finishTime || '-'}</span>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ---------------- Component 3: ReleaseOrderList (发布单列表) ----------------

interface ReleaseOrderListProps {
  orders: ReleaseOrder[];
  onUpdateOrder: (order: ReleaseOrder) => void;
}

// 状态筛选选项：拆分 Pending, Audited (Approved), Published
const STATUS_OPTIONS = [
    { id: 'PENDING', desc: '待审核' },
    { id: 'APPROVED', desc: '已审核 (待发布)' },
    { id: 'PUBLISHED', desc: '已发布' },
    { id: 'REJECTED', desc: '已驳回' }
];

export const ReleaseOrderList: React.FC<ReleaseOrderListProps> = ({ orders, onUpdateOrder }) => {
  const [viewingOrder, setViewingOrder] = useState<ReleaseOrder | null>(null);
  
  // Feedback Modal State
  const [resultModal, setResultModal] = useState({
      isOpen: false,
      type: 'success' as 'success' | 'error',
      title: '',
      subTitle: ''
  });

  const [inputs, setInputs] = useState({
     orderId: '',
     targetKeyword: '',
     type: 'ALL',
     ep: [] as string[],
     statusGroup: [] as string[] // New Status Filter
  });
  const [filters, setFilters] = useState(inputs);

  const handleSearch = () => {
     setFilters({...inputs});
  };

  const handleAudit = (id: string, newStatus: ReleaseStatus, comment: string) => {
      const order = orders.find(o => o.id === id);
      if (order) {
          const updatedOrder: ReleaseOrder = {
              ...order,
              status: newStatus,
              approver: 'current_user',
              // If rejected, finish time is now. If approved, finish time is pending publish.
              finishTime: newStatus === ReleaseStatus.REJECTED ? new Date().toISOString().replace('T', ' ').slice(0, 19) : undefined,
          };
          onUpdateOrder(updatedOrder);
          
          // Show Feedback Modal
          const isApproved = newStatus === ReleaseStatus.APPROVED;
          setResultModal({
              isOpen: true,
              type: isApproved ? 'success' : 'error',
              title: isApproved ? '审核通过' : '申请已驳回',
              subTitle: isApproved 
                ? `发布单 ${id} 已通过审核，状态变更为“待发布”。请通知发布负责人执行上线操作。`
                : `发布单 ${id} 已被驳回，流程结束。`
          });
      }
  };

  const handlePublish = (id: string) => {
      const order = orders.find(o => o.id === id);
      if (order) {
          const updatedOrder: ReleaseOrder = {
              ...order,
              status: ReleaseStatus.PUBLISHED,
              finishTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
          };
          onUpdateOrder(updatedOrder);
          
          // Show Feedback Modal
          setResultModal({
              isOpen: true,
              type: 'success',
              title: '发布成功',
              subTitle: `发布单 ${id} 的配置已成功推送到线上环境，立即生效。`
          });
      }
  };
  
  const handleCloseModal = () => {
      setResultModal(prev => ({ ...prev, isOpen: false }));
      setViewingOrder(null); // Return to list view
  };

  const filteredOrders = orders.filter(o => {
    // 1. Filter by Order ID
    const matchOrderId = !filters.orderId || o.id.toLowerCase().includes(filters.orderId.toLowerCase());
    
    // 2. Filter by EP (Any item matches any EP)
    const matchesEp = filters.ep.length === 0 || 
        o.items.some(i => i.relatedKeys && filters.ep.some(sel => i.relatedKeys?.includes(sel)));

    // 3. Filter by Type (Any item matches Type)
    const matchesType = filters.type === 'ALL' || o.items.some(i => i.type === filters.type);

    // 4. Filter by Target Name/ID (Any item matches keyword)
    const matchesTarget = !filters.targetKeyword || 
        o.items.some(i => i.targetName.toLowerCase().includes(filters.targetKeyword.toLowerCase()) || 
                          i.targetId.toString().toLowerCase().includes(filters.targetKeyword.toLowerCase()));
    
    // 5. Filter by Status Group (Exact match on ID)
    let matchesStatus = true;
    if (filters.statusGroup.length > 0) {
        matchesStatus = filters.statusGroup.includes(o.status);
    }

    return matchOrderId && matchesEp && matchesType && matchesTarget && matchesStatus;
  });

  if (viewingOrder) {
      // Find the latest version of the order from props to ensure status is up to date
      const currentOrder = orders.find(o => o.id === viewingOrder.id) || viewingOrder;
      
      return (
          <>
            <ReleaseOrderDetail 
                order={currentOrder} 
                onBack={() => setViewingOrder(null)} 
                onAudit={handleAudit}
                onPublish={handlePublish}
            />
            {/* Feedback Modal Overlay (Rendered here to cover detail view) */}
            {resultModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${resultModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {resultModal.type === 'success' ? (
                                <CheckCircle2 className={`w-8 h-8 ${resultModal.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
                            ) : (
                                <XCircle className="w-8 h-8 text-red-600" />
                            )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{resultModal.title}</h3>
                        <p className="text-sm text-slate-500 mb-6 text-center leading-relaxed">
                            {resultModal.subTitle}
                        </p>
                        
                        <button 
                            onClick={handleCloseModal}
                            className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                        >
                            返回发布单列表
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                    </div>
                </div>
            )}
          </>
      );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header / Filter */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
         <div className="flex flex-col gap-4">
             <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
                 
                 {/* 接入点 - Moved to first position */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">接入点</label>
                    <MultiSelect 
                       options={suggestionData.eventPoints}
                       selected={inputs.ep}
                       onChange={(selected) => setInputs({...inputs, ep: selected})}
                       placeholder="全部接入点"
                    />
                 </div>

                 {/* Status Filter (Updated) */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">发布单状态</label>
                    <MultiSelect 
                       options={STATUS_OPTIONS}
                       selected={inputs.statusGroup}
                       onChange={(selected) => setInputs({...inputs, statusGroup: selected})}
                       placeholder="全部状态"
                    />
                 </div>
                 
                 {/* 类型 */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">类型</label>
                    <div className="relative">
                        <select 
                            className="appearance-none pl-9 pr-8 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] bg-white text-slate-700 w-32"
                            value={inputs.type}
                            onChange={(e) => setInputs({...inputs, type: e.target.value})}
                        >
                            <option value="ALL">全部类型</option>
                            {Object.values(ReleaseType).map(tVal => <option key={tVal} value={tVal}>{t(tVal)}</option>)}
                        </select>
                        <Filter className="absolute left-2.5 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                 {/* 发布单号 */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">发布单号</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="输入发布单号" 
                            className="w-40 pl-8 pr-4 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff]"
                            value={inputs.orderId}
                            onChange={(e) => setInputs({...inputs, orderId: e.target.value})}
                        />
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                    </div>
                 </div>

                 {/* 对象名称/ID */}
                 <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">对象名称 / ID</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="输入变更对象..." 
                            className="w-40 pl-8 pr-4 py-1.5 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff]"
                            value={inputs.targetKeyword}
                            onChange={(e) => setInputs({...inputs, targetKeyword: e.target.value})}
                        />
                        <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                    </div>
                 </div>

                 <div className="flex-1 text-right flex justify-end gap-3">
                    <button 
                       onClick={handleSearch}
                       className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-[#1890ff] rounded shadow-sm hover:bg-[#40a9ff] transition-colors whitespace-nowrap"
                    >
                       <Search className="w-4 h-4 mr-2" />
                       查询
                    </button>
                 </div>
             </div>
         </div>
      </div>

      {/* Order List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">发布单号</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">标题 / 描述</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">发布内容 (对象)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">更新时间/操作人</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-[#f0f7ff] transition-colors group">
                  <td className="px-6 py-4 align-top">
                      <div className="text-xs font-mono font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit select-all whitespace-nowrap cursor-pointer hover:bg-indigo-50 hover:text-indigo-600" onClick={() => setViewingOrder(order)}>
                          {order.id}
                      </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3 min-w-[200px]">
                      <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-100 text-slate-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 cursor-pointer hover:text-indigo-600" onClick={() => setViewingOrder(order)}>{order.title}</div>
                        <div className="text-xs text-slate-500 mt-1 max-w-xs line-clamp-2">{order.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="space-y-2 min-w-[200px]">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-slate-50 p-1.5 rounded border border-slate-100">
                              {getTypeBadge(item.type)}
                              <span className="text-slate-700 truncate max-w-[120px]" title={item.targetName}>{item.targetName}</span>
                              <span className="text-slate-400 text-xs hidden xl:inline">({item.targetId})</span>
                              {item.relatedKeys && (
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded font-mono ml-1">{item.relatedKeys}</span>
                              )}
                          </div>
                        ))}
                        <div className="text-xs text-slate-400 pl-1">共 {order.items.length} 个变更对象</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 align-top whitespace-nowrap">
                    <div>{order.applyTime}</div>
                    <div className="text-slate-400 text-xs">By {order.applicant}</div>
                  </td>
                  <td className="px-6 py-4 text-right align-top whitespace-nowrap">
                    <button 
                        onClick={() => setViewingOrder(order)}
                        className="text-[#1890ff] hover:underline text-sm font-medium flex items-center justify-end w-full"
                    >
                        查看详情 <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 bg-slate-50/50">
                      <div className="flex flex-col items-center">
                          <Search className="w-8 h-8 mb-2 opacity-20" />
                          <p>暂无符合条件的发布单</p>
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
