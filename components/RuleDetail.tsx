
import React from 'react';
import { Rule, FeatureLifecycle, ConditionExpression, ConditionOperator, ActionType, ExecutionMode, RuleOperator, t } from '../types';
import { ArrowLeft, Edit, CheckCircle2, GitBranch, Archive, ShoppingCart, Clock, Shield, Zap, Filter, Target } from 'lucide-react';
import { mockRuleVersions } from '../mockData';

interface RuleDetailProps {
  rule: Rule;
  onBack: () => void;
  onEdit: (rule: Rule) => void;
}

export const RuleDetail: React.FC<RuleDetailProps> = ({ rule, onBack, onEdit }) => {

  // --- Lifecycle Badge ---
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

  // --- Action Type Badge ---
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

  // --- Condition Expression Rendering (Reused from FeatureDetail) ---
  const DETAIL_LOGIC_COLORS: Record<string, { bg: string; text: string; line: string }> = {
    AND: { bg: 'bg-indigo-600', text: 'text-white', line: '#4f46e5' },
    OR: { bg: 'bg-amber-500', text: 'text-white', line: '#f59e0b' },
  };

  const renderConditionGroup = (group: any, logic: string) => {
    const conditions = group.conditions || [];
    const logicColor = DETAIL_LOGIC_COLORS[logic] || DETAIL_LOGIC_COLORS.AND;
    if (conditions.length === 0) return null;

    return (
      <div className="flex items-stretch gap-0">
        <div className="flex flex-col items-center shrink-0" style={{ width: '40px' }}>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: logicColor.line }} />
          <div className={`${logicColor.bg} ${logicColor.text} text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap select-none`}>
            {logic === 'AND' ? '且' : '或'}
          </div>
          <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: logicColor.line }} />
        </div>
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

  // --- Score Formula ---
  const getScoreFormula = () => {
    if (rule.operator === RuleOperator.NONE) {
      return `score = ${rule.initScore}`;
    }
    const opSymbol = { ADD: '+', SUB: '-', MUL: '*', DIV: '/' }[rule.operator] || '?';
    let formula = `score = ${rule.initScore} ${opSymbol} (${rule.baseNum} ${opSymbol} ${rule.valueField || 'value'})`;
    if (rule.rate !== 1) {
      formula += ` * ${rule.rate}`;
    }
    if (rule.max !== null) {
      formula += ` [max: ${rule.max}]`;
    }
    return formula;
  };

  // Version history from mock data, filtered by ruleId
  const history = mockRuleVersions.filter(v => v.ruleId === rule.id);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {rule.description}
              {getLifecycleBadge(rule.lifecycleState)}
            </h2>
            <div className="text-sm text-slate-500 font-mono mt-0.5">{rule.name}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(rule)}
            className="flex items-center px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors shadow-sm font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </button>
        </div>
      </div>

      {/* Main Content: Left + Right */}
      <div className="flex gap-6">
        {/* Left Content */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-5 h-5 text-indigo-500" />
              基本信息
            </h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">规则名称</span>
                <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{rule.name}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">描述</span>
                <span className="font-medium text-slate-900">{rule.description}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">所属策略</span>
                <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-yellow-100">{rule.activationName}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">所属接入点</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-mono cursor-pointer hover:bg-blue-100">{rule.eventPoint}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">执行优先级</span>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded font-bold">P{rule.priority}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">操作人 / 更新时间</span>
                <div className="text-slate-700 font-mono text-xs">
                  {rule.editOperator || 'Unknown'} <span className="text-slate-400 mx-1">@</span> {rule.updateAt || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Score Config */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="w-5 h-5 text-indigo-500" />
              评分配置
            </h3>
            <div className="grid grid-cols-6 gap-3 mb-4">
              {[
                { label: '初始分值', value: rule.initScore },
                { label: '基数', value: rule.baseNum },
                { label: '运算符', value: t(rule.operator) },
                { label: '取值字段', value: rule.valueField || '-' },
                { label: '分值上限', value: rule.max !== null ? rule.max : '-' },
                { label: '倍率', value: rule.rate },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-slate-800 font-mono">{item.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-100 rounded-md px-4 py-2.5 text-xs font-mono text-slate-600 border border-slate-200">
              {getScoreFormula()}
            </div>
          </div>

          {/* Condition Expression */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="w-5 h-5 text-indigo-500" />
              条件表达式
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-4 text-xs text-slate-700 overflow-x-auto leading-relaxed">
              {renderConditionExpression(rule.conditionExpression)}
            </div>
          </div>

          {/* Related Actions */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Target className="w-5 h-5 text-indigo-500" />
              关联动作
            </h3>
            {rule.actions.length === 0 ? (
              <div className="text-center text-slate-400 py-8">暂无关联动作</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-[#fafafa]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">动作名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">执行模式</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">配置值</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {rule.actions.map((action, idx) => (
                      <tr key={idx} className="hover:bg-[#f0f7ff] transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#1890ff] font-mono cursor-pointer hover:underline">{action.actionName}</span>
                        </td>
                        <td className="px-4 py-3">{getActionTypeBadge(action.actionType)}</td>
                        <td className="px-4 py-3">
                          {action.executionMode === ExecutionMode.SYNC ? (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5 rounded font-medium">同步</span>
                          ) : (
                            <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] px-1.5 py-0.5 rounded font-medium">异步</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-bold">P{action.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 font-mono block max-w-xs truncate" title={action.actionConfig}>
                            {action.actionConfig}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Version Timeline */}
        <div style={{ width: '260px' }} className="shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
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
                      {/* Timeline line and dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${isCurrentVersion ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`} />
                        {idx < history.length - 1 && (
                          <div className="w-px flex-1 bg-slate-200 min-h-[40px]" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pb-5 -mt-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700">v{version.version}</span>
                          {isCurrentVersion && <span className="bg-green-50 text-green-600 text-[9px] px-1.5 py-0.5 rounded border border-green-200">当前</span>}
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
