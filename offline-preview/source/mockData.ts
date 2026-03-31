

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
  DraftItem
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
    conditionScript: 'return true;', 
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
    conditionScript: 'return "EP00000001".equals(eventPoint);',
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
    conditionScript: 'return true;',
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
  },
  {
    id: 'rt-v3',
    featureId: 101,
    version: 3,
    content: {
      ...mockFeatures[1],
      lifecycleState: FeatureLifecycle.DRAFT,
      description: '用户7天交易时间戳 - 新版草稿',
      calculationConfig: '{"valueJsonPath": "properties.createTime", "ttlSeconds": 1209600}',
      updateAt: '2025-10-24 09:30:00'
    },
    commitMessage: '延长TTL至14天，准备提交测试',
    editor: 'qa_user',
    createAt: '2025-10-24 09:30:00'
  },
  {
    id: 'rt-v2',
    featureId: 101,
    version: 2,
    content: {
      ...mockFeatures[1],
      lifecycleState: FeatureLifecycle.READY_FOR_RELEASE,
      includeCurrentEvent: true,
      updateAt: '2025-10-23 09:00:00'
    },
    commitMessage: '修复includeCurrentEvent配置，准备发布',
    editor: 'dev_user',
    createAt: '2025-10-23 09:00:00'
  },
  {
    id: 'login-v2',
    featureId: 102,
    version: 2,
    content: {
      ...mockFeatures[2],
      lifecycleState: FeatureLifecycle.READY_FOR_RELEASE,
      calculationConfig: '{"method": "COUNT", "timeWindowSeconds": 3600, "dedupKey": "deviceId"}',
      updateAt: '2025-10-29 12:00:00'
    },
    commitMessage: '增加deviceId去重逻辑',
    editor: 'risk_dev',
    createAt: '2025-10-29 12:00:00'
  },
  {
    id: 'login-v1',
    featureId: 102,
    version: 1,
    content: {
      ...mockFeatures[2],
      lifecycleState: FeatureLifecycle.DRAFT,
      includeCurrentEvent: false,
      updateAt: '2025-10-28 18:00:00'
    },
    commitMessage: '初始草稿：仅统计用户维度',
    editor: 'risk_dev',
    createAt: '2025-10-28 18:00:00'
  }
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
