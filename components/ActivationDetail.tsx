
import React from 'react';
import { Activation, FeatureStatus, FeatureLifecycle, RuleOperator, ActionType, t } from '../types';
import { ArrowLeft, Edit, Clock, CheckCircle2, GitBranch, Archive, ShoppingCart, Shield, Layers, FileText } from 'lucide-react';
import { mockRules, mockEventPoints, mockActivationVersions } from '../mockData';

interface ActivationDetailProps {
  activation: Activation;
  onBack: () => void;
  onEdit: (a: Activation) => void;
}

export const ActivationDetail: React.FC<ActivationDetailProps> = ({ activation, onBack, onEdit }) => {
  const relatedRules = mockRules.filter(r => r.activationName === activation.name);
  const eventPointInfo = mockEventPoints.find(ep => ep.eventPoint === activation.eventPoint);

  // Real version history from mock data
  const history = mockActivationVersions.filter(v => v.activationId === activation.id);

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

  const getActionTypeBadge = (type: ActionType) => {
    const map: Record<ActionType, { bg: string; text: string }> = {
      [ActionType.TAG]: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-600' },
      [ActionType.WEBHOOK]: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600' },
      [ActionType.NOTIFY]: { bg: 'bg-cyan-50 border-cyan-200', text: 'text-cyan-600' },
      [ActionType.FEATURE_MUTATION]: { bg: 'bg-pink-50 border-pink-200', text: 'text-pink-600' },
    };
    const style = map[type] || { bg: 'bg-slate-50 border-slate-200', text: 'text-slate-600' };
    return <span className={`${style.bg} ${style.text} text-[10px] px-1.5 py-0.5 rounded border font-medium`}>{t(type)}</span>;
  };

  // Render threshold visualization
  const renderThresholdBar = () => {
    const { thresholds } = activation;
    if (!thresholds || thresholds.length === 0) return null;

    // Color gradient: first green, middle yellow, last red
    const getColor = (idx: number, total: number) => {
      if (total === 1) return { bg: 'bg-green-400', border: 'border-green-500' };
      if (idx === 0) return { bg: 'bg-green-400', border: 'border-green-500' };
      if (idx === total - 1) return { bg: 'bg-red-400', border: 'border-red-500' };
      return { bg: 'bg-yellow-400', border: 'border-yellow-500' };
    };

    return (
      <div className="space-y-4">
        {/* Color bar visualization */}
        <div className="flex rounded-lg overflow-hidden h-10 border border-slate-200">
          {thresholds.map((th, idx) => {
            const color = getColor(idx, thresholds.length);
            const widthPercent = 100 / thresholds.length;
            return (
              <div
                key={idx}
                className={`${color.bg} flex items-center justify-center text-white text-xs font-bold`}
                style={{ width: `${widthPercent}%` }}
              >
                {th.name}
              </div>
            );
          })}
        </div>

        {/* Detail rows */}
        <div className="space-y-2">
          {thresholds.map((th, idx) => {
            const color = getColor(idx, thresholds.length);
            let rangeText = '';
            if (idx === 0) {
              rangeText = `score < ${th.score}`;
            } else if (th.score === null) {
              rangeText = `score \u2265 ${thresholds[idx - 1].score}`;
            } else {
              rangeText = `${thresholds[idx - 1].score} \u2264 score < ${th.score}`;
            }

            let description = '';
            if (idx === 0) description = '风险分值较低，交易正常放行';
            else if (idx === thresholds.length - 1) description = '风险分值超过阈值，建议拒绝交易';
            else description = '风险分值居中，需要人工审核';

            return (
              <div key={idx} className="flex items-center gap-4 bg-slate-50 rounded-md px-4 py-3 border border-slate-100">
                <div className={`w-3 h-3 rounded-full ${color.bg}`}></div>
                <div className="w-24 font-medium text-sm text-slate-800">{th.name}</div>
                <div className="w-40 font-mono text-xs text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">{rangeText}</div>
                <div className="text-xs text-slate-500 flex-1">{description}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              {activation.description}
              {getLifecycleBadge(activation.lifecycleState)}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${activation.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {t(activation.status)}
              </span>
            </h2>
            <div className="text-sm text-slate-500 font-mono mt-0.5">{activation.name}</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(activation)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Edit className="w-4 h-4 mr-2" />
            编辑
          </button>
          <button className="flex items-center px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-50 transition-colors shadow-sm font-medium">
            <ShoppingCart className="w-4 h-4 mr-2" />
            加入待发布
          </button>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex gap-0">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <span style={{ borderBottom: '2px solid #1890ff', display: 'inline-block', paddingBottom: '4px' }}>
                <FileText className="w-4 h-4 inline mr-1 text-[#1890ff]" />
                基本信息
              </span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8 text-sm">
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">策略名称</span>
                <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{activation.name}</span>
              </div>
              <div className="space-y-1.5 col-span-2">
                <span className="text-slate-500 block text-xs">描述</span>
                <span className="font-medium text-slate-900">{activation.description}</span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">所属接入点</span>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded border border-blue-200 font-mono cursor-pointer hover:bg-blue-100 inline-flex items-center" title={eventPointInfo?.description}>
                  {activation.eventPoint}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">执行优先级</span>
                <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded border border-yellow-200 font-medium">
                  P{activation.priority}
                </span>
              </div>
              <div className="space-y-1.5">
                <span className="text-slate-500 block text-xs">最后更新</span>
                <div className="text-slate-700 font-mono text-xs">
                  {activation.updateAt} <span className="text-slate-400 mx-1">by</span> {activation.operator || 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Thresholds */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <span style={{ borderBottom: '2px solid #1890ff', display: 'inline-block', paddingBottom: '4px' }}>
                <Shield className="w-4 h-4 inline mr-1 text-[#1890ff]" />
                风险阈值配置
              </span>
            </h3>
            {renderThresholdBar()}
          </div>

          {/* Related Rules */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span style={{ borderBottom: '2px solid #1890ff', display: 'inline-block', paddingBottom: '4px' }}>
                  <Layers className="w-4 h-4 inline mr-1 text-[#1890ff]" />
                  关联规则 ({relatedRules.length})
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">规则名</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">初始分值</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">运算符</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">关联动作</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {relatedRules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-sm">暂无关联规则</td>
                    </tr>
                  ) : (
                    relatedRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-[#f0f7ff] transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline">{rule.name}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">{rule.description}</td>
                        <td className="px-6 py-4">
                          <span className="bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded border border-yellow-200 font-medium">P{rule.priority}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-slate-800">{rule.initScore}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-600">{t(rule.operator)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {rule.actions.map((action, idx) => (
                              <span key={idx}>{getActionTypeBadge(action.actionType)}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${rule.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {t(rule.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Version Timeline */}
        <div className="shrink-0" style={{ width: '260px', borderLeft: '1px solid #e2e8f0' }}>
          <div className="px-4 py-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              版本记录
            </h4>
            <div className="space-y-0">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">暂无版本记录</p>
              ) : (
                history.map((version, idx) => {
                  const isFirst = idx === 0;
                  return (
                    <div key={version.id} className="relative pl-6 pb-6">
                      {/* Timeline line */}
                      {idx < history.length - 1 && (
                        <div className="absolute left-[9px] top-4 bottom-0 w-px bg-slate-200"></div>
                      )}
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${isFirst ? 'bg-[#1890ff] border-[#1890ff]' : 'bg-white border-slate-300'}`}>
                        {isFirst && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      {/* Content */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200">v{version.version}</span>
                          {isFirst && <span className="bg-green-50 text-green-600 text-[10px] px-1 py-0.5 rounded border border-green-200">当前</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{version.commitMessage}</div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {version.createAt}
                        </div>
                        <div className="text-[10px] text-slate-400">{version.editor}</div>
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
