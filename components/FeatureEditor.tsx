import React, { useState, useEffect, useCallback } from 'react';
import {
  Feature, FeatureStatus, FeatureLifecycle, FeatureType, WriteSource, FeatureValueType, t, DraftItem, ReleaseType, AggregationMethod, DatePartitionValueStrategy,
  ConditionExpression, ConditionGroup, ConditionItem, ConditionOperator, LogicType, FeatureVersion
} from '../types';
import { Save, X, ShoppingCart, Code, Plus, Trash2, Settings, List, GitBranch, AlertCircle, Database, MessageSquare, Filter, Brackets, Slice, History, Clock, Eye, CheckCircle2 } from 'lucide-react';
import { suggestionData, mockFeatureVersions } from '../mockData';

// ----------------------------------------------------------------------
// Internal Component: Condition Expression Editor (Visual Expression Builder)
// ----------------------------------------------------------------------

const newId = () => `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
const emptyCondition = (): ConditionItem => ({ id: newId(), field: '', operator: ConditionOperator.EQ, value: '' });
const emptyGroup = (): ConditionGroup => ({ id: newId(), logic: 'AND', children: [emptyCondition()] });
const isGroup = (node: ConditionItem | ConditionGroup): node is ConditionGroup => 'children' in node;

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; noValue?: boolean }[] = [
  { value: ConditionOperator.EQ, label: '等于' }, { value: ConditionOperator.NEQ, label: '不等于' },
  { value: ConditionOperator.GT, label: '大于' }, { value: ConditionOperator.GTE, label: '大于等于' },
  { value: ConditionOperator.LT, label: '小于' }, { value: ConditionOperator.LTE, label: '小于等于' },
  { value: ConditionOperator.IN, label: '在列表中' }, { value: ConditionOperator.NOT_IN, label: '不在列表中' },
  { value: ConditionOperator.CONTAINS, label: '包含' }, { value: ConditionOperator.NOT_CONTAINS, label: '不包含' },
  { value: ConditionOperator.IS_NULL, label: '为空', noValue: true }, { value: ConditionOperator.IS_NOT_NULL, label: '不为空', noValue: true },
  { value: ConditionOperator.REGEX, label: '正则匹配' },
];
const FIELD_SUGGESTIONS = ['fact.amount', 'fact.userId', 'fact.deviceId', 'fact.channel', 'fact.ip', 'fact.merchantId', 'fact.productType', 'fact.riskLevel', 'eventPoint', 'context.userLevel', 'context.region'];
const noValueOperators = new Set([ConditionOperator.IS_NULL, ConditionOperator.IS_NOT_NULL]);

// Data migration to convert old format to new recursive format
const migrateExpression = (expr: any): ConditionGroup => {
  if (!expr || !expr.logic) return { id: newId(), logic: 'AND', children: [] };
  if (expr.id && 'children' in expr) return expr; // Already new format

  const newChildren: (ConditionItem | ConditionGroup)[] = [];
  if (expr.groups && Array.isArray(expr.groups)) {
    expr.groups.forEach((group: any) => {
      if (group.conditions && Array.isArray(group.conditions)) {
        newChildren.push({
          id: newId(),
          logic: group.logic || 'AND',
          children: group.conditions.map((cond: any) => ({ ...cond, id: newId() }))
        });
      }
    });
  }
  return { id: newId(), logic: expr.logic, children: newChildren };
};

// --- Editor Components ---

type TreeUpdater = (fn: (root: ConditionGroup) => ConditionGroup) => void;

interface ConditionItemNodeProps {
  item: ConditionItem;
  update: TreeUpdater;
  remove: TreeUpdater;
  readOnly?: boolean;
}

const ConditionItemNode: React.FC<ConditionItemNodeProps> = ({ item, update, remove, readOnly }) => {
  const updateItem = (field: keyof ConditionItem, value: any) => {
    update(root => updateTree(root, { ...item, [field]: value }));
  };

  return (
    <div className="group/item flex items-center gap-0 rounded-lg transition-all duration-200" style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.border = '1px solid #a5b4fc';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.1), 0 1px 2px rgba(0,0,0,0.04)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.border = '1px solid #e2e8f0';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      {/* Field input with left accent */}
      <div className="relative flex items-center" style={{ borderRight: '1px solid #f1f5f9' }}>
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, #818cf8, #6366f1)' }} />
        <input
          type="text" list="field-suggestions"
          className="w-44 pl-4 pr-3 py-2.5 text-[13px] bg-transparent border-0 outline-none placeholder-slate-300 disabled:text-slate-400"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace", letterSpacing: '-0.01em' }}
          value={item.field}
          onChange={e => updateItem('field', e.target.value)}
          placeholder="字段路径" disabled={readOnly}
        />
        <datalist id="field-suggestions">{FIELD_SUGGESTIONS.map(f => <option key={f} value={f} />)}</datalist>
      </div>
      {/* Operator select - styled as a pill */}
      <div className="px-1.5 shrink-0" style={{ borderRight: '1px solid #f1f5f9' }}>
        <select
          className="appearance-none text-center py-1.5 px-2.5 text-xs font-medium rounded-md border-0 outline-none cursor-pointer disabled:cursor-default transition-colors duration-150"
          style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
            color: '#4338ca',
            minWidth: '72px',
          }}
          value={item.operator}
          onChange={e => {
            const op = e.target.value as ConditionOperator;
            update(root => updateTree(root, { ...item, operator: op, value: noValueOperators.has(op) ? '' : item.value }));
          }}
          disabled={readOnly}
        >
          {OPERATOR_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>
      {/* Value input */}
      {!noValueOperators.has(item.operator) && (
        <div className="flex-1 min-w-0">
          <input
            type="text"
            className="w-full px-3 py-2.5 text-[13px] bg-transparent border-0 outline-none placeholder-slate-300 disabled:text-slate-400"
            value={item.value}
            onChange={e => updateItem('value', e.target.value)}
            placeholder={item.operator === ConditionOperator.IN || item.operator === ConditionOperator.NOT_IN ? '逗号分隔多个值...' : '输入值...'}
            disabled={readOnly}
          />
        </div>
      )}
      {/* Delete button */}
      {!readOnly && (
        <button type="button" onClick={() => remove(root => updateTree(root, item.id))}
          className="shrink-0 w-8 h-8 flex items-center justify-center mr-1 rounded-md transition-all duration-150 opacity-0 group-hover/item:opacity-100"
          style={{ color: '#94a3b8' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="删除条件">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

interface ConditionGroupNodeProps {
  group: ConditionGroup;
  level: number;
  update: TreeUpdater;
  remove: TreeUpdater;
  readOnly?: boolean;
  isRoot?: boolean;
}

const LOGIC_STYLES = {
  AND: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    softBg: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    line: '#c7d2fe',
    lineActive: '#818cf8',
    accent: '#4f46e5',
    label: 'AND',
    labelShort: 'AND',
  },
  OR: {
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    softBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    line: '#fde68a',
    lineActive: '#fbbf24',
    accent: '#d97706',
    label: 'OR',
    labelShort: 'OR',
  },
};

const ConditionGroupNode: React.FC<ConditionGroupNodeProps> = ({ group, level, update, remove, readOnly, isRoot = false }) => {
  const setLogic = (logic: LogicType) => {
    update(root => updateTree(root, { ...group, logic }));
  };

  const addCondition = () => {
    update(root => updateTree(root, { ...group, children: [...group.children, emptyCondition()] }));
  };

  const addGroup = () => {
    update(root => updateTree(root, { ...group, children: [...group.children, emptyGroup()] }));
  };

  const style = LOGIC_STYLES[group.logic];
  const childCount = group.children.length;

  return (
    <div className="flex gap-0 min-w-0">
      {/* Left: Connector rail with logic badge */}
      <div className="flex flex-col items-center shrink-0 relative" style={{ width: '48px' }}>
        {/* Top connector line */}
        <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: childCount > 0 ? style.line : 'transparent', borderRadius: '1px' }} />
        {/* Logic toggle badge */}
        {readOnly ? (
          <div className="relative z-10 select-none whitespace-nowrap" style={{
            background: style.gradient,
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '10px',
            boxShadow: `0 2px 6px ${group.logic === 'AND' ? 'rgba(79,70,229,0.3)' : 'rgba(217,119,6,0.3)'}`,
          }}>
            {style.labelShort}
          </div>
        ) : (
          <div className="relative z-10 inline-flex rounded-full overflow-hidden shrink-0" style={{
            boxShadow: `0 2px 8px ${group.logic === 'AND' ? 'rgba(79,70,229,0.2)' : 'rgba(217,119,6,0.2)'}`,
            border: '2px solid #fff',
          }}>
            {(['AND', 'OR'] as LogicType[]).map(l => (
              <button key={l} type="button"
                className="transition-all duration-200"
                style={{
                  padding: '3px 10px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  background: group.logic === l ? LOGIC_STYLES[l].gradient : '#f8fafc',
                  color: group.logic === l ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  border: 'none',
                }}
                onClick={() => setLogic(l)}
              >{LOGIC_STYLES[l].labelShort}</button>
            ))}
          </div>
        )}
        {/* Bottom connector line */}
        <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: childCount > 0 ? style.line : 'transparent', borderRadius: '1px' }} />
      </div>

      {/* Right: Children list */}
      <div className="flex-1 min-w-0 flex flex-col">
        {group.children.map((node, index) => (
          <div key={node.id} className="flex items-center min-w-0" style={{ minHeight: '42px' }}>
            {/* Horizontal branch connector */}
            <div className="shrink-0 relative" style={{ width: '24px', height: '2px' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: `linear-gradient(90deg, ${style.line}, ${style.lineActive})`,
                borderRadius: '1px',
              }} />
              <div style={{
                position: 'absolute', right: '-2px', top: '-3px',
                width: '8px', height: '8px',
                borderRadius: '50%',
                background: '#fff',
                border: `2px solid ${style.lineActive}`,
              }} />
            </div>
            {/* Content node */}
            <div className="flex-1 min-w-0 py-[5px] ml-2">
              {isGroup(node) ? (
                <div className="relative group/subgroup rounded-xl transition-all duration-200" style={{
                  background: level < 2
                    ? 'linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.6) 100%)'
                    : 'rgba(248,250,252,0.5)',
                  border: '1px dashed #cbd5e1',
                  padding: '8px 8px 8px 4px',
                }}>
                  <ConditionGroupNode group={node} level={level + 1} update={update} remove={remove} readOnly={readOnly} />
                  {!readOnly && (
                    <button type="button" onClick={() => remove(root => updateTree(root, node.id))}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 opacity-0 group-hover/subgroup:opacity-100"
                      style={{
                        background: '#fff',
                        border: '1.5px solid #e2e8f0',
                        color: '#94a3b8',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#fca5a5';
                        (e.currentTarget as HTMLElement).style.color = '#ef4444';
                        (e.currentTarget as HTMLElement).style.background = '#fef2f2';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
                        (e.currentTarget as HTMLElement).style.color = '#94a3b8';
                        (e.currentTarget as HTMLElement).style.background = '#fff';
                      }}
                      title="删除条件组">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <ConditionItemNode item={node} update={update} remove={remove} readOnly={readOnly} />
              )}
            </div>
          </div>
        ))}
        {/* Add buttons row */}
        {!readOnly && (
          <div className="flex items-center" style={{ minHeight: '34px' }}>
            <div className="shrink-0" style={{ width: '24px', height: '2px', background: `${style.line}88`, borderRadius: '1px' }} />
            <div className="flex items-center gap-2 py-1 ml-2">
              <button type="button" onClick={addCondition}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                style={{
                  color: '#6366f1',
                  background: 'rgba(238,242,255,0.7)',
                  border: '1px dashed #c7d2fe',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#eef2ff';
                  (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(99,102,241,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(238,242,255,0.7)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <Plus className="w-3 h-3" /> 条件
              </button>
              <button type="button" onClick={addGroup}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                style={{
                  color: '#8b5cf6',
                  background: 'rgba(245,243,255,0.7)',
                  border: '1px dashed #ddd6fe',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#f5f3ff';
                  (e.currentTarget as HTMLElement).style.borderColor = '#c4b5fd';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(139,92,246,0.12)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(245,243,255,0.7)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#ddd6fe';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <Brackets className="w-3 h-3" /> 条件组
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Immutable tree update logic
const updateTree = (root: ConditionGroup, op: (ConditionItem | ConditionGroup) | string): ConditionGroup => {
  const newRoot = JSON.parse(JSON.stringify(root)); // Deep copy for simplicity

  const findAndOperate = (current: ConditionGroup, operation: (ConditionItem | ConditionGroup) | string): ConditionGroup | null => {
    for (let i = 0; i < current.children.length; i++) {
      const node = current.children[i];
      if (typeof operation === 'string') { // Remove operation
        if (node.id === operation) {
          current.children.splice(i, 1);
          return newRoot;
        }
      } else { // Update operation
        if (node.id === operation.id) {
          current.children[i] = operation;
          return newRoot;
        }
      }
      if (isGroup(node)) {
        const result = findAndOperate(node, operation);
        if (result) return result;
      }
    }
    return null;
  };

  if (typeof op !== 'string' && root.id === op.id) {
    return op as ConditionGroup;
  }

  return findAndOperate(newRoot, op) || newRoot;
};

interface ConditionExpressionEditorProps {
  value: ConditionExpression;
  onChange: (value: ConditionExpression) => void;
  readOnly?: boolean;
}

const ConditionExpressionEditor: React.FC<ConditionExpressionEditorProps> = ({ value, onChange, readOnly }) => {
  const [root, setRoot] = useState(() => migrateExpression(value));

  useEffect(() => {
    // Sync parent state when internal state changes
    onChange(root);
  }, [root, onChange]);

  const update = useCallback((updater: (currentRoot: ConditionGroup) => ConditionGroup) => {
    setRoot(updater);
  }, []);

  if (root.children.length === 0 && readOnly) {
    return (
      <div className="rounded-xl p-8 text-center text-sm" style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px dashed #cbd5e1',
      }}>
        <Filter className="w-5 h-5 mx-auto mb-2" style={{ color: '#94a3b8' }} />
        <span style={{ color: '#94a3b8' }}>无前置条件，始终执行</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-x-auto" style={{
        background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(241,245,249,0.4) 100%)',
        border: '1px solid #e2e8f0',
        padding: '16px 16px 12px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
      }}>
        <ConditionGroupNode group={root} level={0} update={update} remove={update} readOnly={readOnly} isRoot />
      </div>
      {!readOnly && root.children.length === 0 && (
        <div className="text-center pt-3 pb-1">
          <button type="button" onClick={() => setRoot(r => ({ ...r, children: [emptyCondition()] }))}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200"
            style={{
              color: '#6366f1',
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '1px solid #c7d2fe',
              boxShadow: '0 1px 3px rgba(99,102,241,0.1)',
            }}
          >
            <Plus className="w-3.5 h-3.5" /> 添加第一个条件
          </button>
          <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>未配置条件时，默认始终执行特征提取</p>
        </div>
      )}
    </div>
  );
};
// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

interface FeatureEditorProps {
  initialFeature?: Feature | null;
  onSave: (feature: Feature) => Feature;
  onCancel: () => void;
  onAddToDrafts: (item: DraftItem) => void;
}

const emptyFeature: Feature = {
  name: '',
  description: '',
  status: FeatureStatus.ENABLED, 
  lifecycleState: FeatureLifecycle.DRAFT, // Default to DRAFT
  type: FeatureType.DIRECT_STORAGE,
  writeSource: WriteSource.REALTIME,
  valueType: FeatureValueType.STRING,
  eventPoints: [],
  dependentFeatures: [],
  conditionExpression: { id: newId(), logic: 'AND', children: [] },
  compositeKeyJsonPaths: '[]',
  calculationConfig: '{}',
  includeCurrentEvent: false,
  operator: 'current_user'
};

export const FeatureEditor: React.FC<FeatureEditorProps> = ({ initialFeature, onSave, onCancel, onAddToDrafts }) => {
  const readOnly = false; // readOnly removed from props; kept as local const for compatibility
  const [feature, setFeature] = useState<Feature>(initialFeature || { ...emptyFeature });
  const [eventPointInput, setEventPointInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [loadedVersionId, setLoadedVersionId] = useState<string | null>(null);

  // Version timeline data: only show for existing features
  const featureVersions = initialFeature?.id
    ? mockFeatureVersions.filter(v => v.featureId === initialFeature.id).sort((a, b) => b.version - a.version)
    : [];

  // Load a historical version into the form
  const handleLoadVersion = (version: FeatureVersion) => {
    const restored: Feature = {
      ...version.content,
      id: initialFeature?.id, // keep current id so save updates rather than creates
    };
    setFeature(restored);
    setEventPointInput(restored.eventPoints.join(', '));
    try { setCompositeKeys(JSON.parse(restored.compositeKeyJsonPaths || '[]')); } catch { setCompositeKeys([]); }
    try { setCalcConfig(JSON.parse(restored.calculationConfig || '{}')); } catch { setCalcConfig({}); }
    setLoadedVersionId(version.id);
  };

  // Local state for UI forms, synced with feature JSON strings
  const [compositeKeys, setCompositeKeys] = useState<{key: string, defaultValue: string}[]>([]);
  const [calcConfig, setCalcConfig] = useState<any>({});

  useEffect(() => {
    if (initialFeature) {
      setFeature(initialFeature);
      setEventPointInput(initialFeature.eventPoints.join(', '));
      
      // Parse JSONs safely
      try {
        setCompositeKeys(JSON.parse(initialFeature.compositeKeyJsonPaths || '[]'));
      } catch (e) { setCompositeKeys([]); }
      
      try {
        setCalcConfig(JSON.parse(initialFeature.calculationConfig || '{}'));
      } catch (e) { setCalcConfig({}); }
    } else {
        // Init defaults for new
        setCompositeKeys([]);
        setCalcConfig({});
    }
  }, [initialFeature]);

  // Sync helpers
  const updateCompositeKeys = (newKeys: any[]) => {
    setCompositeKeys(newKeys);
    handleChange('compositeKeyJsonPaths', JSON.stringify(newKeys));
  };

  const updateCalcConfig = (field: string, val: any) => {
    const newConfig = { ...calcConfig, [field]: val };
    // Remove empty keys to keep JSON clean
    if (val === '' || val === null || val === undefined) {
        delete newConfig[field];
    }
    setCalcConfig(newConfig);
    handleChange('calculationConfig', JSON.stringify(newConfig));
  };

  const handleChange = (field: keyof Feature, value: any) => {
    setFeature(prev => ({ ...prev, [field]: value }));
  };

  const handleEventPointsChange = (val: string) => {
    setEventPointInput(val);
    const points = val.split(',').map(s => s.trim()).filter(s => s !== '');
    handleChange('eventPoints', points);
  };

  // 保存为草稿
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const savedFeature = {
      ...feature,
      lifecycleState: FeatureLifecycle.DRAFT, // Ensure it's DRAFT
      updateAt: new Date().toISOString()
    };
    onSave(savedFeature);
    alert('特征已保存至草稿箱');
  };

  // 提交到待发布
  const handleSubmitToRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const featureToSave = {
        ...feature,
        id: feature.id || Date.now(), 
        lifecycleState: FeatureLifecycle.READY_FOR_RELEASE, // Mark as READY
        updateAt: new Date().toISOString()
    };
    
    // 1. Save Feature
    onSave(featureToSave);

    // 2. Add to Release Candidates List
    onAddToDrafts({
        id: `DFT-${Date.now()}`,
        type: ReleaseType.FEATURE,
        targetId: featureToSave.id!,
        targetName: featureToSave.name,
        version: 'vNext', // Placeholder version
        relatedKeys: feature.eventPoints.join(', '), // Add related keys
        updatedAt: featureToSave.updateAt!,
        editor: featureToSave.operator || 'current_user',
        changeSummary: commitMessage || (initialFeature ? '更新特征配置' : '新增特征')
    });
  };

  // Logic Helpers for Dynamic Fields
  const isAggregation = feature.type === FeatureType.AGGREGATION;
  const isStorage = feature.type === FeatureType.DIRECT_STORAGE || feature.type === FeatureType.HISTORY_STORAGE;
  const isOffline = feature.type === FeatureType.OFFLINE_STORAGE;

  return (
    <div className="flex gap-6 animate-in fade-in duration-300">
    {/* Left: Main Editor Form */}
    <div className="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">
            {initialFeature ? '修改特征配置' : '新增特征'}
            </h2>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs border border-slate-200">
                当前状态: {t(feature.lifecycleState)}
            </span>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      {!readOnly && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-1">生命周期说明：</p>
          <ul className="list-disc pl-5 space-y-1">
              <li><strong>保存草稿</strong>：仅保存至“我的草稿箱”，不会对线上产生影响。</li>
              <li><strong>提交待发布</strong>：标记为 Ready 状态，并加入“待发布清单”，等待发布经理创建发布单。</li>
          </ul>
        </div>
      )}

      <form className="space-y-6">
        {/* Section 1: 基础信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              特征名 (Name) {!readOnly && <span className="text-red-500">*</span>}
            </label>
            <input 
              type="text" 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
              value={feature.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入唯一的英文标识，如 user_login_count"
              disabled={!!initialFeature || readOnly} 
            />
            {!readOnly && <p className="mt-1 text-xs text-slate-400">系统唯一标识，创建后不可修改。</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              特征描述 {!readOnly && <span className="text-red-500">*</span>}
            </label>
            <input 
              type="text" 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              value={feature.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="例如：用户近1小时登录次数"
              disabled={readOnly}
            />
          </div>
          
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">启用状态</label>
             <div className="flex space-x-4">
                {[FeatureStatus.ENABLED, FeatureStatus.DISABLED].map(s => (
                   <label key={s} className={`flex items-center space-x-2 cursor-pointer px-3 py-2 rounded border border-slate-200 ${readOnly ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'bg-slate-50 hover:border-indigo-200'}`}>
                      <input 
                        type="radio" 
                        name="status"
                        className="text-indigo-600 focus:ring-indigo-500"
                        checked={feature.status === s}
                        onChange={() => handleChange('status', s)}
                        disabled={readOnly}
                      />
                      <span className="text-sm text-slate-700">{t(s)}</span>
                   </label>
                ))}
             </div>
             {!readOnly && <p className="mt-1 text-xs text-slate-400">控制该特征上线后是否实际执行计算。通常默认为“已启用”。</p>}
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">数据类型</label>
             <select
               className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500"
               value={feature.valueType}
               onChange={(e) => handleChange('valueType', e.target.value)}
               disabled={readOnly}
             >
               {Object.values(FeatureValueType).map(type => (
                 <option key={type} value={type}>{t(type)}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Section 2: 计算源配置 */}
        <div className="border-t border-slate-100 pt-6">
           <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">数据源与计算配置</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">特征类型</label>
                 <select
                   className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                   value={feature.type}
                   onChange={(e) => handleChange('type', e.target.value)}
                   disabled={readOnly}
                 >
                   {Object.values(FeatureType).map(type => (
                     <option key={type} value={type}>{t(type)}</option>
                   ))}
                 </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">数据来源</label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  value={feature.writeSource}
                  onChange={(e) => handleChange('writeSource', e.target.value)}
                  disabled={readOnly}
                >
                  {Object.values(WriteSource).map(ws => (
                    <option key={ws} value={ws}>{t(ws)}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">触发事件接入点</label>
                <div className="relative">
                  <input 
                    type="text" 
                    list="ep-suggestions"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono disabled:bg-slate-50 disabled:text-slate-500"
                    value={eventPointInput}
                    onChange={(e) => handleEventPointsChange(e.target.value)}
                    placeholder="例如: EP00000001"
                    disabled={readOnly}
                  />
                  {!readOnly && <datalist id="ep-suggestions">
                    {suggestionData.eventPoints.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.desc}</option>
                    ))}
                  </datalist>}
                </div>
                {!readOnly && <p className="text-xs text-slate-400 mt-1">该特征将在哪些事件发生时触发计算。支持多个接入点，以逗号分隔。</p>}
              </div>
           </div>
        </div>

        {/* Section 3: 逻辑配置 */}
        <div className="border-t border-slate-100 pt-6">
           <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">核心逻辑配置</h3>

           <div className="space-y-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-500" />
                    前置条件表达式
                 </label>
                 <ConditionExpressionEditor
                   value={feature.conditionExpression}
                   onChange={(val) => handleChange('conditionExpression', val)}
                   readOnly={readOnly}
                 />
                 {!readOnly && <p className="text-xs text-slate-400 mt-1">满足条件时才会执行特征提取。可使用 fact.* 访问事件字段，context.* 访问全局上下文。</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Composite Key Editor (Always Visible) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                     <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <List className="w-4 h-4 text-indigo-500"/>
                            复合键维度配置 (Key)
                        </label>
                        {!readOnly && (
                            <button 
                                type="button"
                                onClick={() => updateCompositeKeys([...compositeKeys, {key: '', defaultValue: ''}])}
                                className="text-xs flex items-center text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded transition-colors"
                            >
                                <Plus className="w-3 h-3 mr-1" /> 添加维度
                            </button>
                        )}
                     </div>
                     
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {compositeKeys.length === 0 ? (
                            <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-300 rounded">
                                无维度配置
                            </div>
                        ) : (
                            compositeKeys.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200">
                                    <div className="flex-1 space-y-1">
                                        <input 
                                            type="text" 
                                            placeholder="提取路径 (Key)"
                                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={item.key}
                                            onChange={(e) => {
                                                const newKeys = [...compositeKeys];
                                                newKeys[idx].key = e.target.value;
                                                updateCompositeKeys(newKeys);
                                            }}
                                            disabled={readOnly}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="默认值 (Default)"
                                            className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-slate-600 disabled:bg-slate-50 disabled:text-slate-500"
                                            value={item.defaultValue}
                                            onChange={(e) => {
                                                const newKeys = [...compositeKeys];
                                                newKeys[idx].defaultValue = e.target.value;
                                                updateCompositeKeys(newKeys);
                                            }}
                                            disabled={readOnly}
                                        />
                                    </div>
                                    {!readOnly && (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const newKeys = [...compositeKeys];
                                                newKeys.splice(idx, 1);
                                                updateCompositeKeys(newKeys);
                                            }}
                                            className="text-slate-400 hover:text-red-500 mt-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                     </div>
                     {!readOnly && <p className="text-xs text-slate-400 mt-2">定义特征的聚合维度或存储主键，例如 `properties.userId`。</p>}
                  </div>

                  {/* Calculation Config Editor (Dynamic based on Type) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                     <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Settings className="w-4 h-4 text-indigo-500"/>
                        参数配置 ({t(feature.type)})
                     </label>
                     
                     <div className="space-y-3">

                         {/* Case A: 聚合特征 (Aggregation) */}
                         {isAggregation && (
                           <>
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">聚合方法 (Method)</label>
                                 <input 
                                    type="text"
                                    list="calc-methods"
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={calcConfig.method || ''}
                                    onChange={(e) => updateCalcConfig('method', e.target.value)}
                                    placeholder="请选择聚合方法"
                                    disabled={readOnly}
                                 />
                                 {!readOnly && <datalist id="calc-methods">
                                     {Object.values(AggregationMethod).map(m => (
                                         <option key={m} value={m}>{t(m)}</option>
                                     ))}
                                 </datalist>}
                             </div>
                             <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">来源特征 (Source Feature)</label>
                                 <input 
                                    type="text"
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={calcConfig.sourceFeatureName || ''}
                                    onChange={(e) => updateCalcConfig('sourceFeatureName', e.target.value)}
                                    placeholder="输入依赖的基础特征名称"
                                    disabled={readOnly}
                                 />
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">时间窗口 (秒)</label>
                                <input 
                                    type="number"
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={calcConfig.timeWindowSeconds || ''}
                                    onChange={(e) => updateCalcConfig('timeWindowSeconds', parseInt(e.target.value) || 0)}
                                    placeholder="例如: 3600 (1小时)"
                                    disabled={readOnly}
                                />
                             </div>
                           </>
                         )}

                         {/* Case B: 直接存储 / 历史存储 (Direct / History) */}
                         {isStorage && (
                           <>
                              <div>
                                 <label className="block text-xs font-medium text-slate-500 mb-1">数值提取路径 (Value JsonPath)</label>
                                 <input 
                                    type="text"
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none font-mono text-slate-600 disabled:bg-slate-50 disabled:text-slate-500"
                                    value={calcConfig.valueJsonPath || ''}
                                    onChange={(e) => updateCalcConfig('valueJsonPath', e.target.value)}
                                    placeholder="例如: properties.amount"
                                    disabled={readOnly}
                                 />
                                 {!readOnly && <p className="text-[10px] text-slate-400 mt-0.5">从事件中提取该字段的值进行存储。</p>}
                             </div>
                             <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">TTL 有效期 (秒)</label>
                                <input 
                                    type="number"
                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                    value={calcConfig.ttlSeconds || ''}
                                    onChange={(e) => updateCalcConfig('ttlSeconds', parseInt(e.target.value) || 0)}
                                    placeholder="例如: 86400 (1天)"
                                    disabled={readOnly}
                                />
                            </div>
                           </>
                         )}

                         {/* Case C: 离线存储 (Offline) */}
                         {isOffline && (
                            <>
                               <div className="col-span-full">
                                  <div className="bg-yellow-50 border border-yellow-100 rounded p-2 mb-3 flex items-start gap-2">
                                     <Database className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                                     <p className="text-xs text-yellow-700">
                                       离线特征通过 T+1 定时任务计算，需准确配置数仓源表及分区策略。
                                     </p>
                                  </div>
                               </div>

                               <div className="col-span-full border-b border-slate-200 pb-1 mb-2">
                                  <span className="text-xs font-bold text-slate-800">源表信息配置</span>
                               </div>

                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">来源表名 (Source Table)</label>
                                  <input 
                                      type="text"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.sourceTable || ''}
                                      onChange={(e) => updateCalcConfig('sourceTable', e.target.value)}
                                      placeholder="如: ads.ads_risk_user_stat"
                                      disabled={readOnly}
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">来源字段 (Source Column)</label>
                                  <input 
                                      type="text"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.sourceColumn || ''}
                                      onChange={(e) => updateCalcConfig('sourceColumn', e.target.value)}
                                      placeholder="如: user_txn_count_30d"
                                      disabled={readOnly}
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">主键列 (Entity ID)</label>
                                  <input 
                                      type="text"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.entityIdColumn || ''}
                                      onChange={(e) => updateCalcConfig('entityIdColumn', e.target.value)}
                                      placeholder="如: user_id"
                                      disabled={readOnly}
                                  />
                               </div>

                               <div className="col-span-full border-b border-slate-200 pb-1 mb-2 mt-2">
                                  <span className="text-xs font-bold text-slate-800">分区策略配置</span>
                               </div>

                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">分区字段 (Partition Col)</label>
                                  <input 
                                      type="text"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.datePartitionColumn || 'd_date'}
                                      onChange={(e) => updateCalcConfig('datePartitionColumn', e.target.value)}
                                      placeholder="如: d_date / pt_d"
                                      disabled={readOnly}
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">分区取值策略</label>
                                  <select 
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.datePartitionValueStrategy || ''}
                                      onChange={(e) => updateCalcConfig('datePartitionValueStrategy', e.target.value)}
                                      disabled={readOnly}
                                  >
                                      <option value="">请选择...</option>
                                      {Object.values(DatePartitionValueStrategy).map(s => (
                                          <option key={s} value={s}>{t(s)}</option>
                                      ))}
                                  </select>
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">分区格式 (Format)</label>
                                  <input 
                                      type="text"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none font-mono disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.datePartitionFormat || 'YYYY_MM_DD'}
                                      onChange={(e) => updateCalcConfig('datePartitionFormat', e.target.value)}
                                      placeholder="如: YYYYMMDD"
                                      disabled={readOnly}
                                  />
                               </div>
                               <div>
                                  <label className="block text-xs font-medium text-slate-500 mb-1">回退天数 (Fallback Days)</label>
                                  <input 
                                      type="number"
                                      className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:border-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                                      value={calcConfig.datePartitionFallbackDays || ''}
                                      onChange={(e) => updateCalcConfig('datePartitionFallbackDays', parseInt(e.target.value) || 0)}
                                      placeholder="数据延迟时的容错天数"
                                      disabled={readOnly}
                                  />
                               </div>
                            </>
                         )}

                     </div>
                  </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 bg-slate-50 p-3 rounded">
                 <input 
                   type="checkbox" 
                   id="includeEvent"
                   className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                   checked={feature.includeCurrentEvent}
                   onChange={(e) => handleChange('includeCurrentEvent', e.target.checked)}
                   disabled={readOnly}
                 />
                 <label htmlFor="includeEvent" className="text-sm text-slate-700 font-medium select-none cursor-pointer">
                   计算结果包含当前触发事件的数据
                 </label>
              </div>

              {/* Commit Message Section */}
              <div className="border-t border-slate-200 pt-6">
                <label className="block text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500"/>
                    提交说明 (Commit Message)
                </label>
                <div className="relative">
                    <textarea 
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] disabled:bg-slate-50 disabled:text-slate-500"
                        placeholder="请简要描述本次修改的内容、原因或注意事项，该说明将记录在历史版本中..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        disabled={readOnly}
                    />
                </div>
              </div>
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 sticky bottom-0 bg-white p-4 -mx-6 -mb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <button 
             type="button" 
             onClick={onCancel}
             className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
           >
             取消
           </button>
           {!readOnly && (
               <>
                <button 
                    type="button"
                    onClick={handleSaveDraft}
                    className="flex items-center px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
                >
                    <GitBranch className="w-4 h-4 mr-2" />
                    保存草稿
                </button>
                <button 
                    type="button"
                    onClick={handleSubmitToRelease} 
                    className="flex items-center px-5 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    提交待发布
                </button>
               </>
           )}
        </div>
      </form>
    </div>

    {/* Right: Version Timeline Sidebar (only for editing existing features) */}
    {initialFeature && featureVersions.length > 0 && (
      <div className="w-[260px] shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sticky top-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <History className="w-4 h-4 text-indigo-500" />
            版本记录
          </h3>
          <div className="relative">
            {featureVersions.map((version, index) => {
              const isLoaded = loadedVersionId === version.id;
              const isCurrent = index === 0 && !loadedVersionId;
              const isActive = isLoaded || isCurrent;
              return (
                <div key={version.id} className="relative flex gap-3 group">
                  {/* Vertical timeline line */}
                  {index < featureVersions.length - 1 && (
                    <div
                      className="absolute left-[7px] top-[18px] w-[2px] bg-slate-200"
                      style={{ height: 'calc(100% - 2px)' }}
                    />
                  )}
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1 shrink-0">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        isActive
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'bg-white border-slate-300 group-hover:border-indigo-400'
                      } transition-colors`}
                    />
                  </div>
                  {/* Version info */}
                  <div
                    className={`flex-1 min-w-0 pb-5 cursor-pointer rounded-md px-2 py-1.5 -mt-0.5 transition-colors ${
                      isActive
                        ? 'bg-indigo-50'
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => handleLoadVersion(version)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold font-mono ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                        v{version.version}
                      </span>
                      {isLoaded && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                          已加载
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">
                          当前
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 truncate" title={version.commitMessage}>
                      {version.commitMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span>{version.editor}</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {version.createAt.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </div>
  );
};