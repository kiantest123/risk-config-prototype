import React, { useState } from 'react';
import { AnyPolicy, PolicyType, Status, t } from '../types';
import { PolicyEditor } from './PolicyEditor';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';

interface PolicyManagerProps {
  type: PolicyType;
  policies: AnyPolicy[];
  onSave: (policy: AnyPolicy) => void;
  onDelete: (id: string) => void;
}

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    [Status.DRAFT]: 'bg-slate-100 text-slate-500 border border-slate-200',
    [Status.PENDING_APPROVAL]: 'bg-orange-50 text-orange-500 border border-orange-200',
    [Status.PUBLISHED]: 'bg-green-50 text-green-600 border border-green-200',
    [Status.OFFLINE]: 'bg-red-50 text-red-500 border border-red-200',
  };
  
  // Mapping dot colors
  const dotColor = {
    [Status.DRAFT]: 'bg-slate-400',
    [Status.PENDING_APPROVAL]: 'bg-orange-400',
    [Status.PUBLISHED]: 'bg-green-500',
    [Status.OFFLINE]: 'bg-red-400',
  };

  return (
    <span className={`px-2.5 py-0.5 text-xs rounded-full flex items-center w-fit gap-1.5 ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[status]}`}></span>
      {t(status)}
    </span>
  );
};

export const PolicyManager: React.FC<PolicyManagerProps> = ({ type, policies, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<AnyPolicy | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (policy: AnyPolicy) => {
    setCurrentPolicy(policy);
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentPolicy(null);
    setIsEditing(true);
  };

  const handleSaveInternal = (policy: AnyPolicy) => {
    onSave(policy);
    setIsEditing(false);
  };

  const filteredPolicies = policies.filter(p => 
    p.type === type && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.policyId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isEditing) {
    return (
      <PolicyEditor 
        initialPolicy={currentPolicy} 
        onSave={handleSaveInternal} 
        onCancel={() => setIsEditing(false)} 
        defaultType={type}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-80">
          <input 
            type="text" 
            placeholder="搜索策略名称、ID或目标..." 
            className="w-full pl-10 pr-4 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        </div>
        
        <div className="flex gap-3">
           <button className="flex items-center px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded hover:text-[#1890ff] hover:border-[#1890ff] transition-colors">
             <Filter className="w-4 h-4 mr-2" />
             高级筛选
           </button>
           <button 
            onClick={handleCreate}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#1890ff] rounded hover:bg-[#40a9ff] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建策略
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-[#fafafa]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">策略信息</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">生效范围</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">状态</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">配置详情</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">最后更新</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredPolicies.map((policy) => (
              <tr key={policy.policyId} className="hover:bg-[#f0f7ff] transition-colors group">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-[#1890ff] cursor-pointer hover:underline">{policy.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{policy.policyId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-700">{t(policy.scope.level)}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {policy.scope.eventPoint || policy.scope.ruleName || policy.scope.targetKey || policy.scope.activationName || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={policy.status} />
                </td>
                <td className="px-6 py-4">
                   <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 inline-block max-w-[240px] truncate">
                     {type === PolicyType.CIRCUIT_BREAKER ? (
                       <span title={`失败率 > ${(policy as any).thresholds?.failureRate}% | 慢调用 > ${(policy as any).thresholds?.slowCallRate}%`}>
                        失败率 &gt; {(policy as any).thresholds?.failureRate}% | 
                        慢调用 &gt; {(policy as any).thresholds?.slowCallRate}%
                       </span>
                     ) : (
                       <span title={`${t((policy as any).metricType)} ${t((policy as any).comparator)} ${(policy as any).threshold}`}>
                        {t((policy as any).metricType)} {t((policy as any).comparator)} {(policy as any).threshold}
                       </span>
                     )}
                   </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {policy.updatedAt.split('T')[0]}
                  <div className="text-xs text-slate-400">{policy.operator}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleEdit(policy)}
                    className="text-[#1890ff] hover:text-[#40a9ff] mr-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => onDelete(policy.policyId)}
                    className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {filteredPolicies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                  <div className="flex flex-col items-center">
                    <Search className="w-8 h-8 mb-2 opacity-20" />
                    <p>暂无符合条件的策略</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Placeholder */}
      <div className="flex justify-end pt-2">
        <div className="flex gap-1 text-sm text-slate-600">
           <button className="px-3 py-1 border border-slate-300 rounded hover:border-[#1890ff] hover:text-[#1890ff] disabled:opacity-50" disabled>&lt;</button>
           <button className="px-3 py-1 border border-[#1890ff] text-[#1890ff] rounded">1</button>
           <button className="px-3 py-1 border border-slate-300 rounded hover:border-[#1890ff] hover:text-[#1890ff]">2</button>
           <button className="px-3 py-1 border border-slate-300 rounded hover:border-[#1890ff] hover:text-[#1890ff]">&gt;</button>
        </div>
      </div>
    </div>
  );
};