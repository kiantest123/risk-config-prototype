import React, { useState } from 'react';
import { ReleaseOrder, ReleaseType, ReleaseStatus, DraftItem, ReleaseTarget, t } from '../types';
import { Save, X, Plus, Trash2, FileText } from 'lucide-react';
import { mockFeatures, mockPolicies } from '../mockData';

interface ReleaseOrderEditorProps {
  initialDrafts: DraftItem[]; // The items selected from the draft pool
  onSave: (order: ReleaseOrder) => void;
  onCancel: () => void;
}

export const ReleaseOrderEditor: React.FC<ReleaseOrderEditorProps> = ({ initialDrafts, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Transform initial drafts into ReleaseTargets
  const [items, setItems] = useState<ReleaseTarget[]>(
    initialDrafts.map(draft => ({
      type: draft.type,
      targetId: draft.targetId,
      targetName: draft.targetName,
      changeSummary: draft.changeSummary,
      relatedKeys: draft.relatedKeys
    }))
  );

  // Manual Add State
  const [manualType, setManualType] = useState<ReleaseType>(ReleaseType.FEATURE);
  const [manualTargetId, setManualTargetId] = useState<string>('');
  const [manualSummary, setManualSummary] = useState('');

  // Determine available targets based on manual type (for the manual add feature)
  const getTargets = () => {
    switch (manualType) {
      case ReleaseType.FEATURE:
        return mockFeatures.map(f => ({ id: f.id!, name: f.name, desc: f.description, ep: f.eventPoints.join(',') }));
      case ReleaseType.POLICY:
        return mockPolicies.map(p => ({ id: p.policyId, name: p.name, desc: p.remark, ep: p.scope.eventPoint }));
      default:
        return [];
    }
  };
  const targets = getTargets();

  const handleManualAdd = () => {
    if (!manualTargetId) return;
    const targetObj = targets.find(t => t.id.toString() === manualTargetId.toString());
    const newItem: ReleaseTarget = {
      type: manualType,
      targetId: manualTargetId,
      targetName: targetObj ? targetObj.name : 'Unknown',
      changeSummary: manualSummary || '手动添加变更对象',
      relatedKeys: targetObj?.ep || ''
    };
    
    // Check duplicates
    if (items.some(i => i.type === newItem.type && i.targetId.toString() === newItem.targetId.toString())) {
      alert('该对象已在清单中');
      return;
    }

    setItems([...items, newItem]);
    // Reset manual input
    setManualTargetId('');
    setManualSummary('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('发布清单不能为空，请至少选择一个变更对象。');
      return;
    }

    const newOrder: ReleaseOrder = {
      id: `REL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000)}`,
      title,
      items,
      status: ReleaseStatus.PENDING,
      applicant: 'current_user',
      applyTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      description
    };
    onSave(newOrder);
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800">创建发布单</h2>
           <p className="text-sm text-slate-500 mt-1">请核对下方的发布清单，确认无误后提交审批。</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 gap-6">
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">发布标题 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：双11大促第一波风控策略上线"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">整体变更说明 <span className="text-red-500">*</span></label>
            <textarea 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请描述本次发布的背景、涉及业务及预期影响..."
            />
          </div>
        </div>

        {/* Items List */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              发布清单 (共 {items.length} 个对象)
            </h3>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
             {items.length === 0 ? (
               <div className="p-8 text-center text-slate-400">
                 暂无发布对象，请从草稿池选择或下方手动添加
               </div>
             ) : (
               items.map((item, idx) => (
                 <div key={`${item.type}-${item.targetId}`} className="p-4 bg-white flex items-start justify-between group hover:bg-slate-50">
                    <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                          {getTypeBadge(item.type)}
                          <span className="font-medium text-slate-800 text-sm">{item.targetName}</span>
                          <span className="text-xs text-slate-400 font-mono">({item.targetId})</span>
                       </div>
                       <div className="text-xs text-slate-500 pl-1 mt-1">
                          <span className="font-mono text-slate-400 mr-2">EP: {item.relatedKeys || '-'}</span>
                          <span className="border-l border-slate-200 pl-2">{item.changeSummary || '无变更摘要'}</span>
                       </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-300 hover:text-red-500 p-1"
                      title="移除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ))
             )}
          </div>

          {/* Manual Add Section (Optional) */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
             <div className="text-xs font-semibold text-slate-500 mb-2 uppercase">手动追加对象 (可选)</div>
             <div className="flex flex-col md:flex-row gap-3">
                <select
                  className="rounded border border-slate-300 px-2 py-1.5 text-xs w-32"
                  value={manualType}
                  onChange={(e) => {
                    setManualType(e.target.value as ReleaseType);
                    setManualTargetId('');
                  }}
                >
                  <option value={ReleaseType.FEATURE}>特征配置</option>
                  <option value={ReleaseType.POLICY}>风控策略</option>
                  <option value={ReleaseType.RULE}>规则配置</option>
                </select>
                <select
                  className="rounded border border-slate-300 px-2 py-1.5 text-xs w-48"
                  value={manualTargetId}
                  onChange={(e) => setManualTargetId(e.target.value)}
                  disabled={targets.length === 0}
                >
                  <option value="">-- 选择对象 --</option>
                  {targets.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="变更摘要"
                  className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-xs"
                  value={manualSummary}
                  onChange={(e) => setManualSummary(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={handleManualAdd}
                  className="flex items-center justify-center px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-indigo-600"
                >
                  <Plus className="w-3 h-3 mr-1" /> 添加
                </button>
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
           <button 
             type="button" 
             onClick={onCancel}
             className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
           >
             取消
           </button>
           <button 
             type="submit" 
             className="flex items-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 shadow-sm transition-colors"
           >
             <Save className="w-4 h-4 mr-2" />
             提交发布申请
           </button>
        </div>
      </form>
    </div>
  );
};