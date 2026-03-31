import React, { useState, useEffect, useRef } from 'react';
import { 
  Feature, FeatureStatus, FeatureLifecycle, FeatureType, WriteSource, FeatureValueType, t, DraftItem, ReleaseType, AggregationMethod, DatePartitionValueStrategy
} from '../types';
import { Save, X, ShoppingCart, Code, Plus, Trash2, Settings, List, GitBranch, AlertCircle, Database, MessageSquare } from 'lucide-react';
import { suggestionData } from '../mockData';

// ----------------------------------------------------------------------
// Internal Component: Simple Code Editor (Kept for Groovy Script)
// ----------------------------------------------------------------------

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'groovy';
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, height = "h-32", placeholder, readOnly }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces for tab
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      
      onChange(newValue);

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className={`rounded-md overflow-hidden border transition-all shadow-sm ${readOnly ? 'border-slate-200 bg-slate-50' : 'border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'}`}>
      <div className={`px-3 py-1.5 text-xs flex items-center justify-between border-b ${readOnly ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#1e1e1e] text-slate-400 border-[#333]'}`}>
        <div className="flex items-center gap-2">
           <Code className={`w-3 h-3 ${readOnly ? 'text-slate-500' : 'text-yellow-500'}`} />
           <span className="uppercase font-semibold tracking-wider font-mono text-[10px]">{language}</span>
        </div>
        {!readOnly && <div className="text-[10px] opacity-60">Tab to indent</div>}
      </div>
      
      <textarea 
        ref={textareaRef}
        className={`w-full ${height} p-3 font-mono text-sm resize-y focus:outline-none block leading-relaxed custom-scrollbar ${readOnly ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : 'bg-[#1e1e1e] text-[#d4d4d4]'}`}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder={placeholder}
        disabled={readOnly}
        style={{ fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
      />
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
  readOnly?: boolean;
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
  conditionScript: '// 请在此编写 Groovy 脚本\n// 上下文对象: fact (当前事件), context (全局上下文)\nif (fact.amount > 100) {\n  return true;\n}\nreturn false;',
  compositeKeyJsonPaths: '[]',
  calculationConfig: '{}',
  includeCurrentEvent: false,
  operator: 'current_user'
};

export const FeatureEditor: React.FC<FeatureEditorProps> = ({ initialFeature, onSave, onCancel, onAddToDrafts, readOnly = false }) => {
  const [feature, setFeature] = useState<Feature>(initialFeature || { ...emptyFeature });
  const [eventPointInput, setEventPointInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

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
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800">
            {initialFeature ? (readOnly ? '查看特征配置 (只读)' : '修改特征配置') : '新增特征'}
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
           <h3 className="text-base font-semibold text-slate-900 mb-4 border-l-4 border-indigo-500 pl-3">核心逻辑脚本</h3>
           
           <div className="space-y-6">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                    条件判断脚本 (Groovy)
                 </label>
                 <CodeEditor 
                   language="groovy"
                   height="h-40"
                   value={feature.conditionScript}
                   onChange={(val) => handleChange('conditionScript', val)}
                   readOnly={readOnly}
                 />
                 {!readOnly && <p className="text-xs text-slate-400 mt-1">脚本返回 true 时才会执行特征提取。可使用 `fact` 对象访问事件上下文。</p>}
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
             {readOnly ? '返回' : '取消'}
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
  );
};