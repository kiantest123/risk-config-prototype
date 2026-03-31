import React, { useState, useEffect } from 'react';
import { Feature, FeatureLifecycle, ConditionExpression, ConditionOperator, t } from '../types';
import { ArrowLeft, Edit, Clock, FileJson, CheckCircle2, History, Send, GitBranch, Archive, ShoppingCart, Filter, Settings, Eye } from 'lucide-react';
import { mockFeatureVersions } from '../mockData';

interface FeatureDetailProps {
  feature: Feature;
  onBack: () => void;
  onEdit: (feature: Feature) => void;
}

export const FeatureDetail: React.FC<FeatureDetailProps> = ({ feature, onBack, onEdit }) => {
  // Mock finding history for this feature
  const history = mockFeatureVersions.filter(v => v.featureId === feature.id);

  const getLifecycleBadge = (state: FeatureLifecycle) => {
    switch (state) {
        case FeatureLifecycle.DRAFT:
            return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center border border-slate-200 w-fit"><GitBranch className="w-3 h-3 mr-1"/>草稿</span>;
        case FeatureLifecycle.READY_FOR_RELEASE:
            // Consolidate 'Ready' to 'Draft' to strictly follow "Online, History, Draft" request
            return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs flex items-center border border-purple-200 w-fit"><ShoppingCart className="w-3 h-3 mr-1"/>草稿</span>;
        case FeatureLifecycle.PUBLISHED:
            return <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs flex items-center border border-green-200 w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/>线上</span>;
        case FeatureLifecycle.ARCHIVED_HISTORY:
            return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs flex items-center border border-orange-200 w-fit"><Archive className="w-3 h-3 mr-1"/>历史</span>;
    }
  };

  const DETAIL_LOGIC_COLORS: Record<string, { bg: string; text: string; line: string }> = {
    AND: { bg: 'bg-indigo-600', text: 'text-white', line: '#4f46e5' },
    OR: { bg: 'bg-amber-500', text: 'text-white', line: '#f59e0b' },
  };

  const renderConditionGroup = (group: any, logic: string, level = 0) => {
    const conditions = group.conditions || [];
    const logicColor = DETAIL_LOGIC_COLORS[logic] || DETAIL_LOGIC_COLORS.AND;
    if (conditions.length === 0) return null;

    return (
      <div className="flex items-stretch gap-0">
        {/* Left: Logic badge + vertical line */}
        <div className="flex flex-col items-center shrink-0" style={{ width: '40px' }}>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: logicColor.line }} />
          <div className={`${logicColor.bg} ${logicColor.text} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap select-none`}>
            {logic === 'AND' ? '且' : '或'}
          </div>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: logicColor.line }} />
        </div>
        {/* Right: Condition rows */}
        <div className="flex-1 min-w-0 flex flex-col">
          {conditions.map((cond: any, ci: number) => (
            <div key={ci} className="flex items-center" style={{ minHeight: '32px' }}>
              <div className="shrink-0" style={{ width: '16px', height: '2px', background: logicColor.line }} />
              <div className="flex items-center gap-1.5 flex-wrap bg-white border border-slate-100 rounded-md px-2.5 py-1.5 my-0.5 shadow-sm">
                <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] font-mono">{cond.field || '?'}</code>
                <span className="text-slate-500 font-medium text-[11px]">{t(cond.operator)}</span>
                {cond.operator !== ConditionOperator.IS_NULL && cond.operator !== ConditionOperator.IS_NOT_NULL && (
                  <code className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[11px] font-mono">{cond.value || '?'}</code>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConditionExpression = (expr: ConditionExpression) => {
    if (!expr || !expr.groups || expr.groups.length === 0) {
      return <span className="text-slate-400 italic">无前置条件（始终执行）</span>;
    }

    if (expr.groups.length === 1) {
      return renderConditionGroup(expr.groups[0], expr.groups[0].logic || 'AND');
    }

    const rootLogicColor = DETAIL_LOGIC_COLORS[expr.logic] || DETAIL_LOGIC_COLORS.AND;
    return (
      <div className="flex items-stretch gap-0">
        <div className="flex flex-col items-center shrink-0" style={{ width: '40px' }}>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: rootLogicColor.line }} />
          <div className={`${rootLogicColor.bg} ${rootLogicColor.text} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap select-none`}>
            {expr.logic === 'AND' ? '且' : '或'}
          </div>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: rootLogicColor.line }} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {expr.groups.map((group: any, gi: number) => (
            <div key={gi} className="flex items-center">
              <div className="shrink-0" style={{ width: '16px', height: '2px', background: rootLogicColor.line }} />
              <div className="flex-1 min-w-0">
                {renderConditionGroup(group, group.logic || 'AND')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {feature.description}
            </h2>
             <div className="text-sm text-slate-500 font-mono mt-0.5">
                {feature.name}
             </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(feature)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </button>
        </div>
      </div>

      {/* Main Content: Current Config Detail */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileJson className="w-5 h-5 text-indigo-500" />
          当前展示版本配置
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 text-sm mb-8">
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">特征名</span>
             <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{feature.name}</span>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">特征描述</span>
             <span className="font-medium text-slate-900">{feature.description}</span>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">生命周期状态</span>
             <div>{getLifecycleBadge(feature.lifecycleState)}</div>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">启用状态</span>
             <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${feature.status === 1 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${feature.status === 1 ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                {t(feature.status)}
             </span>
           </div>

           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">特征类型</span>
             <span className="font-medium text-slate-900">{t(feature.type)}</span>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">数据来源</span>
             <span className="font-medium text-slate-900">{t(feature.writeSource)}</span>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">数据类型</span>
             <span className="font-medium text-slate-900 font-mono">{t(feature.valueType)}</span>
           </div>
           <div className="space-y-1.5">
             <span className="text-slate-500 block text-xs">包含当前事件</span>
             <span className="font-medium text-slate-900">{feature.includeCurrentEvent ? '是 (Yes)' : '否 (No)'}</span>
           </div>

           <div className="col-span-2 md:col-span-4 space-y-1.5">
             <span className="text-slate-500 block text-xs">事件接入点 (Event Points)</span>
             <div className="flex flex-wrap gap-2">
                {feature.eventPoints.length > 0 ? feature.eventPoints.map(ep => (
                  <span key={ep} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs border border-slate-200 font-mono">
                    {ep}
                  </span>
                )) : <span className="text-slate-400">-</span>}
             </div>
           </div>
           
           <div className="col-span-2 md:col-span-4 space-y-1.5 pt-2 border-t border-slate-50">
              <span className="text-slate-500 block text-xs">最后更新</span>
              <div className="text-slate-700 font-mono text-xs">
                 {feature.updateAt} <span className="text-slate-400 mx-1">by</span> {feature.operator || 'Unknown'}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col h-full">
            <span className="text-slate-500 text-xs block mb-2 font-medium flex items-center">
                <Filter className="w-3 h-3 mr-1" /> 前置条件表达式
            </span>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-700 overflow-x-auto leading-relaxed flex-1">
              {renderConditionExpression(feature.conditionExpression)}
            </div>
          </div>
          <div className="flex flex-col h-full">
            <span className="text-slate-500 text-xs block mb-2 font-medium flex items-center">
                <Settings className="w-3 h-3 mr-1" /> 计算配置 (JSON)
            </span>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 font-mono text-xs text-slate-700 overflow-x-auto whitespace-pre leading-relaxed flex-1">
              {feature.calculationConfig}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: History List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            历史版本记录
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">版本号</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">版本状态</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">提交说明</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">修改人</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">暂无历史版本记录</td>
                </tr>
              ) : (
                history.map((version) => (
                  <tr key={version.id} className="hover:bg-[#f0f7ff] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-0.5 rounded border border-slate-200">
                        v{version.version}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {getLifecycleBadge(version.content.lifecycleState)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{version.commitMessage}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       {version.editor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                          {version.createAt}
                       </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                       <div className="flex items-center justify-end gap-3">
                          <button
                             onClick={() => {/* TODO: view snapshot */}}
                             className="text-slate-500 hover:text-indigo-600 flex items-center"
                             title="查看此版本详情"
                          >
                             <Eye className="w-3 h-3 mr-1" /> 查看
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};