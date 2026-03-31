
import React, { useState, useEffect, useCallback } from 'react';
import {
  Rule, RuleVersion, FeatureStatus, FeatureLifecycle, RuleOperator, ActionType, ExecutionMode, t,
  ConditionExpression, ConditionGroup, ConditionItem, ConditionOperator, LogicType, RuleAction
} from '../types';
import { Save, X, Plus, Trash2, Filter, Brackets, ArrowLeft, ShoppingCart, GitBranch, History, Clock } from 'lucide-react';
import { mockActivations, mockActions, mockRuleVersions } from '../mockData';

// ----------------------------------------------------------------------
// Condition Expression Editor (Reused from FeatureEditor)
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
const FIELD_SUGGESTIONS = ['fact.amount', 'fact.userId', 'fact.deviceId', 'fact.channel', 'fact.ip', 'fact.merchantId', 'fact.productType', 'fact.riskLevel', 'eventPoint', 'context.userLevel', 'context.region', 'features.user_txn_count_24h', 'features.model_score', 'properties.amount', 'properties.currency', 'properties.isNewDevice'];
const noValueOperators = new Set([ConditionOperator.IS_NULL, ConditionOperator.IS_NOT_NULL]);

const migrateExpression = (expr: any): ConditionGroup => {
  if (!expr || !expr.logic) return { id: newId(), logic: 'AND', children: [] };
  if (expr.id && 'children' in expr) return expr;

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

// --- Tree Update Logic ---
const updateTree = (root: ConditionGroup, op: (ConditionItem | ConditionGroup) | string): ConditionGroup => {
  const newRoot = JSON.parse(JSON.stringify(root));

  const findAndOperate = (current: ConditionGroup, operation: (ConditionItem | ConditionGroup) | string): ConditionGroup | null => {
    for (let i = 0; i < current.children!.length; i++) {
      const node = current.children![i];
      if (typeof operation === 'string') {
        if (node.id === operation) {
          current.children!.splice(i, 1);
          return newRoot;
        }
      } else {
        if (node.id === operation.id) {
          current.children![i] = operation;
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

type TreeUpdater = (fn: (root: ConditionGroup) => ConditionGroup) => void;

// --- Condition Item Node ---
const ConditionItemNode: React.FC<{ item: ConditionItem; update: TreeUpdater; remove: TreeUpdater }> = ({ item, update, remove }) => {
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
      <div className="relative flex items-center" style={{ borderRight: '1px solid #f1f5f9' }}>
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, #818cf8, #6366f1)' }} />
        <input
          type="text" list="rule-field-suggestions"
          className="w-44 pl-4 pr-3 py-2.5 text-[13px] bg-transparent border-0 outline-none placeholder-slate-300"
          style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace", letterSpacing: '-0.01em' }}
          value={item.field}
          onChange={e => updateItem('field', e.target.value)}
          placeholder="字段路径"
        />
        <datalist id="rule-field-suggestions">{FIELD_SUGGESTIONS.map(f => <option key={f} value={f} />)}</datalist>
      </div>
      <div className="px-1.5 shrink-0" style={{ borderRight: '1px solid #f1f5f9' }}>
        <select
          className="appearance-none text-center py-1.5 px-2.5 text-xs font-medium rounded-md border-0 outline-none cursor-pointer transition-colors duration-150"
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
        >
          {OPERATOR_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
        </select>
      </div>
      {!noValueOperators.has(item.operator) && (
        <div className="flex-1 min-w-0">
          <input
            type="text"
            className="w-full px-3 py-2.5 text-[13px] bg-transparent border-0 outline-none placeholder-slate-300"
            value={item.value}
            onChange={e => updateItem('value', e.target.value)}
            placeholder={item.operator === ConditionOperator.IN || item.operator === ConditionOperator.NOT_IN ? '逗号分隔多个值...' : '输入值...'}
          />
        </div>
      )}
      <button type="button" onClick={() => remove(root => updateTree(root, item.id))}
        className="shrink-0 w-8 h-8 flex items-center justify-center mr-1 rounded-md transition-all duration-150 opacity-0 group-hover/item:opacity-100"
        style={{ color: '#94a3b8' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        title="删除条件">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// --- Logic Styles ---
const LOGIC_STYLES = {
  AND: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    line: '#c7d2fe',
    lineActive: '#818cf8',
    labelShort: 'AND',
  },
  OR: {
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    line: '#fde68a',
    lineActive: '#fbbf24',
    labelShort: 'OR',
  },
};

// --- Condition Group Node ---
const ConditionGroupNode: React.FC<{
  group: ConditionGroup;
  level: number;
  update: TreeUpdater;
  remove: TreeUpdater;
  isRoot?: boolean;
}> = ({ group, level, update, remove, isRoot = false }) => {
  const setLogic = (logic: LogicType) => {
    update(root => updateTree(root, { ...group, logic }));
  };

  const addCondition = () => {
    update(root => updateTree(root, { ...group, children: [...(group.children || []), emptyCondition()] }));
  };

  const addGroup = () => {
    update(root => updateTree(root, { ...group, children: [...(group.children || []), emptyGroup()] }));
  };

  const style = LOGIC_STYLES[group.logic];
  const children = group.children || [];

  return (
    <div className="flex gap-0 min-w-0">
      <div className="flex flex-col items-center shrink-0 relative" style={{ width: '48px' }}>
        <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: children.length > 0 ? style.line : 'transparent', borderRadius: '1px' }} />
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
        <div className="flex-1 min-h-[8px]" style={{ width: '2px', background: children.length > 0 ? style.line : 'transparent', borderRadius: '1px' }} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        {children.map((node) => (
          <div key={node.id} className="flex items-center min-w-0" style={{ minHeight: '42px' }}>
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
            <div className="flex-1 min-w-0 py-[5px] ml-2">
              {isGroup(node) ? (
                <div className="relative group/subgroup rounded-xl transition-all duration-200" style={{
                  background: level < 2
                    ? 'linear-gradient(135deg, rgba(248,250,252,0.8) 0%, rgba(241,245,249,0.6) 100%)'
                    : 'rgba(248,250,252,0.5)',
                  border: '1px dashed #cbd5e1',
                  padding: '8px 8px 8px 4px',
                }}>
                  <ConditionGroupNode group={node} level={level + 1} update={update} remove={remove} />
                  <button type="button" onClick={() => remove(root => updateTree(root, node.id!))}
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
                </div>
              ) : (
                <ConditionItemNode item={node as ConditionItem} update={update} remove={remove} />
              )}
            </div>
          </div>
        ))}
        {/* Add buttons row */}
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
      </div>
    </div>
  );
};

// --- Condition Expression Editor ---
const ConditionExpressionEditor: React.FC<{
  value: ConditionExpression;
  onChange: (value: ConditionExpression) => void;
}> = ({ value, onChange }) => {
  const [root, setRoot] = useState(() => migrateExpression(value));

  useEffect(() => {
    onChange(root);
  }, [root, onChange]);

  const update = useCallback((updater: (currentRoot: ConditionGroup) => ConditionGroup) => {
    setRoot(updater);
  }, []);

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-x-auto" style={{
        background: 'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(241,245,249,0.4) 100%)',
        border: '1px solid #e2e8f0',
        padding: '16px 16px 12px',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
      }}>
        <ConditionGroupNode group={root} level={0} update={update} remove={update} isRoot />
      </div>
      {root.children!.length === 0 && (
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
          <p className="text-xs mt-3" style={{ color: '#94a3b8' }}>未配置条件时，默认始终命中规则</p>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// Main Component: RuleEditor
// ----------------------------------------------------------------------

interface RuleEditorProps {
  initialRule: Rule | null;
  onSave: (rule: Rule) => Rule;
  onCancel: () => void;
}

const emptyRule: Rule = {
  name: '',
  description: '',
  activationName: '',
  eventPoint: '',
  conditionExpression: { id: newId(), logic: 'AND', children: [] },
  initScore: 0,
  baseNum: 0,
  operator: RuleOperator.ADD,
  valueField: '',
  max: null,
  rate: 1.0,
  status: FeatureStatus.ENABLED,
  lifecycleState: FeatureLifecycle.DRAFT,
  priority: 1,
  actions: [],
  editOperator: 'current_user',
};

export const RuleEditor: React.FC<RuleEditorProps> = ({ initialRule, onSave, onCancel }) => {
  const [rule, setRule] = useState<Rule>(initialRule || { ...emptyRule });
  const [ruleActions, setRuleActions] = useState<RuleAction[]>(initialRule?.actions || []);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Version history filtered by ruleId
  const isEditing = !!initialRule?.id;
  const history = isEditing ? mockRuleVersions.filter(v => v.ruleId === initialRule!.id) : [];

  useEffect(() => {
    if (initialRule) {
      setRule(initialRule);
      setRuleActions(initialRule.actions || []);
    }
  }, [initialRule]);

  // Load version content into form
  const handleLoadVersion = (version: RuleVersion) => {
    setSelectedVersionId(version.id);
    const content = version.content;
    setRule(prev => ({
      ...prev,
      name: content.name,
      description: content.description,
      activationName: content.activationName,
      eventPoint: content.eventPoint,
      conditionExpression: content.conditionExpression,
      initScore: content.initScore,
      baseNum: content.baseNum,
      operator: content.operator,
      valueField: content.valueField,
      max: content.max,
      rate: content.rate,
      status: content.status,
      priority: content.priority,
      // keep original id
    }));
    setRuleActions(content.actions || []);
  };

  const handleChange = (field: keyof Rule, value: any) => {
    setRule(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill eventPoint when activation changes
  const handleActivationChange = (activationName: string) => {
    handleChange('activationName', activationName);
    const activation = mockActivations.find(a => a.name === activationName);
    if (activation) {
      handleChange('eventPoint', activation.eventPoint);
    }
  };

  // --- Action Handlers ---
  const addAction = () => {
    setRuleActions(prev => [...prev, {
      actionName: '',
      actionType: ActionType.TAG,
      executionMode: ExecutionMode.SYNC,
      actionConfig: '{}',
      priority: prev.length + 1,
    }]);
  };

  const updateAction = (index: number, field: keyof RuleAction, value: any) => {
    setRuleActions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleActionSelect = (index: number, actionName: string) => {
    const action = mockActions.find(a => a.name === actionName);
    if (action) {
      setRuleActions(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], actionName: action.name, actionType: action.type };
        return updated;
      });
    }
  };

  const removeAction = (index: number) => {
    setRuleActions(prev => prev.filter((_, i) => i !== index));
  };

  // --- Save ---
  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const savedRule = {
      ...rule,
      actions: ruleActions,
      lifecycleState: FeatureLifecycle.DRAFT,
      updateAt: new Date().toISOString(),
    };
    onSave(savedRule);
  };

  const handleSubmitToRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const savedRule = {
      ...rule,
      id: rule.id || Date.now(),
      actions: ruleActions,
      lifecycleState: FeatureLifecycle.READY_FOR_RELEASE,
      updateAt: new Date().toISOString(),
    };
    onSave(savedRule);
  };

  // Find current activation's eventPoint for display
  const selectedActivation = mockActivations.find(a => a.name === rule.activationName);

  return (
    <div className="animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-slate-800">
            {initialRule ? '修改规则配置' : '新增规则'}
          </h2>
          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs border border-slate-200">
            当前状态: {t(rule.lifecycleState)}
          </span>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-6">
      {/* Left: Form */}
      <div className="flex-1 min-w-0">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <form className="space-y-6">
        {/* Section 1: 基本信息 */}
        <div>
          <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">基本信息</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                规则名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500"
                style={{ fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" }}
                value={rule.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="请输入唯一的英文标识，如 rule_high_amount"
                disabled={!!initialRule}
              />
              {!initialRule && <p className="mt-1 text-xs text-slate-400">系统唯一标识，创建后不可修改。</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[38px]"
                value={rule.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="例如：大额交易检测规则"
                rows={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                所属策略 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                value={rule.activationName}
                onChange={(e) => handleActivationChange(e.target.value)}
              >
                <option value="">请选择策略</option>
                {mockActivations.map(a => (
                  <option key={a.name} value={a.name}>{a.name} ({a.eventPoint})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">所属接入点</label>
              <div className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 font-mono">
                {rule.eventPoint || (selectedActivation ? selectedActivation.eventPoint : '（自动跟随策略选择）')}
              </div>
              <p className="mt-1 text-xs text-slate-400">根据所选策略自动填充，不可手动修改。</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">执行优先级</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={rule.priority}
                onChange={(e) => handleChange('priority', parseInt(e.target.value) || 1)}
                min={1}
              />
              <p className="mt-1 text-xs text-slate-400">数字越小优先级越高。</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">运行状态</label>
              <div className="flex space-x-4">
                {[FeatureStatus.ENABLED, FeatureStatus.DISABLED].map(s => (
                  <label key={s} className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded border border-slate-200 bg-slate-50 hover:border-indigo-200">
                    <input
                      type="radio"
                      name="ruleStatus"
                      className="text-indigo-600 focus:ring-indigo-500"
                      checked={rule.status === s}
                      onChange={() => handleChange('status', s)}
                    />
                    <span className="text-sm text-slate-700">{t(s)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 评分配置 */}
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">评分配置</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">初始分值 (initScore)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                value={rule.initScore}
                onChange={(e) => handleChange('initScore', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">基数 (baseNum)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                value={rule.baseNum}
                onChange={(e) => handleChange('baseNum', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">运算符 (operator)</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
                value={rule.operator}
                onChange={(e) => handleChange('operator', e.target.value)}
              >
                {Object.values(RuleOperator).map(op => (
                  <option key={op} value={op}>{op} - {t(op)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">取值字段 (valueField)</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                value={rule.valueField}
                onChange={(e) => handleChange('valueField', e.target.value)}
                placeholder="如 amount, features.model_score"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">分值上限 (max, 可选)</label>
              <input
                type="number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                value={rule.max ?? ''}
                onChange={(e) => handleChange('max', e.target.value === '' ? null : parseFloat(e.target.value))}
                placeholder="不填则无上限"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">倍率 (rate)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                value={rule.rate}
                onChange={(e) => handleChange('rate', parseFloat(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: 条件表达式 */}
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            条件表达式
          </h3>
          <ConditionExpressionEditor
            value={rule.conditionExpression}
            onChange={(val) => handleChange('conditionExpression', val)}
          />
          <p className="text-xs text-slate-400 mt-2">满足条件时规则才会命中。可使用 fact.*, properties.*, features.* 字段。</p>
        </div>

        {/* Section 4: 关联动作 */}
        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">关联动作配置</h3>

          {ruleActions.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">动作选择</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">类型</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">执行模式</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 w-16">优先级</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">配置值 (JSON)</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ruleActions.map((action, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5">
                        <select
                          className="w-48 rounded border border-slate-300 px-2 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                          value={action.actionName}
                          onChange={(e) => handleActionSelect(idx, e.target.value)}
                        >
                          <option value="">请选择动作</option>
                          {mockActions.map(a => (
                            <option key={a.name} value={a.name}>{a.name} ({t(a.type)})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          action.actionType === ActionType.TAG ? 'bg-green-50 text-green-700 border-green-200' :
                          action.actionType === ActionType.WEBHOOK ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          action.actionType === ActionType.NOTIFY ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>{action.actionType}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          className="w-24 rounded border border-slate-300 px-2 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                          value={action.executionMode}
                          onChange={(e) => updateAction(idx, 'executionMode', e.target.value as ExecutionMode)}
                        >
                          <option value={ExecutionMode.SYNC}>同步</option>
                          <option value={ExecutionMode.ASYNC}>异步</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          className="w-16 rounded border border-slate-300 px-2 py-1.5 text-xs text-center focus:border-indigo-500 focus:outline-none"
                          value={action.priority}
                          onChange={(e) => updateAction(idx, 'priority', parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <textarea
                          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none font-mono min-h-[32px]"
                          value={action.actionConfig}
                          onChange={(e) => updateAction(idx, 'actionConfig', e.target.value)}
                          placeholder='{"key": "value"}'
                          rows={1}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeAction(idx)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="删除动作"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            onClick={addAction}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2"
            style={{
              color: '#6366f1',
              background: 'rgba(238,242,255,0.5)',
              border: '2px dashed #c7d2fe',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#eef2ff';
              (e.currentTarget as HTMLElement).style.borderColor = '#a5b4fc';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(238,242,255,0.5)';
              (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe';
            }}
          >
            <Plus className="w-4 h-4" /> 添加动作
          </button>
        </div>

        {/* Bottom Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 sticky bottom-0 bg-white p-4 -mx-6 -mb-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
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
        </div>
      </form>
      </div>
      </div>

      {/* Right: Version Timeline (only for editing existing rules) */}
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
                      <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' :
                        isCurrentVersion ? 'bg-indigo-600 border-indigo-600' :
                        'bg-white border-slate-300 group-hover:border-indigo-400'
                      }`} />
                      {idx < history.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 min-h-[40px]" />
                      )}
                    </div>
                    {/* Content */}
                    <div className={`pb-5 -mt-0.5 flex-1 min-w-0 rounded-md px-2 py-1 -ml-1 transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">v{version.version}</span>
                        {isCurrentVersion && !selectedVersionId && <span className="bg-green-50 text-green-600 text-[9px] px-1.5 py-0.5 rounded border border-green-200">当前</span>}
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
