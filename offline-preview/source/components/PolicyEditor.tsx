import React, { useState, useEffect } from 'react';
import { 
  PolicyType, ScopeLevel, TargetType, NotifyChannel, ManualState, 
  DegradeAction, MetricType, BaselineType, Comparator, GuardrailAction,
  AnyPolicy, CircuitBreakerPolicy, GuardrailPolicy, Status, t 
} from '../types';
import { Save, X } from 'lucide-react';
import { suggestionData } from '../mockData';

interface PolicyEditorProps {
  initialPolicy?: AnyPolicy | null;
  onSave: (policy: AnyPolicy) => void;
  onCancel: () => void;
  defaultType: PolicyType;
}

const emptyCB: CircuitBreakerPolicy = {
  policyId: '',
  name: '',
  type: PolicyType.CIRCUIT_BREAKER,
  status: Status.DRAFT,
  scope: { level: ScopeLevel.GLOBAL },
  notifyChannels: [],
  remark: '',
  thresholds: { failureRate: 50, slowCallRate: 50 },
  slowCallDurationMs: 500,
  minimumNumberOfCalls: 20,
  slidingWindowSize: 60,
  waitDurationInOpenState: 60,
  autoRecover: true,
  manualState: ManualState.FOLLOW_AUTO,
  degradeAction: DegradeAction.PASS,
  updatedAt: new Date().toISOString(),
  operator: 'current_user'
};

const emptyGR: GuardrailPolicy = {
  policyId: '',
  name: '',
  type: PolicyType.GUARDRAIL,
  status: Status.DRAFT,
  scope: { level: ScopeLevel.GLOBAL },
  notifyChannels: [],
  remark: '',
  metricType: MetricType.PASS_RATE,
  dimension: ScopeLevel.GLOBAL,
  windowSeconds: 60,
  baseline: BaselineType.BASELINE_ROLLING,
  comparator: Comparator.DROP_PERCENT,
  threshold: 10,
  minSamples: 100,
  coolDownSeconds: 300,
  actions: [],
  updatedAt: new Date().toISOString(),
  operator: 'current_user'
};

export const PolicyEditor: React.FC<PolicyEditorProps> = ({ initialPolicy, onSave, onCancel, defaultType }) => {
  const [policy, setPolicy] = useState<AnyPolicy>(
    initialPolicy || (defaultType === PolicyType.CIRCUIT_BREAKER ? { ...emptyCB } : { ...emptyGR })
  );

  useEffect(() => {
    if (initialPolicy) {
      setPolicy(initialPolicy);
    }
  }, [initialPolicy]);

  // 根据 Scope Level 获取可用的 Metric Type
  const getAvailableMetrics = (level: ScopeLevel): MetricType[] => {
    switch (level) {
      case ScopeLevel.RULE:
        return [MetricType.RULE_HIT_RATE, MetricType.SCORE_AVG, MetricType.SCORE_SPIKE];
      case ScopeLevel.ACTIVATION:
        return [MetricType.PASS_RATE, MetricType.REJECT_RATE, MetricType.SCORE_AVG];
      case ScopeLevel.GLOBAL:
      case ScopeLevel.EVENT_POINT:
      case ScopeLevel.INTERFACE:
        // Global/Event/Interface 通常关注吞吐量、耗时和通过率
        return [MetricType.PASS_RATE, MetricType.REJECT_RATE, MetricType.QPS, MetricType.LATENCY];
      default:
        // 其他情况（如 Feature/Model）暂返回通用集合
        return Object.values(MetricType);
    }
  };

  const handleChange = (field: string, value: any) => {
    setPolicy(prev => ({ ...prev, [field]: value }));
  };

  const handleScopeChange = (field: string, value: any) => {
    setPolicy(prev => {
      const updatedPolicy = { ...prev, scope: { ...prev.scope, [field]: value } };
      
      // 如果改变的是层级，重置部分字段并检查 MetricType 是否合法
      if (field === 'level' && updatedPolicy.type === PolicyType.GUARDRAIL) {
        const availableMetrics = getAvailableMetrics(value as ScopeLevel);
        const currentMetric = (updatedPolicy as GuardrailPolicy).metricType;
        
        // 如果当前指标不在新层级的可用列表中，默认选中第一个
        if (!availableMetrics.includes(currentMetric)) {
          (updatedPolicy as GuardrailPolicy).metricType = availableMetrics[0];
          // 触发指标变更的联动逻辑（如 Comparator）
          handleMetricLogic(updatedPolicy as GuardrailPolicy, availableMetrics[0]);
        }
      }
      return updatedPolicy;
    });
  };

  // 辅助函数：处理指标变更时的联动效果
  const handleMetricLogic = (p: GuardrailPolicy, metric: MetricType) => {
    if (metric === MetricType.REJECT_RATE) {
      p.comparator = Comparator.RISE_PERCENT; // 拒绝率通常监控上涨
    } else if (metric === MetricType.PASS_RATE) {
      p.comparator = Comparator.DROP_PERCENT; // 通过率通常监控下跌
    } else if (metric === MetricType.QPS || metric === MetricType.LATENCY) {
      p.comparator = Comparator.GT; // QPS/Latency 通常监控大于阈值
    }
  };

  const handleMetricChange = (value: string) => {
    const metric = value as MetricType;
    setPolicy(prev => {
      const newPolicy = { ...prev } as GuardrailPolicy;
      newPolicy.metricType = metric;
      handleMetricLogic(newPolicy, metric);
      return newPolicy;
    });
  };

  const handleThresholdChange = (field: string, value: any) => {
    if (policy.type === PolicyType.CIRCUIT_BREAKER) {
      setPolicy(prev => ({
        ...prev,
        thresholds: { ...(prev as CircuitBreakerPolicy).thresholds, [field]: Number(value) }
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...policy, 
      policyId: policy.policyId || `POL-${Date.now()}`,
      updatedAt: new Date().toISOString()
    });
  };

  const isCB = policy.type === PolicyType.CIRCUIT_BREAKER;
  const availableMetrics = !isCB ? getAvailableMetrics(policy.scope.level) : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          {initialPolicy ? '编辑策略' : `新建 ${isCB ? '服务熔断' : '业务护栏'} 策略`}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: 基础信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">策略名称 (英文唯一)</label>
            <input 
              type="text" 
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={policy.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="例如：cb_feature_credit_api"
            />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={policy.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              {Object.values(Status).map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
        </div>

        {/* Section 2: 生效范围 */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">生效范围 & 保护对象</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">层级 (Level)</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={policy.scope.level}
                onChange={(e) => handleScopeChange('level', e.target.value)}
              >
                {Object.values(ScopeLevel).map(l => <option key={l} value={l}>{t(l)}</option>)}
              </select>
            </div>
            
            {/* 动态字段：基于层级显示 */}
            {policy.scope.level === ScopeLevel.EVENT_POINT && (
               <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">事件接入点 (EventPoint)</label>
               <input 
                 list="event-points"
                 type="text" 
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                 value={policy.scope.eventPoint || ''}
                 onChange={(e) => handleScopeChange('eventPoint', e.target.value)}
                 placeholder="输入或选择 EP 编号"
               />
               <datalist id="event-points">
                 {suggestionData.eventPoints.map(ep => <option key={ep.id} value={ep.id}>{ep.desc}</option>)}
               </datalist>
             </div>
            )}
            {policy.scope.level === ScopeLevel.ACTIVATION && (
               <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">策略集名称 (Activation)</label>
               <input 
                 list="activations"
                 type="text" 
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                 value={policy.scope.activationName || ''}
                 onChange={(e) => handleScopeChange('activationName', e.target.value)}
                 placeholder="例如：warmUp"
               />
               <datalist id="activations">
                 {suggestionData.activations.map(act => <option key={act} value={act} />)}
               </datalist>
             </div>
            )}
             {policy.scope.level === ScopeLevel.RULE && (
               <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">规则名称 (Rule)</label>
               <input 
                 list="rules"
                 type="text" 
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                 value={policy.scope.ruleName || ''}
                 onChange={(e) => handleScopeChange('ruleName', e.target.value)}
                 placeholder="例如：warmUpRule01"
               />
               <datalist id="rules">
                 {suggestionData.rules.map(r => <option key={r} value={r} />)}
               </datalist>
             </div>
            )}
            {policy.scope.level === ScopeLevel.INTERFACE && (
               <div>
               <label className="block text-xs font-medium text-slate-500 mb-1">接口/阶段名称 (Interface)</label>
               <input 
                 list="interfaces"
                 type="text" 
                 className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                 value={policy.scope.interfaceName || ''}
                 onChange={(e) => handleScopeChange('interfaceName', e.target.value)}
                 placeholder="例如：enrichFeatures"
               />
               <datalist id="interfaces">
                 {suggestionData.interfaces.map(i => <option key={i} value={i} />)}
               </datalist>
             </div>
            )}

            {/* 针对服务熔断的目标对象 */}
            {isCB && (
               <>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">目标类型 (Target Type)</label>
                  <select
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={policy.scope.targetType || TargetType.FEATURE_SERVICE}
                    onChange={(e) => handleScopeChange('targetType', e.target.value)}
                  >
                    {Object.values(TargetType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">目标标识 (Target Key)</label>
                  <input 
                    list="features"
                    type="text" 
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={policy.scope.targetKey || ''}
                    onChange={(e) => handleScopeChange('targetKey', e.target.value)}
                    placeholder="特征名或API地址"
                  />
                  <datalist id="features">
                     {suggestionData.features.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>
               </>
            )}
          </div>
        </div>

        {/* Section 3: 规则配置 (根据类型区分) */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">规则配置</h3>
          
          {isCB ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">失败率阈值 (%)</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).thresholds.failureRate}
                  onChange={(e) => handleThresholdChange('failureRate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">慢调用率阈值 (%)</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).thresholds.slowCallRate}
                  onChange={(e) => handleThresholdChange('slowCallRate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">慢调用判定时间 (ms)</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).slowCallDurationMs}
                  onChange={(e) => handleChange('slowCallDurationMs', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">统计窗口 (秒)</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).slidingWindowSize}
                  onChange={(e) => handleChange('slidingWindowSize', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">最小请求数</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).minimumNumberOfCalls}
                  onChange={(e) => handleChange('minimumNumberOfCalls', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">降级动作</label>
                <select
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as CircuitBreakerPolicy).degradeAction}
                  onChange={(e) => handleChange('degradeAction', e.target.value)}
                >
                  {Object.values(DegradeAction).map(a => <option key={a} value={a}>{t(a)}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">监控指标 (Metric)</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as GuardrailPolicy).metricType}
                  onChange={(e) => handleMetricChange(e.target.value)}
                >
                  {availableMetrics.map(v => <option key={v} value={v}>{t(v)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">比较方式</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as GuardrailPolicy).comparator}
                  onChange={(e) => handleChange('comparator', e.target.value)}
                >
                  {Object.values(Comparator).map(v => <option key={v} value={v}>{t(v)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">阈值</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as GuardrailPolicy).threshold}
                  onChange={(e) => handleChange('threshold', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">观察窗口 (秒)</label>
                <input type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={(policy as GuardrailPolicy).windowSeconds}
                  onChange={(e) => handleChange('windowSeconds', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">触发动作</label>
                <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                   onChange={(e) => handleChange('actions', [e.target.value])}
                   value={(policy as GuardrailPolicy).actions[0] || ''}
                >
                  <option value="">请选择动作...</option>
                   {Object.values(GuardrailAction).map(v => <option key={v} value={v}>{t(v)}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: 通知与备注 */}
        <div className="border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">通知渠道</label>
              <div className="flex gap-4">
                {Object.values(NotifyChannel).map(channel => (
                  <label key={channel} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                      checked={policy.notifyChannels.includes(channel)}
                      onChange={(e) => {
                        const newChannels = e.target.checked 
                          ? [...policy.notifyChannels, channel]
                          : policy.notifyChannels.filter(c => c !== channel);
                        handleChange('notifyChannels', newChannels);
                      }}
                    />
                    <span className="text-sm text-slate-700">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">备注说明</label>
              <textarea 
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                rows={3}
                value={policy.remark}
                onChange={(e) => handleChange('remark', e.target.value)}
                placeholder="请说明该熔断/护栏策略的业务背景..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
           <button 
             type="button" 
             onClick={onCancel}
             className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
           >
             取消
           </button>
           <button 
             type="submit" 
             className="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
           >
             <Save className="w-4 h-4 mr-2" />
             保存策略
           </button>
        </div>
      </form>
    </div>
  );
};