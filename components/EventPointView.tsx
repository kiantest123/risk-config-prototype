
import React, { useState, useRef, useCallback } from 'react';
import { EventPoint, EventPointVersion, FeatureStatus, FeatureLifecycle, t } from '../types';
import {
  ArrowLeft, Edit, Save, X, Clock, CheckCircle2, GitBranch, Archive,
  ShoppingCart, History, Layers, Zap
} from 'lucide-react';
import { mockActivations, mockFeatures, mockEventPointVersions } from '../mockData';

interface EventPointViewProps {
  item: EventPoint | null;        // null = 新建
  initialMode: 'view' | 'edit';   // List 告知初始模式
  onBack: () => void;             // 返回列表
  onSave: (ep: EventPoint) => EventPoint; // 保存回调
}

const makeNewEventPoint = (): EventPoint => ({
  eventPoint: '',
  description: '',
  status: FeatureStatus.ENABLED,
  lifecycleState: FeatureLifecycle.DRAFT,
  createAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  operator: 'current_user',
});

export const EventPointView: React.FC<EventPointViewProps> = ({ item, initialMode, onBack, onSave }) => {
  const isCreating = item === null;

  // Core state
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [currentData, setCurrentData] = useState<EventPoint>(item || makeNewEventPoint());
  const [form, setForm] = useState<EventPoint>(item || makeNewEventPoint());
  const editSnapshotRef = useRef<string>(initialMode === 'edit' ? JSON.stringify(item || makeNewEventPoint()) : '');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Dialog state
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Related data
  const relatedActivations = mockActivations.filter(a => a.eventPoint === currentData.eventPoint);
  const relatedFeatures = mockFeatures.filter(f => f.eventPoints.includes(currentData.eventPoint));
  const history = currentData.id ? mockEventPointVersions.filter(v => v.eventPointId === currentData.id) : [];

  // Dirty checking
  const isDirty = useCallback(() => {
    return JSON.stringify(form) !== editSnapshotRef.current;
  }, [form]);

  // Enter edit mode
  const enterEditMode = useCallback(() => {
    const snapshot = { ...currentData };
    setForm(snapshot);
    editSnapshotRef.current = JSON.stringify(snapshot);
    setSelectedVersionId(null);
    setMode('edit');
  }, [currentData]);

  // Guard: run action if not dirty, or show confirm
  const guardDirty = useCallback((action: () => void) => {
    if (isDirty()) {
      setConfirmAction(() => action);
    } else {
      action();
    }
  }, [isDirty]);

  // Cancel edit
  const handleCancel = useCallback(() => {
    if (isCreating) {
      if (isDirty()) {
        setConfirmAction(() => onBack);
      } else {
        onBack();
      }
      return;
    }
    guardDirty(() => {
      setMode('view');
    });
  }, [isCreating, isDirty, guardDirty, onBack]);

  // Back button
  const handleBack = useCallback(() => {
    if (mode === 'edit') {
      guardDirty(onBack);
    } else {
      onBack();
    }
  }, [mode, guardDirty, onBack]);

  // Load version (edit mode: load into form with dirty guard; view mode: switch displayed data)
  const handleLoadVersion = useCallback((version: EventPointVersion) => {
    if (mode === 'edit') {
      const doLoad = () => {
        setSelectedVersionId(version.id);
        const loaded = { ...version.content, id: currentData.id };
        setForm(loaded);
      };
      guardDirty(doLoad);
    } else {
      setSelectedVersionId(version.id);
      setCurrentData({ ...version.content, id: currentData.id });
    }
  }, [mode, currentData.id, guardDirty]);

  // Form change
  const handleChange = useCallback((field: keyof EventPoint, value: any) => {
    setForm(prev => ({ ...prev, [field]: value, updateAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }));
  }, []);

  const handleToggleStatus = useCallback(() => {
    const newStatus = form.status === FeatureStatus.ENABLED ? FeatureStatus.DISABLED : FeatureStatus.ENABLED;
    handleChange('status', newStatus);
  }, [form.status, handleChange]);

  // Save
  const handleSubmit = useCallback(() => {
    if (!form.eventPoint.trim()) {
      alert('请输入接入点编码');
      return;
    }
    const saved = onSave(form);
    setCurrentData(saved);
    setShowSaveSuccess(true);
  }, [form, onSave]);

  // Confirm dialog actions
  const handleConfirmYes = useCallback(() => {
    const action = confirmAction;
    setConfirmAction(null);
    action?.();
  }, [confirmAction]);

  const handleConfirmNo = useCallback(() => {
    setConfirmAction(null);
  }, []);

  // Save success dialog actions
  const handleStay = useCallback(() => {
    setShowSaveSuccess(false);
    setMode('view');
  }, []);

  const handleGoBack = useCallback(() => {
    setShowSaveSuccess(false);
    onBack();
  }, [onBack]);

  // ── Lifecycle badge (shared) ──
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

  // ── Render: Header ──
  const renderHeader = () => {
    const isEditMode = mode === 'edit';
    const showCreateTitle = isEditMode && isCreating;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
              {showCreateTitle ? (
                '新建接入点'
              ) : (
                <>
                  <span className="font-mono">{currentData.eventPoint}</span>
                  {getLifecycleBadge(currentData.lifecycleState)}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${currentData.status === FeatureStatus.ENABLED ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${currentData.status === FeatureStatus.ENABLED ? 'bg-green-500' : 'bg-red-400'}`}></span>
                    {t(currentData.status)}
                  </span>
                </>
              )}
              {isEditMode && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs border border-slate-200 flex items-center">
                  <GitBranch className="w-3 h-3 mr-1" />
                  编辑中
                </span>
              )}
            </h2>
            {!isEditMode && (
              <div className="text-sm text-slate-500 mt-0.5">{currentData.description}</div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center px-5 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </button>
            </>
          ) : (
            <button
              onClick={enterEditMode}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Render: Basic Info (view mode) ──
  const renderBasicInfoView = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Layers className="w-5 h-5 text-indigo-500" />
        基本信息
      </h3>
      <div className="grid grid-cols-2 gap-y-6 gap-x-8 text-sm">
        <div className="space-y-1.5">
          <span className="text-slate-500 block text-xs">接入点编码</span>
          <span className="font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded">{currentData.eventPoint}</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-slate-500 block text-xs">描述</span>
          <span className="font-medium text-slate-900">{currentData.description}</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-slate-500 block text-xs">创建时间</span>
          <span className="font-medium text-slate-700 font-mono text-xs">{currentData.createAt || '-'}</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-slate-500 block text-xs">最后更新</span>
          <span className="font-medium text-slate-700 font-mono text-xs">{currentData.updateAt || '-'}</span>
        </div>
        <div className="space-y-1.5">
          <span className="text-slate-500 block text-xs">操作人</span>
          <span className="font-medium text-slate-900">{currentData.operator || '-'}</span>
        </div>
      </div>
    </div>
  );

  // ── Render: Basic Info (edit mode) ──
  const renderBasicInfoEdit = () => {
    const isEditingExisting = !isCreating;
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Layers className="w-5 h-5 text-indigo-500" />
          基本信息
        </h3>
        <div className="max-w-[800px]">
          <form className="space-y-6">
            {/* 接入点编码 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                接入点编码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                value={form.eventPoint}
                onChange={(e) => handleChange('eventPoint', e.target.value)}
                placeholder="请输入唯一编码，如 EP00000005"
                disabled={isEditingExisting}
              />
              {!isEditingExisting && <p className="mt-1 text-xs text-slate-400">系统唯一标识，创建后不可修改。</p>}
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                描述
              </label>
              <textarea
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]"
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="请输入接入点的中文描述..."
              />
            </div>

            {/* 运行状态 Toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">运行状态</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    form.status === FeatureStatus.ENABLED ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                      form.status === FeatureStatus.ENABLED ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${form.status === FeatureStatus.ENABLED ? 'text-green-700' : 'text-slate-500'}`}>
                  {t(form.status)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">控制该接入点上线后是否实际生效。</p>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // ── Render: Related Activations ──
  const renderRelatedActivations = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          关联策略
          <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded border border-blue-200 ml-2">{relatedActivations.length}</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-[#fafafa]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">策略名</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">优先级</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">描述</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {relatedActivations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">暂无关联策略</td>
              </tr>
            ) : (
              relatedActivations.map((activation) => (
                <tr key={activation.id} className="hover:bg-[#f0f7ff] transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-[#1890ff] font-mono cursor-pointer hover:underline">{activation.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">P{activation.priority}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{activation.description}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getLifecycleBadge(activation.lifecycleState)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Render: Related Features ──
  const renderRelatedFeatures = () => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Layers className="w-4 h-4 text-purple-500" />
        关联特征
        <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-0.5 rounded border border-purple-200 ml-2">{relatedFeatures.length}</span>
      </h3>
      {relatedFeatures.length === 0 ? (
        <p className="text-slate-400 text-sm">暂无关联特征</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {relatedFeatures.map(feature => (
            <span key={feature.id} className="bg-purple-50 text-purple-700 text-xs font-mono px-3 py-1.5 rounded border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
              {feature.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render: Version Timeline ──
  const renderVersionTimeline = () => {
    if (isCreating) return null;

    const isEditMode = mode === 'edit';

    return (
      <div className="w-[260px] shrink-0 border-l border-slate-200 pl-6">
        <div className="sticky top-6">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-500" />
            版本记录
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200"></div>

            <div className="space-y-6">
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 pl-6">暂无版本记录</p>
              ) : (
                history.map((version, idx) => {
                  const isFirst = idx === 0;
                  const isSelected = selectedVersionId === version.id;
                  const dotActive = isSelected || (isFirst && !selectedVersionId);

                  return (
                    <div
                      key={version.id}
                      className={`relative pl-6 py-1 px-1 -ml-1 cursor-pointer rounded-md transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
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
                        <div className="mt-1">{getLifecycleBadge(version.content.lifecycleState)}</div>
                        <p className="text-xs text-slate-500 mt-1">{version.commitMessage}</p>
                        <div className="flex items-center text-[10px] text-slate-400 mt-1 gap-1">
                          <Clock className="w-3 h-3" />
                          {version.createAt}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{version.editor}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Confirm Dialog ──
  const renderConfirmDialog = () => {
    if (!confirmAction) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">确认</h3>
          <p className="text-sm text-slate-600 mb-6">有未保存的修改，确定要放弃吗？</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={handleConfirmNo}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmYes}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Save Success Dialog ──
  const renderSaveSuccessDialog = () => {
    if (!showSaveSuccess) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">保存成功</h3>
          <p className="text-sm text-slate-600 mb-6">接入点已保存成功。</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              返回列表
            </button>
            <button
              onClick={handleStay}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
            >
              留在当前页面
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      {/* Header */}
      {renderHeader()}

      {/* Main Content + Version Timeline */}
      <div className="flex gap-6">
        {/* Left: Main Content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Basic Info with fade transition */}
          <div className="relative">
            <div className={`transition-opacity duration-200 ${mode === 'view' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {renderBasicInfoView()}
            </div>
            <div className={`transition-opacity duration-200 ${mode === 'edit' ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}>
              {renderBasicInfoEdit()}
            </div>
          </div>

          {/* Related Activations (always read-only) */}
          {renderRelatedActivations()}

          {/* Related Features (always read-only) */}
          {renderRelatedFeatures()}
        </div>

        {/* Right: Version Timeline */}
        {renderVersionTimeline()}
      </div>

      {/* Dialogs */}
      {renderConfirmDialog()}
      {renderSaveSuccessDialog()}
    </div>
  );
};
