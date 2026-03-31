
import React, { useState } from 'react';
import { Activation, ActivationVersion, FeatureStatus, FeatureLifecycle, RiskThreshold } from '../types';
import { ArrowLeft, Save, X, Plus, Trash2, GripVertical, AlertCircle, History, Clock } from 'lucide-react';
import { mockEventPoints, mockActivationVersions } from '../mockData';

interface ActivationEditorProps {
  initialActivation: Activation | null;
  onSave: (a: Activation) => Activation;
  onCancel: () => void;
}

export const ActivationEditor: React.FC<ActivationEditorProps> = ({ initialActivation, onSave, onCancel }) => {
  const isNew = !initialActivation;

  const [form, setForm] = useState<Activation>(() => {
    if (initialActivation) return { ...initialActivation, thresholds: initialActivation.thresholds.map(t => ({ ...t })) };
    return {
      name: '',
      description: '',
      eventPoint: '',
      status: FeatureStatus.ENABLED,
      lifecycleState: FeatureLifecycle.DRAFT,
      priority: 1,
      thresholds: [
        { name: 'pass', score: 30 },
        { name: 'review', score: 70 },
        { name: 'reject', score: null },
      ],
      createAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operator: 'current_user',
    };
  });

  // Version history for the right sidebar
  const versions = !isNew
    ? mockActivationVersions.filter(v => v.activationId === initialActivation!.id)
    : [];

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const handleLoadVersion = (version: ActivationVersion) => {
    setSelectedVersionId(version.id);
    setForm({ ...version.content, id: initialActivation!.id, thresholds: version.content.thresholds.map(t => ({ ...t })) });
  };

  const updateField = <K extends keyof Activation>(key: K, value: Activation[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // --- Threshold Management ---
  const updateThreshold = (index: number, field: keyof RiskThreshold, value: string | number | null) => {
    setForm(prev => {
      const newThresholds = prev.thresholds.map((th, i) => {
        if (i === index) return { ...th, [field]: value };
        return { ...th };
      });
      return { ...prev, thresholds: newThresholds };
    });
  };

  const addThreshold = () => {
    setForm(prev => {
      const newThresholds = [...prev.thresholds];
      // Insert before the last one (which has score: null)
      const lastIdx = newThresholds.length - 1;
      const prevScore = lastIdx > 0 ? (newThresholds[lastIdx - 1].score || 0) : 0;
      const newScore = prevScore + 20;
      newThresholds.splice(lastIdx, 0, { name: '', score: newScore });
      return { ...prev, thresholds: newThresholds };
    });
  };

  const removeThreshold = (index: number) => {
    if (form.thresholds.length <= 2) return; // Keep at least 2 thresholds
    setForm(prev => {
      const newThresholds = prev.thresholds.filter((_, i) => i !== index);
      return { ...prev, thresholds: newThresholds };
    });
  };

  const getThresholdDescription = (index: number): string => {
    const thresholds = form.thresholds;
    if (index === 0) {
      return `score < ${thresholds[0].score ?? '?'}`;
    }
    const prevScore = thresholds[index - 1].score;
    const curScore = thresholds[index].score;
    if (curScore === null) {
      return `score \u2265 ${prevScore ?? '?'}`;
    }
    return `${prevScore ?? '?'} \u2264 score < ${curScore}`;
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('请输入策略名称');
      return;
    }
    if (!form.eventPoint) {
      alert('请选择所属接入点');
      return;
    }
    const saved: Activation = {
      ...form,
      updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    onSave(saved);
  };

  const inputClass = 'border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff]';

  const showVersionPanel = !isNew && versions.length > 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {isNew ? '新增策略' : '编辑策略'}
          </h2>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex items-center px-4 py-2 text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-sm font-medium">
            <X className="w-4 h-4 mr-2" />
            取消
          </button>
          <button onClick={handleSave} className="flex items-center px-4 py-2 bg-[#1890ff] text-white rounded hover:bg-[#40a9ff] transition-colors shadow-sm font-medium">
            <Save className="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Left: Form */}
        <div className="flex-1 min-w-0 space-y-6" style={{ maxWidth: showVersionPanel ? undefined : '800px', margin: showVersionPanel ? undefined : '0 auto' }}>
          {/* Basic Info Form */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6">
              <span style={{ borderBottom: '2px solid #1890ff', display: 'inline-block', paddingBottom: '4px' }}>
                基本信息
              </span>
            </h3>

            <div className="space-y-5">
              {/* 策略名称 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">策略名称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  className={`${inputClass} font-mono`}
                  placeholder="输入全局唯一的策略标识，如 activation_txn_risk"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                />
              </div>

              {/* 描述 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">描述</label>
                <textarea
                  className={`${inputClass} min-h-[80px] resize-y`}
                  placeholder="输入策略的中文描述"
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                />
              </div>

              {/* 所属接入点 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">所属接入点 <span className="text-red-400">*</span></label>
                <select
                  className={`${inputClass} bg-white`}
                  value={form.eventPoint}
                  onChange={e => updateField('eventPoint', e.target.value)}
                >
                  <option value="">请选择接入点</option>
                  {mockEventPoints.map(ep => (
                    <option key={ep.eventPoint} value={ep.eventPoint}>
                      {ep.eventPoint} - {ep.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* 执行优先级 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">执行优先级</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    className={`${inputClass} w-32`}
                    min={1}
                    value={form.priority}
                    onChange={e => updateField('priority', parseInt(e.target.value) || 1)}
                  />
                  <span className="text-xs text-slate-400">数字越小优先级越高</span>
                </div>
              </div>

              {/* 运行状态 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-500">运行状态</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.status === FeatureStatus.ENABLED ? 'bg-[#1890ff]' : 'bg-slate-300'}`}
                    onClick={() => updateField('status', form.status === FeatureStatus.ENABLED ? FeatureStatus.DISABLED : FeatureStatus.ENABLED)}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.status === FeatureStatus.ENABLED ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className={`text-sm ${form.status === FeatureStatus.ENABLED ? 'text-green-600' : 'text-slate-500'}`}>
                    {form.status === FeatureStatus.ENABLED ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Threshold Config */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6">
              <span style={{ borderBottom: '2px solid #1890ff', display: 'inline-block', paddingBottom: '4px' }}>
                风险阈值配置
              </span>
            </h3>

            {/* Threshold Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">档位名称</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 w-32">阈值分数</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">说明</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 w-16">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {form.thresholds.map((th, idx) => {
                    const isLast = idx === form.thresholds.length - 1;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-slate-400">
                            <GripVertical className="w-4 h-4 cursor-grab" />
                            <span className="text-xs">{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            className={`${inputClass} w-full`}
                            placeholder="如 pass, review, reject"
                            value={th.name}
                            onChange={e => updateThreshold(idx, 'name', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {isLast ? (
                            <span className="text-slate-400 text-sm px-3 py-2 inline-block">&mdash;</span>
                          ) : (
                            <input
                              type="number"
                              className={`${inputClass} w-full`}
                              placeholder="分数"
                              value={th.score ?? ''}
                              onChange={e => updateThreshold(idx, 'score', e.target.value === '' ? null : parseInt(e.target.value))}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 font-mono">{getThresholdDescription(idx)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {form.thresholds.length > 2 && !isLast && idx !== 0 ? (
                            <button
                              onClick={() => removeThreshold(idx)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="删除此档位"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="w-4 h-4 inline-block"></span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Threshold Button */}
            <button
              onClick={addThreshold}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-[#1890ff] hover:text-[#1890ff] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加档位
            </button>

            {/* Info Box */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 leading-relaxed">
                <p className="font-medium mb-1">阈值逻辑说明</p>
                <p>系统根据规则计算出总分后，依次与每个档位的阈值进行比较。分数低于第一个档位阈值时命中第一档；分数高于等于最后一个有分数的档位时命中最后一档。档位之间的分数范围为左闭右开区间。</p>
                <p className="mt-1">例如：pass(&lt;30) / review(30-70) / reject(&ge;70)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Version Timeline */}
        {showVersionPanel && (
          <div className="shrink-0" style={{ width: '260px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
            <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              版本记录
            </h4>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>

              <div className="space-y-6">
                {versions.map((version, idx) => {
                  const isFirst = idx === 0;
                  const isSelected = selectedVersionId === version.id;
                  const dotActive = isSelected || (isFirst && !selectedVersionId);
                  return (
                    <div
                      key={version.id}
                      className={`relative pl-6 cursor-pointer rounded-md py-1 px-1 -ml-1 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      onClick={() => handleLoadVersion(version)}
                    >
                      {/* Dot */}
                      <div className={`absolute left-0 top-2 w-[15px] h-[15px] rounded-full border-2 ${dotActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                        {dotActive && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white"></div></div>}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">v{version.version}</span>
                          {isFirst && !selectedVersionId && <span className="text-[10px] text-indigo-600 font-medium">当前</span>}
                          {isSelected && <span className="text-[10px] text-indigo-600 font-medium">已加载</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{version.commitMessage}</p>
                        <div className="flex items-center text-[10px] text-slate-400 mt-1 gap-1">
                          <Clock className="w-3 h-3" />
                          {version.createAt}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{version.editor}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
