

import {
  PolicyType,
  Status,
  ScopeLevel,
  TargetType,
  NotifyChannel,
  ManualState,
  DegradeAction,
  MetricType,
  BaselineType,
  Comparator,
  GuardrailAction,
  AnyPolicy,
  OverrideConfig,
  Feature,
  FeatureStatus,
  FeatureLifecycle,
  FeatureType,
  WriteSource,
  FeatureValueType,
  ReleaseOrder,
  ReleaseType,
  ReleaseStatus,
  FeatureVersion,
  DraftItem,
  EventPoint,
  Activation,
  Rule,
  RuleOperator,
  Action,
  ActionType,
  ExecutionMode,
  EventPointVersion,
  ActivationVersion,
  RuleVersion,
  ActionVersion
} from './types';

// ... Existing policies and overrides ...
export const mockPolicies: AnyPolicy[] = [
  {
    policyId: 'CB-2025-001',
    name: 'feature_cb_transaction_history',
    type: PolicyType.CIRCUIT_BREAKER,
    status: Status.PUBLISHED,
    scope: {
      level: ScopeLevel.FEATURE_SERVICE,
      targetType: TargetType.FEATURE_SERVICE,
      targetKey: 'user_transaction_history' 
    },
    notifyChannels: [NotifyChannel.DINGTALK],
    remark: '交易历史特征获取超时熔断，降级为默认值',
    thresholds: { failureRate: 40, slowCallRate: 50 },
    slowCallDurationMs: 500,
    minimumNumberOfCalls: 100,
    slidingWindowSize: 60,
    waitDurationInOpenState: 30,
    autoRecover: true,
    manualState: ManualState.FOLLOW_AUTO,
    degradeAction: DegradeAction.DEFAULT_VALUE,
    updatedAt: '2025-05-10 14:30:00',
    operator: 'admin'
  },
  {
    policyId: 'GR-2025-033',
    name: 'guard_ep01_pass_rate',
    type: PolicyType.GUARDRAIL,
    status: Status.PENDING_APPROVAL,
    scope: {
      level: ScopeLevel.EVENT_POINT,
      eventPoint: 'EP00000001' 
    },
    notifyChannels: [NotifyChannel.EMAIL, NotifyChannel.DINGTALK],
    remark: '交易模型通过率突降熔断',
    metricType: MetricType.PASS_RATE,
    dimension: ScopeLevel.EVENT_POINT,
    windowSeconds: 120,
    baseline: BaselineType.BASELINE_ROLLING,
    comparator: Comparator.DROP_PERCENT,
    threshold: 60, // 下跌 60%
    minSamples: 1000,
    coolDownSeconds: 600,
    actions: [GuardrailAction.SWITCH_FALLBACK_SET, GuardrailAction.REQUIRE_REVIEW],
    actionParams: { fallbackSetKey: 'conservative_fallback_v1' },
    updatedAt: '2025-05-14 11:20:00',
    operator: 'risk_analyst'
  }
];

export const mockOverrides: OverrideConfig[] = [
  {
    id: 'OVR-001',
    scope: { level: ScopeLevel.ACTIVATION, activationName: 'warmUp' }, 
    manualState: ManualState.MANUAL_OPEN, 
    ttlSeconds: 600,
    operator: 'sre_oncall',
    remark: 'warmUp 预热策略异常，紧急阻断所有请求',
    createdAt: '2025-05-14 15:00:00'
  }
];

// Existing features with Lifecycle State
export const mockFeatures: Feature[] = [
  {
    id: 1,
    name: 'user_transaction_history',
    description: '用户交易记录历史存储（基于交易ID）',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    type: FeatureType.HISTORY_STORAGE,
    writeSource: WriteSource.REALTIME,
    valueType: FeatureValueType.LIST,
    eventPoints: ['EP00000001'],
    dependentFeatures: [],
    conditionExpression: { logic: 'AND', groups: [] },
    compositeKeyJsonPaths: '[{"key":"properties.fromUserId","defaultValue":"unknown"}]',
    calculationConfig: '{"valueJsonPath":"properties.transactionId","ttlSeconds":7200}',
    includeCurrentEvent: true,
    updateAt: '2025-10-20 10:00:00',
    operator: 'admin'
  },
  {
    id: 101,
    name: 'user_recent_trade_time_7d_rt',
    description: '用户7天内最近一次交易时间戳（实时）',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.READY_FOR_RELEASE,
    type: FeatureType.DIRECT_STORAGE,
    writeSource: WriteSource.REALTIME,
    valueType: FeatureValueType.STRING,
    eventPoints: ['EP00000001'],
    dependentFeatures: [],
    conditionExpression: {
      logic: 'AND',
      groups: [
        {
          logic: 'AND',
          conditions: [
            { field: 'eventPoint', operator: 'EQ' as any, value: 'EP00000001' }
          ]
        }
      ]
    },
    compositeKeyJsonPaths: '[{"key": "properties.fromUserId", "defaultValue": "0"}]',
    calculationConfig: '{"valueJsonPath": "properties.createTime", "ttlSeconds": 604800}',
    includeCurrentEvent: false,
    updateAt: '2025-10-23 09:00:00',
    operator: 'dev_user'
  },
  {
    id: 102,
    name: 'user_login_count_1h',
    description: '用户近1小时登录次数',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.DRAFT,
    type: FeatureType.AGGREGATION,
    writeSource: WriteSource.REALTIME,
    valueType: FeatureValueType.INTEGER,
    eventPoints: ['EP00000002'],
    dependentFeatures: [],
    conditionExpression: { logic: 'AND', groups: [] },
    compositeKeyJsonPaths: '[{"key": "properties.userId", "defaultValue": "guest"}]',
    calculationConfig: '{"method": "COUNT", "timeWindowSeconds": 3600}',
    includeCurrentEvent: true,
    updateAt: '2025-10-29 11:30:00',
    operator: 'dev_user'
  }
];

// --- NEW MOCK DATA ---

// 模拟草稿池（待发布清单）
export const mockDrafts: DraftItem[] = [
  {
    id: 'DFT-001',
    type: ReleaseType.FEATURE,
    targetId: '101',
    targetName: 'user_recent_trade_time_7d_rt',
    version: 'v4', 
    relatedKeys: 'EP00000001', 
    changeSummary: '修改了TTL时间为14天',
    updatedAt: '2025-10-28 15:30:00',
    editor: 'dev_user'
  },
  {
    id: 'DFT-002',
    type: ReleaseType.POLICY,
    targetId: 'CB-2025-001',
    targetName: 'feature_cb_transaction_history',
    version: 'v2', 
    relatedKeys: 'user_transaction_history', 
    changeSummary: '放宽了熔断阈值，从40%调整为60%',
    updatedAt: '2025-10-28 16:00:00',
    editor: 'admin'
  }
];

export const mockReleaseOrders: ReleaseOrder[] = [
  // 1. 待审核 (Pending Audit) - 测试审核功能
  {
    id: 'REL-20251101-002',
    title: '双11大促策略集调整 - 第一波',
    items: [
      {
        type: ReleaseType.POLICY,
        targetId: 'GR-2025-033',
        targetName: 'guard_ep01_pass_rate',
        relatedKeys: 'EP00000001',
        changeSummary: '收紧护栏阈值，从下跌60%改为下跌40%，提高敏感度。'
      },
      {
        type: ReleaseType.FEATURE,
        targetId: '102',
        targetName: 'user_login_count_1h',
        relatedKeys: 'EP00000002',
        changeSummary: '新增登录聚合特征，用于防暴力破解。'
      }
    ],
    status: ReleaseStatus.PENDING,
    applicant: 'risk_ops',
    applyTime: '2025-11-01 09:15:00',
    description: '针对双11大促流量高峰的防御策略调整，包含一条护栏策略收紧和一个新特征上线。'
  },
  
  // 2. 已审核 (Approved) - 测试发布功能
  {
    id: 'REL-20251101-003',
    title: '修复交易金额解析异常',
    items: [
      {
        type: ReleaseType.FEATURE,
        targetId: '1',
        targetName: 'user_transaction_history',
        relatedKeys: 'EP00000001',
        changeSummary: 'Hotfix: 修复 JsonPath 路径错误导致的金额为空问题。'
      }
    ],
    status: ReleaseStatus.APPROVED, // Wait for Publish
    applicant: 'dev_user',
    approver: 'admin_lead',
    applyTime: '2025-11-01 10:30:00',
    description: '紧急修复线上 Bug，已在 Staging 环境验证通过。'
  },

  // 3. 已发布 (Published) - 测试历史查看
  {
    id: 'REL-20251028-001',
    title: '用户交易特征与规则联合发布',
    items: [
      {
        type: ReleaseType.FEATURE,
        targetId: 'user_transaction_history',
        targetName: '用户交易记录历史存储',
        relatedKeys: 'EP00000001',
        changeSummary: '优化了交易ID的提取逻辑，修复空指针问题。'
      }
    ],
    status: ReleaseStatus.PUBLISHED,
    applicant: 'dev_user',
    approver: 'admin',
    applyTime: '2025-10-28 10:00:00',
    finishTime: '2025-10-28 10:30:00',
    description: '本次发布包含特征修复及相关联的规则更新，旨在解决线上NPE问题并加强大额风控。'
  },

  // 4. 已驳回 (Rejected)
  {
    id: 'REL-20251030-999',
    title: '测试用的废弃策略',
    items: [
      {
        type: ReleaseType.POLICY,
        targetId: 'CB-FAKE-001',
        targetName: 'test_circuit_breaker',
        changeSummary: '测试熔断配置'
      }
    ],
    status: ReleaseStatus.REJECTED,
    applicant: 'intern_user',
    approver: 'admin',
    applyTime: '2025-10-30 14:00:00',
    finishTime: '2025-10-30 14:05:00',
    description: '测试单，请忽略。'
  }
];

export const mockFeatureVersions: FeatureVersion[] = [
  {
    id: 'v3',
    featureId: 1,
    version: 3,
    content: {
      ...mockFeatures[0],
      lifecycleState: FeatureLifecycle.DRAFT,
      description: '用户交易记录历史存储 (V3 Draft)',
      updateAt: '2025-10-25 15:30:00'
    },
    commitMessage: 'V3草稿：尝试新的压缩算法',
    editor: 'dev_user_new',
    createAt: '2025-10-25 15:30:00'
  },
  {
    id: 'v2',
    featureId: 1,
    version: 2,
    content: mockFeatures[0],
    commitMessage: '优化计算配置，增加TTL时间',
    editor: 'admin',
    createAt: '2025-10-20 10:00:00'
  },
  {
    id: 'v1',
    featureId: 1,
    version: 1,
    content: {
      ...mockFeatures[0],
      lifecycleState: FeatureLifecycle.ARCHIVED_HISTORY, // Should be archived
      calculationConfig: '{"valueJsonPath":"properties.transactionId","ttlSeconds":3600}' // Old config
    },
    commitMessage: '初始化特征创建',
    editor: 'admin',
    createAt: '2025-10-18 10:00:00'
  }
];

// -------- Event Points --------
export const mockEventPoints: EventPoint[] = [
  {
    id: 1,
    eventPoint: 'EP00000001',
    description: '用户交易事件接入点',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-01-15 10:30:00',
    updateAt: '2025-03-28 14:30:00',
    operator: '张三'
  },
  {
    id: 2,
    eventPoint: 'EP00000002',
    description: '用户登录事件接入点',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-01-20 09:00:00',
    updateAt: '2025-03-27 10:15:00',
    operator: '李四'
  },
  {
    id: 3,
    eventPoint: 'EP00000003',
    description: '提现申请事件接入点',
    status: FeatureStatus.DISABLED,
    lifecycleState: FeatureLifecycle.DRAFT,
    createAt: '2025-03-01 11:00:00',
    updateAt: '2025-03-29 09:00:00',
    operator: '王五'
  },
  {
    id: 4,
    eventPoint: 'EP00000000',
    description: 'warmUp 预热接入点',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-01-10 08:00:00',
    updateAt: '2025-02-15 16:00:00',
    operator: 'admin'
  }
];

// -------- Activations (策略) --------
export const mockActivations: Activation[] = [
  {
    id: 1,
    name: 'activation_txn_risk_45min',
    description: '45分钟内交易风险评估',
    eventPoint: 'EP00000001',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 1,
    thresholds: [
      { name: 'pass', score: 30 },
      { name: 'review', score: 70 },
      { name: 'reject', score: null }
    ],
    createAt: '2025-02-10 11:00:00',
    updateAt: '2025-03-28 14:30:00',
    operator: '张三'
  },
  {
    id: 2,
    name: 'activation_txn_amount_check',
    description: '交易金额异常检测',
    eventPoint: 'EP00000001',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 2,
    thresholds: [
      { name: 'pass', score: 50 },
      { name: 'review', score: 80 },
      { name: 'reject', score: null }
    ],
    createAt: '2025-02-15 14:00:00',
    updateAt: '2025-03-27 16:45:00',
    operator: '李四'
  },
  {
    id: 3,
    name: 'activation_login_risk',
    description: '登录行为风险评估',
    eventPoint: 'EP00000002',
    status: FeatureStatus.DISABLED,
    lifecycleState: FeatureLifecycle.DRAFT,
    priority: 1,
    thresholds: [
      { name: 'low', score: 20 },
      { name: 'medium', score: 60 },
      { name: 'high', score: null }
    ],
    createAt: '2025-03-10 09:00:00',
    updateAt: '2025-03-29 11:20:00',
    operator: '王五'
  },
  {
    id: 4,
    name: 'activation_device_fingerprint',
    description: '设备指纹风险策略',
    eventPoint: 'EP00000001',
    status: FeatureStatus.DISABLED,
    lifecycleState: FeatureLifecycle.READY_FOR_RELEASE,
    priority: 3,
    thresholds: [
      { name: 'safe', score: 25 },
      { name: 'suspicious', score: 60 },
      { name: 'blocked', score: null }
    ],
    createAt: '2025-03-05 10:00:00',
    updateAt: '2025-03-25 15:30:00',
    operator: '张三'
  }
];

// -------- Actions (动作模板) --------
export const mockActions: Action[] = [
  {
    id: 1,
    name: 'action_tag_risk',
    type: ActionType.TAG,
    description: '风险标签打标动作',
    configSchema: '{"type":"object","properties":{"tag":{"type":"string","description":"标签名"},"value":{"type":"boolean","description":"标签值"}}}',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-01-20 10:00:00',
    updateAt: '2025-03-20 09:00:00',
    operator: '张三'
  },
  {
    id: 2,
    name: 'action_webhook_alert',
    type: ActionType.WEBHOOK,
    description: '告警 Webhook 回调',
    configSchema: '{"type":"object","properties":{"url":{"type":"string","description":"回调地址"},"method":{"type":"string","enum":["POST","PUT"],"description":"请求方法"},"headers":{"type":"object","description":"自定义请求头"}}}',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-01-25 14:00:00',
    updateAt: '2025-03-22 11:30:00',
    operator: '李四'
  },
  {
    id: 3,
    name: 'action_notify_dingtalk',
    type: ActionType.NOTIFY,
    description: '钉钉群通知',
    configSchema: '{"type":"object","properties":{"webhook":{"type":"string","description":"钉钉机器人地址"},"template":{"type":"string","description":"消息模板"}}}',
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    createAt: '2025-02-01 09:00:00',
    updateAt: '2025-03-18 16:00:00',
    operator: '张三'
  },
  {
    id: 4,
    name: 'action_feature_backflow',
    type: ActionType.FEATURE_MUTATION,
    description: '特征回写动作',
    configSchema: '{"type":"object","properties":{"featureName":{"type":"string","description":"目标特征名"},"valueExpression":{"type":"string","description":"取值表达式"}}}',
    status: FeatureStatus.DISABLED,
    lifecycleState: FeatureLifecycle.DRAFT,
    createAt: '2025-03-10 10:00:00',
    updateAt: '2025-03-28 14:00:00',
    operator: '王五'
  }
];

// -------- Rules (规则) --------
export const mockRules: Rule[] = [
  {
    id: 1,
    name: 'rule_high_amount',
    description: '大额交易检测',
    activationName: 'activation_txn_risk_45min',
    eventPoint: 'EP00000001',
    conditionExpression: {
      logic: 'AND',
      groups: [{
        logic: 'AND',
        conditions: [
          { field: 'properties.amount', operator: 'GTE' as any, value: '10000' },
          { field: 'properties.currency', operator: 'EQ' as any, value: 'USDT' },
          { field: 'features.user_txn_count_24h', operator: 'GT' as any, value: '5' }
        ]
      }]
    },
    initScore: 20,
    baseNum: 10,
    operator: RuleOperator.ADD,
    valueField: 'amount',
    max: 50,
    rate: 1.5,
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 1,
    actions: [
      { actionName: 'action_tag_risk', actionType: ActionType.TAG, executionMode: ExecutionMode.SYNC, actionConfig: '{"tag":"high_amount","value":true}', priority: 1 },
      { actionName: 'action_webhook_alert', actionType: ActionType.WEBHOOK, executionMode: ExecutionMode.ASYNC, actionConfig: '{"url":"https://alert.example.com/hook"}', priority: 2 }
    ],
    createAt: '2025-02-20 16:00:00',
    updateAt: '2025-03-28 14:30:00',
    editOperator: '张三'
  },
  {
    id: 2,
    name: 'rule_freq_check',
    description: '高频交易检测',
    activationName: 'activation_txn_risk_45min',
    eventPoint: 'EP00000001',
    conditionExpression: {
      logic: 'AND',
      groups: [{
        logic: 'AND',
        conditions: [
          { field: 'features.user_txn_count_24h', operator: 'GTE' as any, value: '20' }
        ]
      }]
    },
    initScore: 15,
    baseNum: 5,
    operator: RuleOperator.MUL,
    valueField: 'features.user_txn_count_24h',
    max: 45,
    rate: 1.0,
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 2,
    actions: [
      { actionName: 'action_tag_risk', actionType: ActionType.TAG, executionMode: ExecutionMode.SYNC, actionConfig: '{"tag":"high_freq","value":true}', priority: 1 }
    ],
    createAt: '2025-02-22 10:00:00',
    updateAt: '2025-03-27 16:45:00',
    editOperator: '李四'
  },
  {
    id: 3,
    name: 'rule_model_evaluation',
    description: '模型评分规则',
    activationName: 'activation_txn_risk_45min',
    eventPoint: 'EP00000001',
    conditionExpression: { logic: 'AND', groups: [] },
    initScore: 0,
    baseNum: 0,
    operator: RuleOperator.NONE,
    valueField: 'features.model_score',
    max: null,
    rate: 1.0,
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 3,
    actions: [
      { actionName: 'action_notify_dingtalk', actionType: ActionType.NOTIFY, executionMode: ExecutionMode.ASYNC, actionConfig: '{"webhook":"https://oapi.dingtalk.com/robot/send?access_token=xxx","template":"模型预警: ${ruleName}"}', priority: 1 }
    ],
    createAt: '2025-03-01 11:00:00',
    updateAt: '2025-03-25 09:00:00',
    editOperator: '张三'
  },
  {
    id: 4,
    name: 'rule_new_device_login',
    description: '新设备登录检测',
    activationName: 'activation_login_risk',
    eventPoint: 'EP00000002',
    conditionExpression: {
      logic: 'AND',
      groups: [{
        logic: 'AND',
        conditions: [
          { field: 'properties.isNewDevice', operator: 'EQ' as any, value: 'true' },
          { field: 'properties.loginType', operator: 'NEQ' as any, value: 'BIOMETRIC' }
        ]
      }]
    },
    initScore: 30,
    baseNum: 0,
    operator: RuleOperator.NONE,
    valueField: '',
    max: null,
    rate: 1.0,
    status: FeatureStatus.DISABLED,
    lifecycleState: FeatureLifecycle.DRAFT,
    priority: 1,
    actions: [
      { actionName: 'action_notify_dingtalk', actionType: ActionType.NOTIFY, executionMode: ExecutionMode.ASYNC, actionConfig: '{"webhook":"https://oapi.dingtalk.com/robot/send?access_token=xxx","template":"新设备登录: ${userId}"}', priority: 1 }
    ],
    createAt: '2025-03-15 14:00:00',
    updateAt: '2025-03-29 11:20:00',
    editOperator: '王五'
  },
  {
    id: 5,
    name: 'rule_amount_threshold',
    description: '交易金额阈值规则',
    activationName: 'activation_txn_amount_check',
    eventPoint: 'EP00000001',
    conditionExpression: {
      logic: 'OR',
      groups: [{
        logic: 'AND',
        conditions: [
          { field: 'properties.amount', operator: 'GTE' as any, value: '50000' }
        ]
      }, {
        logic: 'AND',
        conditions: [
          { field: 'properties.amount', operator: 'GTE' as any, value: '10000' },
          { field: 'properties.toAddress', operator: 'IN' as any, value: 'blacklist_addresses' }
        ]
      }]
    },
    initScore: 40,
    baseNum: 0,
    operator: RuleOperator.ADD,
    valueField: '',
    max: 80,
    rate: 1.0,
    status: FeatureStatus.ENABLED,
    lifecycleState: FeatureLifecycle.PUBLISHED,
    priority: 1,
    actions: [
      { actionName: 'action_tag_risk', actionType: ActionType.TAG, executionMode: ExecutionMode.SYNC, actionConfig: '{"tag":"amount_threshold","value":true}', priority: 1 },
      { actionName: 'action_webhook_alert', actionType: ActionType.WEBHOOK, executionMode: ExecutionMode.ASYNC, actionConfig: '{"url":"https://alert.example.com/large-txn"}', priority: 2 },
      { actionName: 'action_notify_dingtalk', actionType: ActionType.NOTIFY, executionMode: ExecutionMode.ASYNC, actionConfig: '{"webhook":"https://oapi.dingtalk.com/robot/send?access_token=xxx","template":"大额交易告警"}', priority: 3 }
    ],
    createAt: '2025-02-25 10:00:00',
    updateAt: '2025-03-26 14:00:00',
    editOperator: '李四'
  }
];

// -------- Version History Mock Data --------

export const mockEventPointVersions: EventPointVersion[] = [
  {
    id: 'ep-v3', eventPointId: 1, version: 3,
    content: { ...mockEventPoints[0] },
    commitMessage: '更新描述信息', editor: '张三', createAt: '2025-03-28 14:30:00'
  },
  {
    id: 'ep-v2', eventPointId: 1, version: 2,
    content: { ...mockEventPoints[0], description: '用户交易事件接入点（旧版）', lifecycleState: FeatureLifecycle.PUBLISHED, updateAt: '2025-02-15 10:00:00' },
    commitMessage: '启用接入点', editor: 'admin', createAt: '2025-02-15 10:00:00'
  },
  {
    id: 'ep-v1', eventPointId: 1, version: 1,
    content: { ...mockEventPoints[0], description: '交易事件接入点（初始版）', status: FeatureStatus.DISABLED, lifecycleState: FeatureLifecycle.ARCHIVED_HISTORY, updateAt: '2025-01-15 10:30:00' },
    commitMessage: '初始创建', editor: '张三', createAt: '2025-01-15 10:30:00'
  },
];

export const mockActivationVersions: ActivationVersion[] = [
  {
    id: 'act-v4', activationId: 1, version: 4,
    content: { ...mockActivations[0] },
    commitMessage: '调整 review 阈值为 30', editor: '张三', createAt: '2025-03-28 14:30:00'
  },
  {
    id: 'act-v3', activationId: 1, version: 3,
    content: { ...mockActivations[0], thresholds: [{ name: 'pass', score: 40 }, { name: 'review', score: 70 }, { name: 'reject', score: null }], lifecycleState: FeatureLifecycle.PUBLISHED, updateAt: '2025-03-20 09:15:00' },
    commitMessage: '新增 rule_model_evaluation', editor: '李四', createAt: '2025-03-20 09:15:00'
  },
  {
    id: 'act-v1', activationId: 1, version: 1,
    content: { ...mockActivations[0], thresholds: [{ name: 'pass', score: 50 }, { name: 'reject', score: null }], description: '交易风险评估（初始版）', lifecycleState: FeatureLifecycle.ARCHIVED_HISTORY, updateAt: '2025-02-10 11:00:00' },
    commitMessage: '初始创建', editor: '张三', createAt: '2025-02-10 11:00:00'
  },
];

export const mockRuleVersions: RuleVersion[] = [
  {
    id: 'rule-v3', ruleId: 1, version: 3,
    content: { ...mockRules[0] },
    commitMessage: '新增 WEBHOOK 动作', editor: '张三', createAt: '2025-03-28 14:30:00'
  },
  {
    id: 'rule-v2', ruleId: 1, version: 2,
    content: { ...mockRules[0], actions: [mockRules[0].actions[0]], description: '大额交易检测（v2）', lifecycleState: FeatureLifecycle.PUBLISHED, updateAt: '2025-03-15 09:20:00' },
    commitMessage: '调整阈值为 10000', editor: '李四', createAt: '2025-03-15 09:20:00'
  },
  {
    id: 'rule-v1', ruleId: 1, version: 1,
    content: { ...mockRules[0], initScore: 10, max: 30, description: '大额交易检测（初始版）', lifecycleState: FeatureLifecycle.ARCHIVED_HISTORY, updateAt: '2025-02-20 16:00:00' },
    commitMessage: '初始创建', editor: '张三', createAt: '2025-02-20 16:00:00'
  },
];

export const mockActionVersions: ActionVersion[] = [
  {
    id: 'action-v2', actionId: 1, version: 2,
    content: { ...mockActions[0] },
    commitMessage: '更新 configSchema 格式', editor: '张三', createAt: '2025-03-20 09:00:00'
  },
  {
    id: 'action-v1', actionId: 1, version: 1,
    content: { ...mockActions[0], description: '风险标签打标动作（初始版）', lifecycleState: FeatureLifecycle.ARCHIVED_HISTORY, updateAt: '2025-01-20 10:00:00' },
    commitMessage: '初始创建', editor: '张三', createAt: '2025-01-20 10:00:00'
  },
];

// 辅助数据
export const suggestionData = {
  eventPoints: [
    { id: 'EP00000000', desc: 'warmUp预热接入点' },
    { id: 'EP00000001', desc: '交易模型风控分析' },
    { id: 'EP00000002', desc: '登录模型接入点' },
    { id: 'EP00000003', desc: '注册风控接入点' }
  ],
  features: [
    'user_transaction_history',
    'user_amount_history',
    'win_txn_count',
    'win_amount_sum',
  ],
  activations: ['warmUp', 'transaction_strategy_v1'],
  rules: ['warmUpRule01', 'amountRule05'],
  interfaces: ['enrichFeatures', 'executeRules']
};
