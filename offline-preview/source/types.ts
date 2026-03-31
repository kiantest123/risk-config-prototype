
export enum PolicyType {
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  GUARDRAIL = 'GUARDRAIL',
  OVERRIDE = 'OVERRIDE'
}

export enum Status {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  PUBLISHED = 'PUBLISHED',
  OFFLINE = 'OFFLINE'
}

export enum ScopeLevel {
  GLOBAL = 'GLOBAL',
  EVENT_POINT = 'EVENT_POINT',
  ACTIVATION = 'ACTIVATION',
  RULE = 'RULE',
  FEATURE_SERVICE = 'FEATURE_SERVICE',
  MODEL = 'MODEL',
  INTERFACE = 'INTERFACE'
}

export enum TargetType {
  FEATURE_SERVICE = 'FEATURE_SERVICE',
  MODEL = 'MODEL',
  SCRIPT_BATCH = 'SCRIPT_BATCH',
  CUSTOM = 'CUSTOM'
}

export enum NotifyChannel {
  DINGTALK = 'DINGTALK',
  EMAIL = 'EMAIL',
  SMS = 'SMS'
}

export enum ManualState {
  MANUAL_OPEN = 'MANUAL_OPEN',
  MANUAL_CLOSE = 'MANUAL_CLOSE',
  FOLLOW_AUTO = 'FOLLOW_AUTO'
}

export enum DegradeAction {
  PASS = 'PASS', 
  REVIEW = 'REVIEW', 
  REJECT = 'REJECT', 
  DEFAULT_VALUE = 'DEFAULT_VALUE', 
  CUSTOM_SCRIPT = 'CUSTOM_SCRIPT' 
}

export enum MetricType {
  PASS_RATE = 'PASS_RATE', 
  REJECT_RATE = 'REJECT_RATE', 
  RULE_HIT_RATE = 'RULE_HIT_RATE', 
  FEATURE_MISSING_RATE = 'FEATURE_MISSING_RATE', 
  SCORE_AVG = 'SCORE_AVG', 
  SCORE_SPIKE = 'SCORE_SPIKE', 
  QPS = 'QPS', 
  LATENCY = 'LATENCY' 
}

export enum BaselineType {
  BASELINE_FIXED = 'BASELINE_FIXED',
  BASELINE_ROLLING = 'BASELINE_ROLLING'
}

export enum Comparator {
  LT = 'LT', 
  GT = 'GT', 
  DROP_PERCENT = 'DROP_PERCENT', 
  RISE_PERCENT = 'RISE_PERCENT' 
}

export enum GuardrailAction {
  RULE_BYPASS = 'RULE_BYPASS', 
  RULE_DISABLE = 'RULE_DISABLE', 
  SWITCH_FALLBACK_SET = 'SWITCH_FALLBACK_SET', 
  REQUIRE_REVIEW = 'REQUIRE_REVIEW' 
}

// -------- Feature Related Types --------

// Runtime Switch (On/Off)
export enum FeatureStatus {
  ENABLED = 1, 
  DISABLED = 2 
}

// Lifecycle State (Development Phase)
export enum FeatureLifecycle {
  DRAFT = 'DRAFT',                 // 草稿：仅编辑者可见，未提交
  READY_FOR_RELEASE = 'READY',     // 待发布：已完成自测，等待加入发布单
  PUBLISHED = 'PUBLISHED',         // 已发布：当前线上生效版本
  ARCHIVED_HISTORY = 'ARCHIVED'    // 历史版本：已被新版本覆盖的快照
}

export enum FeatureType {
  DIRECT_STORAGE = 'DirectStorage', 
  HISTORY_STORAGE = 'HistoryStorage', 
  AGGREGATION = 'Aggregation', 
  OFFLINE_STORAGE = 'OfflineStorage' 
}

export enum AggregationMethod {
  COUNT = 'COUNT',
  SUM = 'SUM',
  MIN = 'MIN',
  MAX = 'MAX',
  AVG = 'AVG',
  VARIANCE = 'VARIANCE',
  STDDEV = 'STDDEV',
  DISTINCT_COUNT = 'DISTINCT_COUNT',
  MEDIAN = 'MEDIAN',
  PERCENTILE_95 = 'PERCENTILE_95',
  PERCENTILE_99 = 'PERCENTILE_99',
  RATE = 'RATE',
  FIRST = 'FIRST',
  LAST = 'LAST',
  RANGE = 'RANGE',
  INTER_ARRIVAL_MEAN = 'INTER_ARRIVAL_MEAN',
  INTER_ARRIVAL_STD = 'INTER_ARRIVAL_STD',
  ENTROPY = 'ENTROPY'
}

export enum DatePartitionValueStrategy {
  YESTERDAY = 'YESTERDAY',
  TODAY = 'TODAY'
}

export enum WriteSource {
  REALTIME = 'REALTIME', 
  ASYNC_BACKFILL = 'ASYNC_BACKFILL', 
  BOTH = 'BOTH' 
}

export enum FeatureValueType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  LONG = 'LONG',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  LIST = 'LIST',
  JSON = 'JSON'
}

export interface Feature {
  id?: number;
  name: string; 
  description: string; 
  status: FeatureStatus; // Runtime status (Enabled/Disabled)
  lifecycleState: FeatureLifecycle; // Development lifecycle
  type: FeatureType; 
  writeSource: WriteSource | string; 
  valueType: FeatureValueType | string; 
  eventPoints: string[]; 
  dependentFeatures: string[]; 
  conditionScript: string; 
  compositeKeyJsonPaths: string; 
  calculationConfig: string; 
  includeCurrentEvent: boolean; 
  createAt?: string;
  updateAt?: string;
  operator?: string; 
}

// -------- New: Versioning & Release Order Types --------

export interface FeatureVersion {
  id: string;
  featureId: number;
  version: number;
  content: Feature; // Snapshot of the feature config
  commitMessage: string;
  editor: string;
  createAt: string;
}

export enum ReleaseType {
  FEATURE = 'FEATURE',
  POLICY = 'POLICY',
  RULE = 'RULE',
  EVENT_POINT = 'EVENT_POINT'
}

export enum ReleaseStatus {
  PENDING = 'PENDING', // 待审批
  APPROVED = 'APPROVED', // 审批通过 (已审核，等待发布)
  PUBLISHING = 'PUBLISHING', // 发布中
  PUBLISHED = 'PUBLISHED', // 已发布
  REJECTED = 'REJECTED', // 已驳回
  FAILED = 'FAILED' // 发布失败
}

// 单个变更对象
export interface ReleaseTarget {
  type: ReleaseType;
  targetId: string | number;
  targetName: string;
  changeSummary?: string;
  relatedKeys?: string; // e.g. Access Point EP001
}

// 草稿池中的对象（待发布清单）
export interface DraftItem {
  id: string; // 唯一标识，如 "DRAFT-001"
  type: ReleaseType;
  targetId: string | number; // 关联的实际对象ID
  targetName: string;
  version: string; // 本次发布的版本号 (e.g., v3)
  relatedKeys?: string; // 关联检索Key (e.g., eventPoints, scope)
  updatedAt: string;
  editor: string;
  changeSummary: string; // 上次保存时的备注
}

export interface ReleaseOrder {
  id: string;
  title: string;
  items: ReleaseTarget[]; // 支持多个对象
  status: ReleaseStatus;
  applicant: string;
  approver?: string;
  applyTime: string;
  finishTime?: string;
  description: string;
}

// ---------------------------------------

export interface Scope {
  level: ScopeLevel;
  eventPoint?: string;
  activationName?: string;
  ruleName?: string;
  interfaceName?: string; 
  targetType?: TargetType;
  targetKey?: string;
}

export interface BasePolicy {
  policyId: string;
  name: string;
  status: Status;
  scope: Scope;
  notifyChannels: NotifyChannel[];
  remark: string;
  updatedAt: string;
  operator: string;
}

export interface CircuitBreakerPolicy extends BasePolicy {
  type: PolicyType.CIRCUIT_BREAKER;
  thresholds: {
    failureRate: number; 
    slowCallRate: number; 
  };
  slowCallDurationMs: number;
  minimumNumberOfCalls: number;
  slidingWindowSize: number;
  waitDurationInOpenState: number;
  autoRecover: boolean;
  manualState: ManualState;
  degradeAction: DegradeAction;
  trafficQuota?: number;
}

export interface GuardrailPolicy extends BasePolicy {
  type: PolicyType.GUARDRAIL;
  metricType: MetricType;
  dimension: ScopeLevel; 
  windowSeconds: number;
  baseline: BaselineType;
  comparator: Comparator;
  threshold: number;
  minSamples: number;
  coolDownSeconds: number;
  actions: GuardrailAction[];
  actionParams?: Record<string, string>;
}

export interface OverrideConfig {
  id: string;
  scope: Scope;
  manualState: ManualState;
  ttlSeconds: number;
  operator: string;
  remark: string;
  createdAt: string;
}

export type AnyPolicy = CircuitBreakerPolicy | GuardrailPolicy;

export const t = (key: string | number): string => {
  const map: Record<string, string> = {
    // ... existing mappings
    [PolicyType.CIRCUIT_BREAKER]: '服务熔断策略',
    [PolicyType.GUARDRAIL]: '业务护栏策略',
    [PolicyType.OVERRIDE]: '手动干预',
    [Status.DRAFT]: '草稿',
    [Status.PENDING_APPROVAL]: '审批中',
    [Status.PUBLISHED]: '已发布',
    [Status.OFFLINE]: '已下线',
    
    [ScopeLevel.GLOBAL]: '全局',
    [ScopeLevel.EVENT_POINT]: '事件接入点',
    [ScopeLevel.ACTIVATION]: '策略集',
    [ScopeLevel.RULE]: '规则',
    [ScopeLevel.FEATURE_SERVICE]: '特征服务',
    [ScopeLevel.MODEL]: '模型服务',
    [ScopeLevel.INTERFACE]: '接口/阶段',
    
    // Feature Enums (Pure Chinese as requested)
    [FeatureStatus.ENABLED]: '已启用',
    [FeatureStatus.DISABLED]: '已禁用',

    // Feature Lifecycle Enums
    // [FeatureLifecycle.DRAFT]: '草稿', // Duplicate key with Status.DRAFT
    [FeatureLifecycle.READY_FOR_RELEASE]: '待发布',
    // [FeatureLifecycle.PUBLISHED]: '已发布', // Duplicate key with Status.PUBLISHED
    [FeatureLifecycle.ARCHIVED_HISTORY]: '历史归档',

    [FeatureType.DIRECT_STORAGE]: '直接存储',
    [FeatureType.HISTORY_STORAGE]: '历史存储',
    [FeatureType.AGGREGATION]: '聚合',
    [FeatureType.OFFLINE_STORAGE]: '离线存储',

    // Aggregation Methods
    [AggregationMethod.COUNT]: '计数',
    [AggregationMethod.SUM]: '求和',
    [AggregationMethod.MIN]: '最小值',
    [AggregationMethod.MAX]: '最大值',
    [AggregationMethod.AVG]: '平均值',
    [AggregationMethod.VARIANCE]: '方差',
    [AggregationMethod.STDDEV]: '标准差',
    [AggregationMethod.DISTINCT_COUNT]: '去重计数',
    [AggregationMethod.MEDIAN]: '中位数',
    [AggregationMethod.PERCENTILE_95]: '95分位数',
    [AggregationMethod.PERCENTILE_99]: '99分位数',
    [AggregationMethod.RATE]: '频率/比率',
    [AggregationMethod.FIRST]: '首次值',
    [AggregationMethod.LAST]: '末次值',
    [AggregationMethod.RANGE]: '数值范围',
    [AggregationMethod.INTER_ARRIVAL_MEAN]: '交易间隔平均时间',
    [AggregationMethod.INTER_ARRIVAL_STD]: '交易间隔标准差',
    [AggregationMethod.ENTROPY]: '信息熵',

    // Date Partition Strategies
    [DatePartitionValueStrategy.YESTERDAY]: 'T-1 (昨天)',
    [DatePartitionValueStrategy.TODAY]: 'T-0 (今天)',

    [WriteSource.REALTIME]: '实时写入',
    [WriteSource.ASYNC_BACKFILL]: '异步补齐',
    [WriteSource.BOTH]: '实时+异步',

    [FeatureValueType.STRING]: '字符串',
    [FeatureValueType.INTEGER]: '整数',
    [FeatureValueType.LONG]: '长整数',
    [FeatureValueType.DOUBLE]: '浮点数',
    [FeatureValueType.BOOLEAN]: '布尔值',
    [FeatureValueType.LIST]: '列表',
    [FeatureValueType.JSON]: 'JSON对象',

    // Release Order (Optimized Copy)
    [ReleaseType.FEATURE]: '特征配置',
    [ReleaseType.POLICY]: '风控策略',
    
    [ReleaseStatus.PENDING]: '待审核', // Wait for audit
    [ReleaseStatus.APPROVED]: '已审核', // Audited / Ready to Publish
    [ReleaseStatus.PUBLISHING]: '发布中',
    // [ReleaseStatus.PUBLISHED]: '已发布', // Duplicate key
    [ReleaseStatus.REJECTED]: '已驳回',
    [ReleaseStatus.FAILED]: '发布失败',
  };
  return map[key.toString()] || key.toString();
};
