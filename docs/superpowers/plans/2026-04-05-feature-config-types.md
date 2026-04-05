# 特征类型配置字段补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补全 6 种特征类型在编辑页和详情页的所有配置字段，新增 StatefulStorage / ExternalDataSource 两种类型的完整表单，并让详情页复用编辑页布局做只读展示。

**Architecture:** 所有变更集中在单一文件 `app.js`。在 `ftRenderForm` 函数内将 `storageFields` 拆分为 `directFields` / `historyFields`，新增 `statefulFields` / `externalFields`，通过 `readOnly` 标志在详情页复用同一套渲染逻辑。

**Tech Stack:** React (JSX in app.js), Tailwind CSS, lucide-react icons

---

## 文件结构

| 文件 | 修改类型 | 内容 |
|------|---------|------|
| `app.js` | Modify | 全部变更（单文件项目） |

**app.js 关键锚点：**

| 描述 | 定位字符串 |
|------|-----------|
| pd 枚举末尾 | `n.OFFLINE_STORAGE="OfflineStorage",n))(pd` |
| 展示名称映射 | `OfflineStorage:"\u79BB\u7EBF\u5B58\u50A8"` |
| 列表页图标 switch | `case"DirectStorage":return(0,Q.jsx)(Ir` |
| 详情页 type flags | `o.type==="HistoryStorage",re=o.type==="OfflineStorage"` |
| 详情页 calculationConfig 渲染 | `whitespace-pre leading-relaxed flex-1",children:e.calculationConfig` |
| ftRenderForm 函数入口 | `ftRenderForm=(_e0,t,a)=>{` |
| 编辑页 type flags | `let l=e.type==="Aggregation",s=e.type==="DirectStorage"||e.type==="HistoryStorage",u=e.type==="OfflineStorage"` |
| aggFields 块 | `let aggFields=l?` |
| storageFields 块 | `let storageFields=s?` |
| offlineFields 块 | `let offlineFields=u?` |
| paramPanel children | `children:[aggFields,storageFields,offlineFields]` |

---

## Task 1: 扩展 pd 枚举 + 展示名称

**Files:**
- Modify: `app.js` (锚点: `n.OFFLINE_STORAGE="OfflineStorage",n))(pd`)

- [ ] **Step 1: 在 pd 枚举中添加两个新类型**

  找到：
  ```
  n.OFFLINE_STORAGE="OfflineStorage",n))(pd||{})
  ```
  替换为：
  ```
  n.OFFLINE_STORAGE="OfflineStorage",n.STATEFUL_STORAGE="StatefulStorage",n.EXTERNAL_DATA_SOURCE="ExternalDataSource",n))(pd||{})
  ```

- [ ] **Step 2: 在展示名称映射中添加两个新类型**

  找到：
  ```
  OfflineStorage:"\u79BB\u7EBF\u5B58\u50A8"
  ```
  替换为：
  ```
  OfflineStorage:"\u79BB\u7EBF\u5B58\u50A8",StatefulStorage:"\u72B6\u6001\u5B58\u50A8",ExternalDataSource:"\u5916\u90E8\u6570\u636E\u6E90"
  ```

- [ ] **Step 3: 在浏览器打开 index.html，进入特征管理，点击"新建"，检查特征类型下拉是否新增了"状态存储特征"和"外部数据源特征"两项**

- [ ] **Step 4: Commit**

  ```bash
  git add app.js
  git commit -m "feat: 特征类型枚举新增 StatefulStorage / ExternalDataSource"
  ```

---

## Task 2: 列表页图标 + 详情页图标

**Files:**
- Modify: `app.js` (锚点: `case"DirectStorage":return(0,Q.jsx)(Ir`)

- [ ] **Step 1: 找到列表页图标 switch 语句，定位末尾 default case 前**

  找到：
  ```
  case"Aggregation":return(0,Q.jsx)(Ra,{className:"w-4 h-4 text-indigo-500"});default:
  ```

  在 `default:` 之前插入两个新 case（`lt` 是 GitBranch 图标，已在 DRAFT 徽章中使用；Globe 图标变量需先搜索确认，见下方说明）：

  ```
  case"StatefulStorage":return(0,Q.jsx)(lt,{className:"w-4 h-4 text-green-500"});case"ExternalDataSource":return(0,Q.jsx)(Xt2,{className:"w-4 h-4 text-purple-500"});default:
  ```

  > **说明：Globe 图标变量名查找方法**
  > 在 app.js 第 42 行执行：`grep -o '.\{0,5\}globe.\{0,5\}' app.js` 找到 `globe.js` 对应的变量名。或者在浏览器 DevTools 中搜索 `globe` 关键词找到导出变量。将上方 `Xt2` 替换为实际变量名。
  >
  > **备选方案**：若 Globe 变量难以定位，可先用 `$o`（default 用的图标），后续再换。

- [ ] **Step 2: 刷新浏览器，在特征列表中选一个 OfflineStorage 特征，修改类型为 StatefulStorage 并保存，检查列表行图标是否变为绿色**

- [ ] **Step 3: Commit**

  ```bash
  git add app.js
  git commit -m "feat: 列表页新增 StatefulStorage / ExternalDataSource 图标"
  ```

---

## Task 3: 拆分 type flags，分离 DirectStorage 和 HistoryStorage

**Files:**
- Modify: `app.js` (锚点: `let l=e.type==="Aggregation",s=e.type===`)

- [ ] **Step 1: 扩展 type 检测变量**

  找到（在 `ftRenderForm` 函数内，约在第 52 行）：
  ```
  let l=e.type==="Aggregation",s=e.type==="DirectStorage"||e.type==="HistoryStorage",u=e.type==="OfflineStorage";
  ```
  替换为：
  ```
  let l=e.type==="Aggregation",s=e.type==="DirectStorage"||e.type==="HistoryStorage",u=e.type==="OfflineStorage",isDirStorage=e.type==="DirectStorage",isHistStorage=e.type==="HistoryStorage",isStateful=e.type==="StatefulStorage",isExternal=e.type==="ExternalDataSource";
  ```

  > 保留 `s` 不变，避免破坏其他依赖 `s` 的逻辑。新增细粒度变量供后续 Task 使用。

- [ ] **Step 2: 刷新浏览器，确认现有 DirectStorage / HistoryStorage 表单字段显示正常（storageFields 仍依赖 `s`，不受影响）**

- [ ] **Step 3: Commit**

  ```bash
  git add app.js
  git commit -m "refactor: 特征 type flags 增加细粒度变量"
  ```

---

## Task 4: 补全 DirectStorage — 添加 writeMode 字段

**Files:**
- Modify: `app.js` (锚点: `let storageFields=s?`)

- [ ] **Step 1: 在 storageFields 的 ttlSeconds 字段后添加 writeMode（仅 DirectStorage）**

  找到 storageFields 块中 TTL 字段的结尾：
  ```
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"TTL (秒)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.ttlSeconds||"",onChange:v=>_uc("ttlSeconds",parseInt(v.target.value)||0)})]})
  ]}):null;
  ```

  在 TTL 字段 div 结尾、`]}):null;` 之前插入（整个 storageFields 块末尾追加 writeMode，但只在 isDirStorage 时显示）：

  ```
  ,isDirStorage?(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"写入模式"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.writeMode||"ALWAYS",onChange:v=>_uc("writeMode",v.target.value),children:["ALWAYS","SET_IF_ABSENT","INCREMENT","DECREMENT"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]}):null
  ```

  最终 storageFields 块末尾为：
  ```
  ...[TTL字段],
  isDirStorage?(0,X.jsxs)("div",{...writeMode select...}):null
  ]}):null;
  ```

- [ ] **Step 2: 在浏览器新建一个 DirectStorage 特征，检查参数配置区域是否有"写入模式"下拉，选项包含 ALWAYS / SET_IF_ABSENT / INCREMENT / DECREMENT**

- [ ] **Step 3: 新建一个 HistoryStorage 特征，检查参数配置区域是否没有"写入模式"字段（因为 isDirStorage 为 false）**

- [ ] **Step 4: Commit**

  ```bash
  git add app.js
  git commit -m "feat: DirectStorage 参数配置新增 writeMode 字段"
  ```

---

## Task 5: 补全 HistoryStorage — 卡片模式选择器 + 缺失字段

**Files:**
- Modify: `app.js` (锚点: `let storageFields=s?`)

HistoryStorage 需要两个模式（固定容量 / 时间窗口）用卡片切换，公共字段包含 valueJsonPath、ttlSeconds、writeMode（ALWAYS/SET_IF_ABSENT）。

- [ ] **Step 1: 在 storageFields 块之后（`let offlineFields=u?` 之前）插入 historyFields 块**

  在 `let offlineFields=u?` 这一行之前插入以下代码：

  ```javascript
  let historyFields=isHistStorage?(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{children:[
  (0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-2",children:"存储模式"}),
  (0,X.jsxs)("div",{className:"grid grid-cols-2 gap-2 mb-1",children:[
  (0,X.jsxs)("div",{className:`border-2 rounded-lg p-2 text-center cursor-pointer ${!i.storageMode||i.storageMode==="FIXED_SIZE"?"border-indigo-500 bg-indigo-50":"border-slate-200 bg-white"}`,onClick:()=>_uc("storageMode","FIXED_SIZE"),children:[
  (0,X.jsx)("div",{className:"text-xs font-semibold text-slate-700",children:"\u56FA\u5B9A\u5BB9\u91CF"}),
  (0,X.jsx)("div",{className:"text-xs text-slate-400 mt-0.5",children:"\u4FDD\u7559\u6700\u8FD1 N \u6761"})
  ]}),
  (0,X.jsxs)("div",{className:`border-2 rounded-lg p-2 text-center cursor-pointer ${i.storageMode==="TIME_WINDOW"?"border-indigo-500 bg-indigo-50":"border-slate-200 bg-white"}`,onClick:()=>_uc("storageMode","TIME_WINDOW"),children:[
  (0,X.jsx)("div",{className:"text-xs font-semibold text-slate-700",children:"\u65F6\u95F4\u7A97\u53E3"}),
  (0,X.jsx)("div",{className:"text-xs text-slate-400 mt-0.5",children:"\u4FDD\u7559\u6700\u8FD1 N \u79D2\u5185"})
  ]})
  ]})
  ]}),
  i.storageMode==="TIME_WINDOW"?(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65F6\u95F4\u7A97\u53E3 (\u79D2)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.timeWindowSeconds||"",onChange:v=>_uc("timeWindowSeconds",parseInt(v.target.value)||0)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65F6\u95F4\u6233\u8DEF\u5F84 (\u9009\u586B\uFF0C\u7A7A=\u7CFB\u7EDF\u65F6\u95F4)"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.timestampJsonPath||"",onChange:v=>_uc("timestampJsonPath",v.target.value)})]}),
  ]}):(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5386\u53F2\u8BB0\u5F55\u5927\u5C0F"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.historySize||"",onChange:v=>_uc("historySize",parseInt(v.target.value)||0)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u6570\u503C\u63D0\u53D6\u8DEF\u5F84"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.valueJsonPath||"",onChange:v=>_uc("valueJsonPath",v.target.value)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"TTL (\u79D2)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.ttlSeconds||"",onChange:v=>_uc("ttlSeconds",parseInt(v.target.value)||0)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5199\u5165\u6A21\u5F0F"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.writeMode||"ALWAYS",onChange:v=>_uc("writeMode",v.target.value),children:["ALWAYS","SET_IF_ABSENT"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]})
  ]}):null;
  ```

- [ ] **Step 2: 在浏览器新建 HistoryStorage 特征，检查参数配置显示两个卡片（固定容量 / 时间窗口）**

- [ ] **Step 3: 点击"固定容量"卡片，检查显示"历史记录大小"输入框（不显示时间窗口/时间戳字段）**

- [ ] **Step 4: 点击"时间窗口"卡片，检查显示"时间窗口(秒)"和"时间戳路径"字段（不显示历史记录大小）**

- [ ] **Step 5: Commit**

  ```bash
  git add app.js
  git commit -m "feat: HistoryStorage 参数配置卡片模式切换 + 补全字段"
  ```

---

## Task 6: 补全 AggregationConfig — 添加 timestampJsonPath

**Files:**
- Modify: `app.js` (锚点: `let aggFields=l?`)

- [ ] **Step 1: 在 aggFields 的 timeWindowSeconds 字段后追加 timestampJsonPath**

  找到 aggFields 块中 timeWindowSeconds 字段的结尾：
  ```
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65F6\u95F4\u7A97\u53E3 (\u79D2)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.timeWindowSeconds||"",onChange:v=>_uc("timeWindowSeconds",parseInt(v.target.value)||0)})])})
  ]}):null;
  ```

  在 timeWindowSeconds div 结尾、`]}):null;` 之前插入：
  ```
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65F6\u95F4\u6233\u8DEF\u53D6\u8DEF\u5F84 (\u9009\u586B\uFF0C\u7A7A=\u7CFB\u7EDF\u65F6\u95F4)"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.timestampJsonPath||"",onChange:v=>_uc("timestampJsonPath",v.target.value)})]})
  ```

- [ ] **Step 2: 刷新浏览器，新建 Aggregation 特征，检查参数配置区域是否有"时间戳提取路径"输入框**

- [ ] **Step 3: Commit**

  ```bash
  git add app.js
  git commit -m "feat: Aggregation 参数配置新增 timestampJsonPath 字段"
  ```

---

## Task 7: 补全 OfflineStorage — 添加 5 个缺失字段

**Files:**
- Modify: `app.js` (锚点: `let offlineFields=u?`)

- [ ] **Step 1: 在 offlineFields 的 entityIdColumn 字段后追加 5 个字段**

  找到 offlineFields 块中 entityIdColumn 字段的结尾：
  ```
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u4E3B\u952E\u5217"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.entityIdColumn||"",onChange:v=>_uc("entityIdColumn",v.target.value)})]})
  ]}):null;
  ```

  在 entityIdColumn div 结尾、`]}):null;` 之前插入：
  ```
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65E5\u671F\u5206\u533A\u5217"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.datePartitionColumn||"",onChange:v=>_uc("datePartitionColumn",v.target.value)})]})
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5206\u533A\u65E5\u671F\u7B56\u7565"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.datePartitionValueStrategy||"YESTERDAY",onChange:v=>_uc("datePartitionValueStrategy",v.target.value),children:["TODAY","YESTERDAY"].map(v=>(0,X.jsx)("option",{value:v,children:v==="\u4ECA\u5929"?"TODAY":v==="\u6628\u5929"?"YESTERDAY":v},v))})]})
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5206\u533A\u65E5\u671F\u683C\u5F0F"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.datePartitionFormat||"YYYY_MM_DD",onChange:v=>_uc("datePartitionFormat",v.target.value),children:["YYYY_MM_DD","YYYYMMDD","YYYY_MM","YYYYMM"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]})
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5206\u533A\u56DE\u9000\u5929\u6570"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.datePartitionFallbackDays||"",onChange:v=>_uc("datePartitionFallbackDays",parseInt(v.target.value)||0)})]})
  ,(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u5199\u5165\u6A21\u5F0F"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.writeMode||"ALWAYS",onChange:v=>_uc("writeMode",v.target.value),children:["ALWAYS","SET_IF_ABSENT"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]})
  ```

- [ ] **Step 2: 刷新浏览器，新建 OfflineStorage 特征，检查是否新增：日期分区列、分区日期策略（TODAY/YESTERDAY）、分区日期格式（4个选项）、分区回退天数、写入模式**

- [ ] **Step 3: Commit**

  ```bash
  git add app.js
  git commit -m "feat: OfflineStorage 参数配置补全 datePartition 和 writeMode 字段"
  ```

---

## Task 8: 实现 StatefulStorage 配置字段

**Files:**
- Modify: `app.js` (锚点: `let offlineFields=u?` 行之后)

- [ ] **Step 1: 在 offlineFields 块之后（`let paramPanel=` 行之前）插入 statefulFields**

  ```javascript
  let statefulFields=isStateful?(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"TTL (\u79D2\uFF0C\u6BCF\u6B21\u72B6\u6001\u53D8\u66F4\u5237\u65B0\uFF0C\u9ED8\u8BA4 172800)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.ttlSeconds||"",onChange:v=>_uc("ttlSeconds",parseInt(v.target.value)||0)})]}),
  (0,X.jsxs)("div",{children:[
  (0,X.jsxs)("div",{className:"flex justify-between items-center mb-2",children:[
  (0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500",children:"\u72B6\u6001\u8F6C\u6362\u914D\u7F6E"}),
  (0,X.jsxs)("button",{type:"button",onClick:()=>{let _t=[...(i.transitions||[]),{type:"ENTER",conditionScript:"",idJsonPath:"",valueJsonPath:""}];_uc("transitions",_t)},className:"text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1",children:[(0,X.jsx)(ft,{className:"w-3 h-3"}),"\u6DFB\u52A0\u8F6C\u6362"]})
  ]}),
  (i.transitions||[]).length===0?(0,X.jsx)("div",{className:"text-xs text-slate-400 text-center py-3 border border-dashed border-slate-300 rounded",children:"\u6682\u65E0\u8F6C\u6362\u914D\u7F6E\uFF0C\u70B9\u51FB\u201C\u6DFB\u52A0\u8F6C\u6362\u201D"}):(i.transitions||[]).map((_t,_idx)=>(0,X.jsxs)("div",{className:`border rounded-lg p-3 mb-2 ${_t.type==="ENTER"?"border-green-200 bg-green-50":"border-orange-200 bg-orange-50"}`,children:[
  (0,X.jsxs)("div",{className:"flex justify-between items-center mb-2",children:[
  (0,X.jsx)("select",{className:"text-xs border border-slate-300 rounded px-2 py-1 bg-white font-semibold",value:_t.type,onChange:_v=>{let _t2=[...(i.transitions||[])];_t2[_idx]={..._t2[_idx],type:_v.target.value};_uc("transitions",_t2)},children:["ENTER","EXIT"].map(_v=>(0,X.jsx)("option",{value:_v,children:_v},_v))}),
  (0,X.jsx)("button",{type:"button",onClick:()=>{let _t2=(i.transitions||[]).filter((_,_i2)=>_i2!==_idx);_uc("transitions",_t2)},className:"text-xs text-red-500 hover:text-red-700",children:"\u5220\u9664"})
  ]}),
  (0,X.jsxs)("div",{className:"space-y-2",children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"\u89E6\u53D1\u6761\u4EF6"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 font-mono",value:_t.conditionScript||"",onChange:_v=>{let _t2=[...(i.transitions||[])];_t2[_idx]={..._t2[_idx],conditionScript:_v.target.value};_uc("transitions",_t2)}})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"ID \u8DEF\u5F84"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 font-mono",value:_t.idJsonPath||"",onChange:_v=>{let _t2=[...(i.transitions||[])];_t2[_idx]={..._t2[_idx],idJsonPath:_v.target.value};_uc("transitions",_t2)}})]}),
  _t.type==="ENTER"?(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"\u91D1\u989D\u8DEF\u5F84 (ENTER \u4E13\u7528)"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 font-mono",value:_t.valueJsonPath||"",onChange:_v=>{let _t2=[...(i.transitions||[])];_t2[_idx]={..._t2[_idx],valueJsonPath:_v.target.value};_uc("transitions",_t2)}})]})  :null
  ]})
  ]},_idx))
  ]})
  ]}):null;
  ```

- [ ] **Step 2: 刷新浏览器，新建 StatefulStorage 特征，检查参数配置显示 TTL 字段 + 空的转换列表 + "添加转换"按钮**

- [ ] **Step 3: 点击"添加转换"，检查出现一张 ENTER 类型卡片（绿色），含触发条件、ID路径、金额路径三个字段**

- [ ] **Step 4: 将类型切换为 EXIT，检查"金额路径"字段自动隐藏**

- [ ] **Step 5: 点击"删除"，检查该条转换被移除**

- [ ] **Step 6: Commit**

  ```bash
  git add app.js
  git commit -m "feat: 新增 StatefulStorage 参数配置表单（transitions 动态列表）"
  ```

---

## Task 9: 实现 ExternalDataSource 配置字段

**Files:**
- Modify: `app.js` (锚点: `let statefulFields=isStateful?` 行之后)

- [ ] **Step 1: 在 statefulFields 块之后（`let paramPanel=` 行之前）插入 externalFields**

  ```javascript
  let externalFields=isExternal?(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u534F\u8BAE"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 bg-white",value:i.protocol||"dubbo",onChange:v=>_uc("protocol",v.target.value),children:["dubbo","http"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u65B9\u6CD5\u540D"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.method||"",onChange:v=>_uc("method",v.target.value)})]})
  ]}),
  (0,X.jsxs)("div",{className:"border border-slate-200 rounded-lg p-3 bg-slate-50",children:[
  (0,X.jsx)("div",{className:"text-xs font-medium text-slate-500 mb-2",children:(i.protocol||"dubbo")==="dubbo"?"Dubbo \u914D\u7F6E":"HTTP \u914D\u7F6E"}),
  i.protocol==="http"?(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{className:"mb-2",children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"URL"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 font-mono bg-white",value:(i.protocolConfig||{}).url||"",onChange:v=>{_uc("protocolConfig",{...i.protocolConfig,url:v.target.value})}})]}),
  (0,X.jsxs)("div",{className:"grid grid-cols-2 gap-2",children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"HTTP \u65B9\u6CD5"}),(0,X.jsx)("select",{className:"w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white",value:(i.protocolConfig||{}).httpMethod||"POST",onChange:v=>{_uc("protocolConfig",{...i.protocolConfig,httpMethod:v.target.value})},children:["GET","POST"].map(v=>(0,X.jsx)("option",{value:v,children:v},v))})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"\u8FDE\u63A5\u8D85\u65F6 (ms)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white",value:(i.protocolConfig||{}).connectTimeoutMs||"",onChange:v=>{_uc("protocolConfig",{...i.protocolConfig,connectTimeoutMs:parseInt(v.target.value)||0})}})])
  ]})
  ]}):(0,X.jsxs)(X.Fragment,{children:[
  (0,X.jsxs)("div",{className:"mb-2",children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"\u63A5\u53E3\u540D"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 font-mono bg-white",value:(i.protocolConfig||{}).interface||"",onChange:v=>{_uc("protocolConfig",{...i.protocolConfig,interface:v.target.value})}})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs text-slate-500 mb-1",children:"\u91CD\u8BD5\u6B21\u6570"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1 bg-white",value:(i.protocolConfig||{}).retries||0,onChange:v=>{_uc("protocolConfig",{...i.protocolConfig,retries:parseInt(v.target.value)||0})}})]})
  ]})
  ]}),
  (0,X.jsxs)("div",{children:[
  (0,X.jsxs)("div",{className:"flex justify-between items-center mb-1",children:[
  (0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500",children:"\u53C2\u6570\u6620\u5C04 (\u53C2\u6570\u540D \u2192 riskFact JsonPath)"}),
  (0,X.jsxs)("button",{type:"button",onClick:()=>{let _pm={...(i.paramMapping||{}),"":""};_uc("paramMapping",_pm)},className:"text-xs text-indigo-600 hover:text-indigo-800",children:["\u6DFB\u52A0"]})
  ]}),
  (0,X.jsx)("div",{className:"border border-slate-200 rounded overflow-hidden",children:Object.entries(i.paramMapping||{}).length===0?(0,X.jsx)("div",{className:"text-xs text-slate-400 text-center py-2",children:"\u65E0\u53C2\u6570\u6620\u5C04"}):(0,X.jsxs)("table",{className:"w-full",children:[
  (0,X.jsx)("thead",{children:(0,X.jsxs)("tr",{className:"bg-slate-50",children:[(0,X.jsx)("th",{className:"text-xs text-slate-400 font-normal text-left px-2 py-1",children:"\u53C2\u6570\u540D"}),(0,X.jsx)("th",{className:"text-xs text-slate-400 font-normal text-left px-2 py-1",children:"JsonPath"}),(0,X.jsx)("th",{className:"w-6"})]})}),
  (0,X.jsx)("tbody",{children:Object.entries(i.paramMapping||{}).map(([_pk,_pv],_pi)=>(0,X.jsxs)("tr",{className:"border-t border-slate-100",children:[
  (0,X.jsx)("td",{className:"px-2 py-1",children:(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-200 rounded px-1 py-0.5",value:_pk,onChange:_ev=>{let _pm={};Object.entries(i.paramMapping||{}).forEach(([k,v],idx)=>{_pm[idx===_pi?_ev.target.value:k]=v});_uc("paramMapping",_pm)}})}),
  (0,X.jsx)("td",{className:"px-2 py-1",children:(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-200 rounded px-1 py-0.5 font-mono",value:_pv,onChange:_ev=>{let _pm={...i.paramMapping,[_pk]:_ev.target.value};_uc("paramMapping",_pm)}})}),
  (0,X.jsx)("td",{className:"px-1",children:(0,X.jsx)("button",{type:"button",onClick:()=>{let _pm={...i.paramMapping};delete _pm[_pk];_uc("paramMapping",_pm)},className:"text-xs text-red-400 hover:text-red-600",children:"\u00D7"})})
  ]},_pi))})
  ]})})
  ]}),
  (0,X.jsxs)("div",{children:[
  (0,X.jsxs)("div",{className:"flex justify-between items-center mb-1",children:[
  (0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500",children:"\u5E38\u91CF\u53C2\u6570"}),
  (0,X.jsxs)("button",{type:"button",onClick:()=>{let _ct={...(i.constants||{}),"":""};_uc("constants",_ct)},className:"text-xs text-indigo-600 hover:text-indigo-800",children:["\u6DFB\u52A0"]})
  ]}),
  (0,X.jsx)("div",{className:"border border-slate-200 rounded overflow-hidden",children:Object.entries(i.constants||{}).length===0?(0,X.jsx)("div",{className:"text-xs text-slate-400 text-center py-2",children:"\u65E0\u5E38\u91CF\u53C2\u6570"}):(0,X.jsxs)("table",{className:"w-full",children:[
  (0,X.jsx)("thead",{children:(0,X.jsxs)("tr",{className:"bg-slate-50",children:[(0,X.jsx)("th",{className:"text-xs text-slate-400 font-normal text-left px-2 py-1",children:"Key"}),(0,X.jsx)("th",{className:"text-xs text-slate-400 font-normal text-left px-2 py-1",children:"Value"}),(0,X.jsx)("th",{className:"w-6"})]})}),
  (0,X.jsx)("tbody",{children:Object.entries(i.constants||{}).map(([_ck,_cv],_ci)=>(0,X.jsxs)("tr",{className:"border-t border-slate-100",children:[
  (0,X.jsx)("td",{className:"px-2 py-1",children:(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-200 rounded px-1 py-0.5",value:_ck,onChange:_ev=>{let _ct={};Object.entries(i.constants||{}).forEach(([k,v],idx)=>{_ct[idx===_ci?_ev.target.value:k]=v});_uc("constants",_ct)}})}),
  (0,X.jsx)("td",{className:"px-2 py-1",children:(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-200 rounded px-1 py-0.5",value:_cv,onChange:_ev=>{let _ct={...i.constants,[_ck]:_ev.target.value};_uc("constants",_ct)}})}),
  (0,X.jsx)("td",{className:"px-1",children:(0,X.jsx)("button",{type:"button",onClick:()=>{let _ct={...i.constants};delete _ct[_ck];_uc("constants",_ct)},className:"text-xs text-red-400 hover:text-red-600",children:"\u00D7"})})
  ]},_ci))})
  ]})})
  ]}),
  (0,X.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u7ED3\u679C\u63D0\u53D6\u8DEF\u5F84"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5 font-mono",value:i.resultPath||"",onChange:v=>_uc("resultPath",v.target.value)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u8D85\u65F6 (ms)"}),(0,X.jsx)("input",{type:"number",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.timeoutMs||5000,onChange:v=>_uc("timeoutMs",parseInt(v.target.value)||5000)})]}),
  (0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-xs font-medium text-slate-500 mb-1",children:"\u964D\u7EA7\u5024 (\u8D85\u65F6\u6216\u5F02\u5E38\u65F6\u8FD4\u56DE)"}),(0,X.jsx)("input",{type:"text",className:"w-full text-xs border border-slate-300 rounded px-2 py-1.5",value:i.fallbackValue!=null?String(i.fallbackValue):"",onChange:v=>_uc("fallbackValue",v.target.value)})]})
  ]}),
  (0,X.jsxs)("div",{className:"flex items-center gap-2",children:[
  (0,X.jsx)("input",{type:"checkbox",id:"retryOnError",className:"rounded text-indigo-600 w-4 h-4",checked:!!i.retryOnError,onChange:v=>_uc("retryOnError",v.target.checked)}),
  (0,X.jsx)("label",{htmlFor:"retryOnError",className:"text-xs text-slate-600 cursor-pointer",children:"\u5F02\u5E38\u65F6\u91CD\u8BD5\u4E00\u6B21 (retryOnError\uFF0C\u8D85\u65F6\u4E0D\u91CD\u8BD5)"})
  ]})
  ]}):null;
  ```

- [ ] **Step 2: 刷新浏览器，新建 ExternalDataSource 特征，检查参数配置显示：协议下拉（dubbo/http）、方法名、Dubbo配置区块（接口名、重试次数）**

- [ ] **Step 3: 切换协议为 http，检查配置区块变为 HTTP 配置（url、httpMethod、connectTimeoutMs）**

- [ ] **Step 4: 检查参数映射表格（添加行、删除行功能）、常量参数表格、结果路径、超时、降级值、retryOnError 复选框**

- [ ] **Step 5: Commit**

  ```bash
  git add app.js
  git commit -m "feat: 新增 ExternalDataSource 参数配置表单（protocol 联动 + Map 编辑器）"
  ```

---

## Task 10: 更新 paramPanel — 包含所有字段组

**Files:**
- Modify: `app.js` (锚点: `children:[aggFields,storageFields,offlineFields]`)

- [ ] **Step 1: 更新 paramPanel 的 children 数组**

  找到：
  ```
  children:[aggFields,storageFields,offlineFields]
  ```
  替换为：
  ```
  children:[aggFields,storageFields,historyFields,offlineFields,statefulFields,externalFields]
  ```

  > **注意：** `storageFields` 仍保留（渲染 DirectStorage 的 valueJsonPath + ttlSeconds 基础字段），`historyFields` 是新增的 HistoryStorage 专属块（含模式选择器）。两个块通过各自的 `s`/`isHistStorage` 条件控制显示，不会同时出现。

- [ ] **Step 2: 刷新浏览器，逐一切换特征类型，检查各类型参数配置区域仅显示对应字段：**
  - DirectStorage → valueJsonPath + ttlSeconds + writeMode（4选项）
  - HistoryStorage → 模式卡片 + 对应字段 + writeMode（2选项）
  - Aggregation → method + sourceFeatureName + timeWindowSeconds + timestampJsonPath
  - OfflineStorage → 全部 8 个字段
  - StatefulStorage → ttlSeconds + transitions 列表
  - ExternalDataSource → 全部字段

- [ ] **Step 3: Commit**

  ```bash
  git add app.js
  git commit -m "feat: paramPanel 接入全部 6 种特征类型配置字段"
  ```

---

## Task 11: 更新详情页 — 结构化只读展示

**Files:**
- Modify: `app.js` (锚点: `whitespace-pre leading-relaxed flex-1",children:e.calculationConfig`)

- [ ] **Step 1: 找到详情页 type flags**

  找到（在 line 42 的详情页渲染逻辑中）：
  ```
  o.type==="HistoryStorage",re=o.type==="OfflineStorage"
  ```
  修改为（扩展变量，加入新类型）：

  ```
  o.type==="HistoryStorage",re=o.type==="OfflineStorage",_isStateful=o.type==="StatefulStorage",_isExternal=o.type==="ExternalDataSource",_isDirStorage=o.type==="DirectStorage"
  ```

  > 注意：这行在 line 42（大行），需要用精确字符串定位。

- [ ] **Step 2: 找到 calculationConfig 原始渲染并替换为结构化展示**

  找到：
  ```
  whitespace-pre leading-relaxed flex-1",children:e.calculationConfig
  ```

  将整个包含 `whitespace-pre` 的渲染块替换为调用 `ftRenderForm` 的只读模式：

  ```
  flex-1",children:(0,B.jsx)("div",{className:"p-4",children:ftRenderForm(e,()=>{},  "view")})
  ```

  > **说明：** `ftRenderForm` 已有 `a === "edit"` 的判断。当 `a="view"` 时它走 view 分支渲染只读视图。需要确认 view 分支里 `calculationConfig` 的渲染是结构化的（见下方 Step 3）。

- [ ] **Step 3: 确认 ftRenderForm 的 view 分支存在结构化渲染**

  搜索 ftRenderForm 函数中 `if(r)` 之后的 else 分支（即 view 模式），找到 `calculationConfig` 的渲染方式。如果它仍然是 `children:e.calculationConfig` 裸文本，则需要在 view 分支中同样用 `aggFields`/`historyFields` 等字段块渲染——此时只需将字段中的 `onChange` 替换为 `()=>{}` 并把 input 改为只读属性即可。

  具体做法：在所有字段 input/select 上追加 `disabled:true` 或 `readOnly:true`（input 用 `readOnly`，select 用 `disabled`），由 `r`（edit mode flag）控制：

  在 `_uc` 定义之后的所有 input/select，将 `onChange` 的有效处理改为条件：
  ```
  onChange:r?v=>_uc("field",v.target.value):()=>{}
  ```
  select/input 追加：
  ```
  disabled:!r   // select
  readOnly:!r   // input
  ```
  这样同一套字段块在 `r=false`（view 模式）时自动变为只读。

- [ ] **Step 4: 刷新浏览器，点击任意特征进入详情页，检查参数配置区域显示结构化字段（非 JSON 字符串），且所有输入框不可编辑**

- [ ] **Step 5: 检查 StatefulStorage 详情页显示 TTL 字段和只读的 transitions 列表（无添加/删除按钮）**

- [ ] **Step 6: Commit**

  ```bash
  git add app.js
  git commit -m "feat: 详情页参数配置改为结构化只读展示"
  ```

---

## Self-Review

- **Spec coverage**: pd 枚举 ✓、展示名 ✓、列表图标 ✓、DirectStorage writeMode ✓、HistoryStorage 模式切换 + 补全字段 ✓、Aggregation timestampJsonPath ✓、OfflineStorage 5字段 ✓、StatefulStorage 全新 ✓、ExternalDataSource 全新 ✓、详情页只读 ✓
- **Placeholders**: Task 2 中 Globe 图标变量名需运行时确认，给出了查找方法
- **Type consistency**: 所有任务中 `_uc` 调用的字段名与 Java Bean 字段名一致
- **Scope**: BUCKET_AGGREGATION / DERIVED 明确不在范围内 ✓
