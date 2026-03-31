
import React from 'react';
import { Action, ActionType, FeatureLifecycle, FeatureStatus, t } from '../types';
import { ArrowLeft, Edit, Clock, FileJson, CheckCircle2, History, GitBranch, Archive, ShoppingCart, Settings } from 'lucide-react';
import { mockRules, mockActionVersions } from '../mockData';

interface ActionDetailProps {
  action: Action;
  onBack: () => void;
  onEdit: (action: Action) => void;
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

export const ActionDetail: React.FC<ActionDetailProps> = ({ action, onBack, onEdit }) => {
  // Find rules that reference this action
  const relatedRules = mockRules.filter(rule => rule.actions.some(a => a.actionName === action.name));

  // Version history from mock data, filtered by actionId
  const history = mockActionVersions.filter(v => v.actionId === action.id);

  // Format configSchema for display
  let formattedSchema = action.configSchema;
  try {
    formattedSchema = JSON.stringify(JSON.parse(action.configSchema), null, 2);
  } catch {
    // Keep original if not valid JSON
  }

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
              {action.name}
              {getActionTypeBadge(action.type)}
              {getLifecycleBadge(action.lifecycleState)}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${action.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${action.status === FeatureStatus.ENABLED ? 'bg-green-500' : 'bg-red-400'}`}></span>
                {t(action.status)}
              </span>
            </h2>
            <div className="text-sm text-slate-500 mt-0.5">
              {action.description}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(action)}
            className="flex items-center px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors shadow-sm font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </button>
          <button
            className="flex items-center px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors shadow-sm font-medium"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            加入待发布
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Left: Detail Content */}
        <div className="flex-1 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileJson className="w-5 h-5 text-indigo-500" />
              基本信息
            </h3>

            <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">动作名称</span>
                <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{action.name}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">动作类型</span>
                <div>{getActionTypeBadge(action.type)}</div>
              </div>
              <div className="space-y-1.5 col-span-2">
                <span className="text-slate-500 block text-xs">描述</span>
                <span className="font-medium text-slate-900">{action.description}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">创建时间</span>
                <div className="text-slate-700 font-mono text-xs">{action.createAt || '-'}</div>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">最后更新</span>
                <div className="text-slate-700 font-mono text-xs">{action.updateAt || '-'}</div>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">操作人</span>
                <span className="font-medium text-slate-900">{action.operator || '-'}</span>
              </div>
            </div>
          </div>

          {/* Config Schema */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-5 h-5 text-indigo-500" />
              配置模板 (configSchema)
            </h3>
            <pre className="font-mono text-xs text-slate-700 bg-slate-50 border rounded-md p-4 overflow-x-auto leading-relaxed">
              {formattedSchema}
            </pre>
          </div>

          {/* Related Rules */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                关联规则
                {relatedRules.length > 0 && (
                  <span className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded text-xs font-medium ml-2">
                    {relatedRules.length} 条
                  </span>
                )}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">规则名</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">所属策略</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">执行模式</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {relatedRules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">暂无关联规则</td>
                    </tr>
                  ) : (
                    relatedRules.map((rule) => {
                      const ruleAction = rule.actions.find(a => a.actionName === action.name);
                      return (
                        <tr key={rule.id} className="hover:bg-[#f0f7ff] transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline">
                              {rule.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{rule.activationName}</td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {ruleAction ? t(ruleAction.executionMode) : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{rule.priority}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Version Timeline */}
        <div className="w-[260px] shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              版本记录
            </h4>
            <div className="space-y-0">
              {history.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">暂无版本记录</div>
              ) : (
                history.map((version, idx) => {
                  const isCurrentVersion = idx === 0;
                  return (
                    <div key={version.id} className="flex gap-3">
                      {/* Timeline line + dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${isCurrentVersion ? 'bg-indigo-600 border-2 border-indigo-600' : 'bg-white border-2 border-slate-300'}`} />
                        {idx < history.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 text-xs font-mono px-1.5 py-0.5 rounded border border-slate-200">v{version.version}</span>
                          {isCurrentVersion && <span className="text-[10px] text-indigo-600 font-medium">当前</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{version.commitMessage}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{version.createAt}</div>
                        <div className="text-[10px] text-slate-400">by {version.editor}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
