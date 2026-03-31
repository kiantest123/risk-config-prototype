import React from 'react';
import { OverrideConfig, ManualState, t } from '../types';
import { AlertTriangle, Clock, PlayCircle, StopCircle, Trash2 } from 'lucide-react';

interface OverridesManagerProps {
  overrides: OverrideConfig[];
  onDelete: (id: string) => void;
}

export const OverridesManager: React.FC<OverridesManagerProps> = ({ overrides, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-100 rounded-lg p-6 flex items-start space-x-4 shadow-sm">
        <div className="p-2 bg-orange-100 rounded-full">
           <AlertTriangle className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-orange-900">手动干预管理 (War Room)</h3>
          <p className="text-sm text-orange-700 mt-1 leading-relaxed">
            手动干预拥有<strong>最高优先级</strong>，强制覆盖自动熔断状态。主要用于紧急故障恢复或阻断风险。
            <br/>所有干预配置将在 TTL 到期后自动失效，请谨慎操作。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Button Card */}
        <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-[#1890ff] hover:text-[#1890ff] hover:bg-white transition-all h-full min-h-[180px] bg-slate-50/50">
           <AlertTriangle className="w-10 h-10 mb-3" />
           <span className="font-medium">新建紧急干预</span>
           <span className="text-xs mt-1 text-slate-400">支持全局、策略集及单点特征</span>
        </button>

        {overrides.map(ovr => (
           <div key={ovr.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow relative group">
             {/* Header Stripe */}
             <div className={`h-1.5 w-full ${ovr.manualState === ManualState.MANUAL_OPEN ? 'bg-red-500' : 'bg-green-500'}`}></div>
             
             <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    {ovr.manualState === ManualState.MANUAL_OPEN ? (
                      <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                        <StopCircle className="w-3 h-3 mr-1" /> 强制熔断
                      </span>
                    ) : (
                      <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded">
                        <PlayCircle className="w-3 h-3 mr-1" /> 强制放行
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => onDelete(ovr.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="移除此干预"
                  >
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="font-bold text-slate-800 text-lg">{ovr.scope.activationName || ovr.scope.targetKey || '全链路 (Global)'}</h4>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">{t(ovr.scope.level)}</p>
                </div>

                <div className="bg-slate-50 rounded p-3 text-sm text-slate-600 border border-slate-100 italic">
                  "{ovr.remark}"
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      剩余: {Math.floor(ovr.ttlSeconds / 60)}分{ovr.ttlSeconds % 60}秒
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">Op: {ovr.operator}</span>
                </div>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};