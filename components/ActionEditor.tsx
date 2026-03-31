
import React, { useState } from 'react';
import { Action, ActionVersion, ActionType, FeatureStatus, FeatureLifecycle, t } from '../types';
import { ArrowLeft, Save, X, Clock } from 'lucide-react';
import { mockActionVersions } from '../mockData';

interface ActionEditorProps {
  initialAction: Action | null;
  onSave: (action: Action) => Action;
  onCancel: () => void;
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

export const ActionEditor: React.FC<ActionEditorProps> = ({ initialAction, onSave, onCancel }) => {
  const isEditing = !!initialAction?.id;
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Version history filtered by actionId
  const history = isEditing ? mockActionVersions.filter(v => v.actionId === initialAction!.id) : [];

  const [form, setForm] = useState<Action>({
    name: initialAction?.name || '',
    type: initialAction?.type || ActionType.TAG,
    description: initialAction?.description || '',
    configSchema: initialAction?.configSchema || '{\n  "type": "object",\n  "properties": {}\n}',
    status: initialAction?.status ?? FeatureStatus.ENABLED,
    lifecycleState: initialAction?.lifecycleState ?? FeatureLifecycle.DRAFT,
    id: initialAction?.id,
    createAt: initialAction?.createAt,
    updateAt: initialAction?.updateAt,
    operator: initialAction?.operator,
  });

  const handleFieldChange = (field: keyof Action, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    onSave({
      ...form,
      createAt: form.createAt || now,
      updateAt: now,
      operator: form.operator || 'current_user',
    });
  };

  // Load version content into form (keep original id)
  const handleLoadVersion = (version: ActionVersion) => {
    setSelectedVersionId(version.id);
    const content = version.content;
    setForm(prev => ({
      ...prev,
      name: content.name,
      type: content.type,
      description: content.description,
      configSchema: content.configSchema,
      status: content.status,
      // keep original id
    }));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? '编辑动作模板' : '新建动作模板'}
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex items-center px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm font-medium"
          >
            <X className="w-4 h-4 mr-2" />
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </button>
        </div>
      </div>

      {/* Main content: flex layout */}
      <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">
          {/* 动作名称 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">动作名称</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors"
              placeholder="如：action_tag_risk"
              value={form.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>

          {/* 动作类型 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">动作类型</label>
            <div className="flex items-center gap-3">
              <select
                className="w-48 border border-slate-300 rounded px-2 py-2 text-sm bg-white focus:outline-none focus:border-[#1890ff]"
                value={form.type}
                onChange={(e) => handleFieldChange('type', e.target.value as ActionType)}
              >
                {Object.values(ActionType).map(tVal => (
                  <option key={tVal} value={tVal}>{t(tVal)}</option>
                ))}
              </select>
              {getActionTypeBadge(form.type)}
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">描述</label>
            <textarea
              className="w-full px-3 py-2 rounded border border-slate-300 text-sm focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors resize-vertical"
              rows={3}
              placeholder="描述该动作模板的用途"
              value={form.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
            />
          </div>

          {/* 运行状态 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">运行状态</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.status === FeatureStatus.ENABLED ? 'bg-indigo-600' : 'bg-slate-300'}`}
                onClick={() => handleFieldChange('status', form.status === FeatureStatus.ENABLED ? FeatureStatus.DISABLED : FeatureStatus.ENABLED)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.status === FeatureStatus.ENABLED ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
              <span className={`text-sm ${form.status === FeatureStatus.ENABLED ? 'text-green-700' : 'text-slate-500'}`}>
                {t(form.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Config Schema */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mt-6">
          <h3 className="font-semibold text-slate-900 mb-4 text-sm">配置模板 (configSchema)</h3>
          <p className="text-xs text-slate-400 mb-3">定义该动作类型需要的配置参数 JSON Schema</p>
          <textarea
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm font-mono focus:outline-none focus:border-[#1890ff] focus:ring-1 focus:ring-[#1890ff] transition-colors resize-vertical bg-slate-50"
            style={{ height: '200px' }}
            placeholder='{"type":"object","properties":{}}'
            value={form.configSchema}
            onChange={(e) => handleFieldChange('configSchema', e.target.value)}
          />
        </div>
      </div>

      {/* Right: Version Timeline (only for editing existing actions) */}
      {isEditing && history.length > 0 && (
        <div style={{ width: '260px' }} className="shrink-0">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-4">
            <h4 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              版本记录
            </h4>
            <div className="space-y-0">
              {history.map((version, idx) => {
                const isCurrentVersion = idx === 0 && !selectedVersionId;
                const isSelected = selectedVersionId === version.id;
                return (
                  <div
                    key={version.id}
                    className="flex gap-3 group cursor-pointer"
                    onClick={() => handleLoadVersion(version)}
                  >
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-1 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' :
                        isCurrentVersion ? 'bg-indigo-600 border-indigo-600' :
                        'bg-white border-slate-300 group-hover:border-indigo-400'
                      }`} />
                      {idx < history.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 my-1" />
                      )}
                    </div>
                    {/* Content */}
                    <div className={`pb-5 flex-1 min-w-0 rounded-md px-2 py-1 -ml-1 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 text-xs font-mono px-1.5 py-0.5 rounded border border-slate-200">v{version.version}</span>
                        {isCurrentVersion && !selectedVersionId && <span className="text-[10px] text-indigo-600 font-medium">当前</span>}
                        {isSelected && <span className="bg-indigo-50 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded border border-indigo-200">已加载</span>}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{version.commitMessage}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{version.createAt}</div>
                      <div className="text-[10px] text-slate-400">by {version.editor}</div>
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
