# EntityEditor 容器组件重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将接入点(gz)的编辑模式抽取为 EntityEditor 公共容器组件，统一所有 5 个实体页面的编辑体验。

**Architecture:** 单文件 bundled React 应用（app.js），所有组件在同一文件内。重构直接操作 app.js，通过字符串匹配定位组件边界。新增 EntityEditor 容器组件 + VersionHistoryPanel 公共组件，替代 9 个独立详情/编辑组件，各页面只提供 renderForm 函数。

**Tech Stack:** React 19 (bundled)、Tailwind CSS (CDN)、Lucide React icons

**重要约束：** 本项目是纯静态分发包，app.js 是由 esbuild 打包的单文件 bundle（~1MB，528行）。无 src 目录、无构建工具、无测试框架。所有代码修改直接在 app.js 中进行。由于代码经过 minification（变量名被压缩为单字母），需通过唯一字符串片段定位代码位置。验证方式为浏览器手动测试。

---

## 文件结构

所有修改集中在单个文件：

- **Modify:** `app.js` — 全部组件代码所在的 bundle 文件

组件位置索引（以 char offset 为标识）：

| 组件 | 角色 | 位置 | 操作 |
|------|------|------|------|
| `ON` | 接入点默认数据工厂 | char 683665 | 保留 |
| `gz` | 接入点详情/编辑 | char 683888 | **拆解为 EntityEditor 模板** |
| `mz` | 特征详情 | char 651414 | **废弃，合并到特征 renderForm** |
| `pz` | 特征编辑 | char 627900 | **废弃，合并到特征 renderForm** |
| `vz` | 策略详情 | char 720208 | **废弃，合并到策略 renderForm** |
| `yz` | 策略编辑 | char 732523 | **废弃，合并到策略 renderForm** |
| `Sz` | 规则详情 | char 763775 | **废弃，合并到规则 renderForm** |
| `Az` | 规则编辑 | char 788551 | **废弃，合并到规则 renderForm** |
| `Ez` | 动作详情 | char 822326 | **废弃，合并到动作 renderForm** |
| `kz` | 动作编辑 | char 831140 | **废弃，合并到动作 renderForm** |
| `xz` | 接入点列表 | char 701003 | **改为引用 EntityEditor** |
| `hz` | 特征列表 | char 665509 | **改为 LIST/VIEW 两态** |
| `bz` | 策略列表 | char 744257 | **改为 LIST/VIEW 两态** |
| `Nz` | 规则列表 | char 805211 | **改为 LIST/VIEW 两态** |
| `Tz` | 动作列表 | char 839804 | **改为 LIST/VIEW 两态** |
| `Lz` | 条件表达式树编辑器 | char 782488 | **保留不动** |

React 模块别名：
- `qt` = React（gz 使用）
- `Fa` = React（hz 使用）
- `on` = React（pz 使用）
- `ln` = React（xz 使用）
- `DN` = React（yz 使用）
- JSX 工厂各组件使用不同别名（`Q`, `X`, `$`, `B`, `de`, `W`, `ee`, `ae` 等）

Mock 数据数组：
- `rn` = 接入点数据, `lz` = 接入点版本
- `eo` = 特征数据, `hd` = 特征版本
- `gr` = 策略数据, `jv` = 策略版本
- `Or` = 规则数据, `Uv` = 规则版本
- `Ks` = 动作数据, `Hv` = 动作版本

---

## 实施策略

由于这是一个压缩后的 bundle 文件，逐字符编辑风险很高。采用以下策略：

1. **先在 gz 之前插入 EntityEditor 和 VersionHistoryPanel 作为新组件**
2. **逐页面替换：** 先改接入点（验证 EntityEditor 可用），再逐个改其他页面
3. **每改一个页面后浏览器验证**，确认功能正常再继续
4. **最后清理废弃组件**

每个 Task 对应一个实体页面的完整改造 + 验证。

---

### Task 1: 创建 EntityEditor 和 VersionHistoryPanel 公共组件

**Files:**
- Modify: `app.js` — 在 `gz` 组件定义之前插入新组件

- [ ] **Step 1: 定位插入点**

在 app.js 中找到 `gz=({item:e,initialMode:t,onBack:a,onSave:r})` 的位置。在 gz 定义之前（即 `ON=()=>` 之前）插入 EntityEditor 和 VersionHistoryPanel。

搜索定位字符串: `,ON=()=>({eventPoint:""`

- [ ] **Step 2: 插入 VersionHistoryPanel 组件**

在 `,ON=()=>` 之前插入以下代码（使用 `qt` 作为 React 别名，`X` 作为 JSX 工厂，与 gz 保持一致）：

```javascript
,VersionHistoryPanel=({versions:e,selectedVersionId:t,onSelectVersion:a})=>{return e.length===0?(0,X.jsx)("div",{className:"text-sm text-slate-400 text-center py-8",children:"\u6682\u65E0\u5386\u53F2\u7248\u672C"}):(0,X.jsx)("div",{className:"space-y-2",children:e.map(r=>(0,X.jsxs)("div",{className:`p-3 rounded-lg border cursor-pointer transition-colors ${t===r.id?"bg-indigo-50 border-indigo-200":"bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`,onClick:()=>a(r),children:[(0,X.jsxs)("div",{className:"flex items-center justify-between mb-1",children:[(0,X.jsxs)("span",{className:"text-sm font-semibold text-slate-800",children:["v",r.version]}),(0,X.jsx)("span",{className:"text-[10px] text-slate-400",children:r.createAt})]}),(0,X.jsx)("div",{className:"text-xs text-slate-500 mb-1",children:r.commitMessage||"\u65E0\u7248\u672C\u8BF4\u660E"}),(0,X.jsx)("div",{className:"text-[10px] text-slate-400",children:r.editor})]},r.id))})}
```

- [ ] **Step 3: 插入 EntityEditor 容器组件**

在 VersionHistoryPanel 之后、`ON=()=>` 之前插入 EntityEditor。这是核心组件，包含：
- view/edit 模式管理
- 脏检测（useRef + JSON.stringify）
- guardDirty 确认弹窗
- 双按钮保存（草稿 + 待发布）
- 版本说明输入
- 版本历史面板
- 保存成功弹窗

```javascript
,EntityEditor=({item:e,initialMode:t,versions:a,onSave:r,onBack:n,onAddToDrafts:o,entityType:i,getTargetName:l,getRelatedKeys:s,renderForm:u,validate:c,title:d,renderStatus:f})=>{let _$=e||{},p=e===null,[h,m]=(0,qt.useState)(t),[y,g]=(0,qt.useState)(_$),[x,v]=(0,qt.useState)(_$),S=(0,qt.useRef)(t==="edit"?JSON.stringify(_$):""),[C,b]=(0,qt.useState)(null),[I,_]=(0,qt.useState)(!1),[j,k]=(0,qt.useState)(null),[re,L]=(0,qt.useState)(p?"\u521D\u59CB\u521B\u5EFA":""),M=(0,qt.useCallback)(()=>JSON.stringify(x)!==S.current,[x]),O=(0,qt.useCallback)(()=>{let w={...y};v(w),S.current=JSON.stringify(w),b(null),L(""),m("edit")},[y]),G=(0,qt.useCallback)(w=>{M()?k(()=>w):w()},[M]),N=(0,qt.useCallback)(()=>{if(p){M()?k(()=>n):n();return}G(()=>{m("view")})},[p,M,G,n]),T=(0,qt.useCallback)(()=>{h==="edit"?G(n):n()},[h,G,n]),F=(0,qt.useCallback)(w=>{h==="edit"?G(()=>{b(w.id);let R={...w.content,id:y.id};v(R);S.current=JSON.stringify(R);L("")}):(b(w.id),g({...w.content,id:y.id}))},[h,y.id,G]),P=(0,qt.useCallback)((w,R)=>{v(Z=>({...Z,[w]:R}))},[]),A=(0,qt.useCallback)(()=>{if(c){let w=c(x);if(w){alert(w);return}}let w=r({...x,lifecycleState:"DRAFT",updateAt:new Date().toISOString().replace("T"," ").slice(0,19)});g(w),_(!0)},[x,r,c]),E=(0,qt.useCallback)(()=>{if(c){let w=c(x);if(w){alert(w);return}}let w={...x,id:x.id||Date.now(),lifecycleState:"READY",updateAt:new Date().toISOString().replace("T"," ").slice(0,19)},R=r(w);g(R),o({id:`DFT-${Date.now()}-${R.id}`,type:i,targetId:R.id,targetName:l(R),version:"vNext",relatedKeys:s(R),updatedAt:R.updateAt,editor:"current_user",changeSummary:re||(p?"\u521D\u59CB\u521B\u5EFA":"\u66F4\u65B0\u914D\u7F6E")}),_(!0)},[x,r,o,i,l,s,re,p,c]),Y=(0,qt.useCallback)(()=>{let w=j;k(null),w==null||w()},[j]),U=(0,qt.useCallback)(()=>{k(null)},[]),z=(0,qt.useCallback)(()=>{_(!1),m("view")},[]),me=(0,qt.useCallback)(()=>{_(!1),n()},[n]),H=h==="edit",we=()=>(0,X.jsxs)("div",{className:"flex items-center justify-between",children:[(0,X.jsxs)("div",{className:"flex items-center space-x-4",children:[(0,X.jsx)("button",{onClick:T,className:"p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500",children:(0,X.jsx)(na,{className:"w-5 h-5"})}),(0,X.jsxs)("div",{children:[(0,X.jsxs)("h2",{className:"text-xl font-bold text-slate-900 flex items-center gap-3",children:[H&&p?"\u65B0\u5EFA"+i:(0,X.jsxs)(X.Fragment,{children:[(0,X.jsx)("span",{className:"font-mono",children:d?d(y):""}),f&&f(y)]}),H&&(0,X.jsxs)("span",{className:"bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs border border-slate-200 flex items-center",children:[(0,X.jsx)(lt,{className:"w-3 h-3 mr-1"}),"\u7F16\u8F91\u4E2D"]})]}),!H&&y.description&&(0,X.jsx)("div",{className:"text-sm text-slate-500 mt-0.5",children:y.description})]})]}),(0,X.jsx)("div",{className:"flex gap-3",children:H?(0,X.jsxs)(X.Fragment,{children:[(0,X.jsx)("button",{type:"button",onClick:N,className:"px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors",children:"\u53D6\u6D88"}),(0,X.jsxs)("button",{type:"button",onClick:A,className:"flex items-center px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors",children:[(0,X.jsx)(Yr,{className:"w-4 h-4 mr-2"}),"\u4FDD\u5B58\u8349\u7A3F"]}),(0,X.jsxs)("button",{type:"button",onClick:E,className:"flex items-center px-5 py-2 text-sm font-bold text-white bg-indigo-600 border border-transparent rounded hover:bg-indigo-700 shadow-sm transition-colors",children:[(0,X.jsx)(Fe,{className:"w-4 h-4 mr-2"}),"\u63D0\u4EA4\u5F85\u53D1\u5E03"]})]}):(0,X.jsxs)("button",{onClick:O,className:"flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors shadow-sm font-medium",children:[(0,X.jsx)(et,{className:"w-4 h-4 mr-2"}),"\u7F16\u8F91"]})})]}),xe=()=>j?(0,X.jsx)("div",{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50",children:(0,X.jsxs)("div",{className:"bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4",children:[(0,X.jsx)("h3",{className:"text-lg font-semibold text-slate-900 mb-2",children:"\u786E\u8BA4"}),(0,X.jsx)("p",{className:"text-sm text-slate-600 mb-6",children:"\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF0C\u786E\u5B9A\u8981\u653E\u5F03\u5417\uFF1F"}),(0,X.jsxs)("div",{className:"flex justify-end gap-3",children:[(0,X.jsx)("button",{onClick:U,className:"px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50",children:"\u53D6\u6D88"}),(0,X.jsx)("button",{onClick:Y,className:"px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700",children:"\u786E\u5B9A"})]})]})}):null,J=()=>I?(0,X.jsx)("div",{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50",children:(0,X.jsxs)("div",{className:"bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4 text-center",children:[(0,X.jsx)(We,{className:"w-12 h-12 text-green-500 mx-auto mb-3"}),(0,X.jsx)("h3",{className:"text-lg font-semibold text-slate-900 mb-4",children:"\u4FDD\u5B58\u6210\u529F"}),(0,X.jsxs)("div",{className:"flex justify-center gap-3",children:[(0,X.jsx)("button",{onClick:z,className:"px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50",children:"\u7EE7\u7EED\u7F16\u8F91"}),(0,X.jsx)("button",{onClick:me,className:"px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700",children:"\u8FD4\u56DE\u5217\u8868"})]})]})}):null;return(0,X.jsxs)("div",{className:"space-y-6 animate-in fade-in duration-300",children:[we(),(0,X.jsxs)("div",{className:"flex gap-6",children:[(0,X.jsxs)("div",{className:"flex-1 min-w-0 space-y-6",children:[u(H?x:y,P,h),H&&(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-6",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-4 flex items-center gap-2",children:[(0,X.jsx)(lt,{className:"w-5 h-5 text-indigo-500"}),"\u7248\u672C\u8BF4\u660E"]}),(0,X.jsx)("textarea",{className:"w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px]",value:re,onChange:w=>L(w.target.value),placeholder:"\u8BF7\u8F93\u5165\u672C\u6B21\u4FEE\u6539\u7684\u7248\u672C\u8BF4\u660E..."})]})]}),...(a.length>0||!p?[(0,X.jsxs)("div",{className:"w-72 shrink-0",children:[(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-4 sticky top-4",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-4 flex items-center gap-2 text-sm",children:[(0,X.jsx)(vt,{className:"w-4 h-4 text-indigo-500"}),"\u7248\u672C\u5386\u53F2"]}),(0,X.jsx)(VersionHistoryPanel,{versions:a,selectedVersionId:C,onSelectVersion:F})]})]})]:[])]}),xe(),J()]})}
```

- [ ] **Step 4: 验证插入无语法错误**

在浏览器中打开 `index.html`，打开开发者工具 Console，确认没有 JavaScript 语法错误。此时 EntityEditor 和 VersionHistoryPanel 已定义但尚未被引用，页面应正常显示。

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: 新增 EntityEditor 和 VersionHistoryPanel 公共组件"
```

---

### Task 2: 接入点页面改造（gz → EntityEditor）

**Files:**
- Modify: `app.js` — 修改 xz 组件中对 gz 的引用，改为使用 EntityEditor

- [ ] **Step 1: 创建接入点 renderForm 函数**

在 EntityEditor 之后、`ON=()=>` 之前插入接入点的 renderForm。需要从 gz 中提取表单字段渲染逻辑（基本信息卡片 + 关联信息面板）。

搜索定位字符串: `,ON=()=>({eventPoint:""`

在其之前插入：

```javascript
,epRenderStatus=e=>{let r=t=>{switch(t){case"DRAFT":return(0,X.jsxs)("span",{className:"bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center border border-slate-200 w-fit",children:[(0,X.jsx)(lt,{className:"w-3 h-3 mr-1"}),"\u8349\u7A3F"]});case"READY":return(0,X.jsxs)("span",{className:"bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs flex items-center border border-purple-200 w-fit",children:[(0,X.jsx)(Fe,{className:"w-3 h-3 mr-1"}),"\u5F85\u53D1\u5E03"]});case"PUBLISHED":return(0,X.jsxs)("span",{className:"bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs flex items-center border border-green-200 w-fit",children:[(0,X.jsx)(We,{className:"w-3 h-3 mr-1"}),"\u5DF2\u53D1\u5E03"]});case"ARCHIVED":return(0,X.jsxs)("span",{className:"bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs flex items-center border border-orange-200 w-fit",children:[(0,X.jsx)(Ht,{className:"w-3 h-3 mr-1"}),"\u5386\u53F2\u5F52\u6863"]})}};return(0,X.jsxs)(X.Fragment,{children:[r(e.lifecycleState),(0,X.jsxs)("span",{className:`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${e.status===1?"bg-green-50 text-green-700 border-green-100":"bg-red-50 text-red-700 border-red-100"}`,children:[(0,X.jsx)("span",{className:`w-1.5 h-1.5 rounded-full mr-1.5 ${e.status===1?"bg-green-500":"bg-red-400"}`}),fe(e.status)]})]})},epRenderForm=(e,t,a)=>{let r=a==="edit",n=!!(e.id),o=gr.filter(i=>i.eventPoint===e.eventPoint),l=eo.filter(i=>i.eventPoints.includes(e.eventPoint));return r?(0,X.jsxs)("div",{className:"space-y-6",children:[(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-6",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3",children:[(0,X.jsx)(Ra,{className:"w-5 h-5 text-indigo-500"}),"\u57FA\u672C\u4FE1\u606F"]}),(0,X.jsx)("div",{className:"max-w-[800px]",children:(0,X.jsxs)("form",{className:"space-y-6",children:[(0,X.jsxs)("div",{children:[(0,X.jsxs)("label",{className:"block text-sm font-medium text-slate-700 mb-2",children:["\u63A5\u5165\u70B9\u7F16\u7801 ",(0,X.jsx)("span",{className:"text-red-500",children:"*"})]}),(0,X.jsx)("input",{type:"text",required:!0,className:"w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500",value:e.eventPoint,onChange:i=>t("eventPoint",i.target.value),placeholder:"\u8BF7\u8F93\u5165\u552F\u4E00\u7F16\u7801\uFF0C\u5982 EP00000005",disabled:n}),!n&&(0,X.jsx)("p",{className:"mt-1 text-xs text-slate-400",children:"\u7CFB\u7EDF\u552F\u4E00\u6807\u8BC6\uFF0C\u521B\u5EFA\u540E\u4E0D\u53EF\u4FEE\u6539\u3002"})]}),(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-sm font-medium text-slate-700 mb-2",children:"\u63CF\u8FF0"}),(0,X.jsx)("textarea",{className:"w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px]",value:e.description,onChange:i=>t("description",i.target.value),placeholder:"\u8BF7\u8F93\u5165\u63A5\u5165\u70B9\u7684\u4E2D\u6587\u63CF\u8FF0..."})]}),(0,X.jsxs)("div",{children:[(0,X.jsx)("label",{className:"block text-sm font-medium text-slate-700 mb-2",children:"\u8FD0\u884C\u72B6\u6001"}),(0,X.jsxs)("div",{className:"flex items-center gap-4",children:[(0,X.jsx)("button",{type:"button",onClick:()=>t("status",e.status===1?2:1),className:`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${e.status===1?"bg-indigo-600":"bg-slate-300"}`,children:(0,X.jsx)("span",{className:`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${e.status===1?"translate-x-6":"translate-x-1"}`})}),(0,X.jsx)("span",{className:`text-sm font-medium ${e.status===1?"text-green-600":"text-red-500"}`,children:fe(e.status)})]})]})]})})]})]})]}):(0,X.jsxs)("div",{className:"space-y-6",children:[(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-6",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3",children:[(0,X.jsx)(Ra,{className:"w-5 h-5 text-indigo-500"}),"\u57FA\u672C\u4FE1\u606F"]}),(0,X.jsxs)("div",{className:"grid grid-cols-2 gap-y-6 gap-x-8 text-sm",children:[(0,X.jsxs)("div",{className:"space-y-1.5",children:[(0,X.jsx)("span",{className:"text-slate-500 block text-xs",children:"\u63A5\u5165\u70B9\u7F16\u7801"}),(0,X.jsx)("span",{className:"font-medium text-slate-900 font-mono select-all bg-slate-50 px-1 rounded",children:e.eventPoint})]}),(0,X.jsxs)("div",{className:"space-y-1.5",children:[(0,X.jsx)("span",{className:"text-slate-500 block text-xs",children:"\u63CF\u8FF0"}),(0,X.jsx)("span",{className:"font-medium text-slate-900",children:e.description})]}),(0,X.jsxs)("div",{className:"space-y-1.5",children:[(0,X.jsx)("span",{className:"text-slate-500 block text-xs",children:"\u521B\u5EFA\u65F6\u95F4"}),(0,X.jsx)("span",{className:"font-medium text-slate-700 font-mono text-xs",children:e.createAt||"-"})]}),(0,X.jsxs)("div",{className:"space-y-1.5",children:[(0,X.jsx)("span",{className:"text-slate-500 block text-xs",children:"\u6700\u540E\u66F4\u65B0"}),(0,X.jsx)("span",{className:"font-medium text-slate-700 font-mono text-xs",children:e.updateAt||"-"})]}),(0,X.jsxs)("div",{className:"space-y-1.5",children:[(0,X.jsx)("span",{className:"text-slate-500 block text-xs",children:"\u64CD\u4F5C\u4EBA"}),(0,X.jsx)("span",{className:"font-medium text-slate-900",children:e.operator||"-"})]})]})]}),o.length>0&&(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-6",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3",children:[(0,X.jsx)(Ir,{className:"w-5 h-5 text-orange-500"}),"\u5173\u8054\u7B56\u7565 (",o.length,")"]}),(0,X.jsx)("div",{className:"space-y-2",children:o.map(i=>(0,X.jsxs)("div",{className:"flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100",children:[(0,X.jsxs)("div",{children:[(0,X.jsx)("span",{className:"font-medium text-sm text-slate-800",children:i.name}),(0,X.jsx)("span",{className:"text-xs text-slate-400 ml-2",children:i.description})]}),(0,X.jsx)("span",{className:`text-xs px-2 py-0.5 rounded ${i.status===1?"bg-green-50 text-green-600":"bg-red-50 text-red-600"}`,children:fe(i.status)})]},i.id||i.name))})]}),l.length>0&&(0,X.jsxs)("div",{className:"bg-white rounded-lg border border-slate-200 shadow-sm p-6",children:[(0,X.jsxs)("h3",{className:"font-semibold text-slate-900 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3",children:[(0,X.jsx)(Ra,{className:"w-5 h-5 text-blue-500"}),"\u5173\u8054\u7279\u5F81 (",l.length,")"]}),(0,X.jsx)("div",{className:"space-y-2",children:l.map(i=>(0,X.jsxs)("div",{className:"flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100",children:[(0,X.jsxs)("div",{children:[(0,X.jsx)("span",{className:"font-medium text-sm font-mono text-slate-800",children:i.name}),(0,X.jsx)("span",{className:"text-xs text-slate-400 ml-2",children:i.description})]}),(0,X.jsx)("span",{className:`text-xs px-2 py-0.5 rounded ${i.status===1?"bg-green-50 text-green-600":"bg-red-50 text-red-600"}`,children:fe(i.status)})]},i.id||i.name))})]})]})},epValidate=e=>{if(!e.eventPoint||!e.eventPoint.trim())return"\u8BF7\u8F93\u5165\u63A5\u5165\u70B9\u7F16\u7801";return null}
```

- [ ] **Step 2: 修改 xz 列表组件中对 gz 的引用**

在 xz 组件中找到渲染 gz 的位置。搜索定位字符串:

`r==="VIEW")return(0,$.jsx)(gz,{item:o,initialMode:l,onBack:j,onSave:k})`

替换为:

```javascript
r==="VIEW"){let Z_=o?lz.filter(Z__=>Z__.eventPointId===o.id):[];return(0,$.jsx)(EntityEditor,{item:o,initialMode:l,versions:Z_,onSave:k,onBack:j,onAddToDrafts:e,entityType:"EVENT_POINT",getTargetName:Z__=>Z__.eventPoint,getRelatedKeys:Z__=>Z__.eventPoint,renderForm:epRenderForm,validate:epValidate,title:Z__=>Z__.eventPoint,renderStatus:epRenderStatus})}
```

- [ ] **Step 3: 浏览器验证接入点页面**

在浏览器中打开 index.html，执行以下验证：
1. 接入点列表 → 点击"查看" → 应显示 view 模式（只读字段 + 关联面板 + 版本历史）
2. 点击"编辑" → 应切换到 edit 模式（表单字段可编辑 + 版本说明 + 双按钮）
3. 修改描述 → 点击取消 → 应弹出"有未保存的修改"确认框
4. 编辑模式 → 点击历史版本 → 应加载版本内容
5. 加载版本后 → 再点击另一个版本 → 不应弹确认框（快照已更新）
6. 点击"保存草稿" → 应弹"保存成功"
7. 点击"提交待发布" → 应弹"保存成功"并加入发布清单
8. 新建接入点 → 编码字段可编辑，保存后应出现在列表中

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "refactor: 接入点页面改用 EntityEditor 容器组件"
```

---

### Task 3: 特征页面改造（mz+pz → EntityEditor）

**Files:**
- Modify: `app.js` — 在 EntityEditor 相关代码附近插入特征 renderForm，修改 hz 列表组件

- [ ] **Step 1: 阅读 pz 和 mz 的完整代码**

使用 python3 脚本提取 pz（char 627900 到 651414）和 mz（char 651414 到 665509）的完整代码，理解：
- pz 的表单字段：name、description、type、eventPoints、compositeKeyJsonPaths、calculationConfig
- pz 的 type 联动逻辑（Aggregation 时显示 calculationConfig）
- mz 的只读展示逻辑
- 两个组件使用的 React 别名（`on`/`Fa` 和 JSX 工厂 `B`/`Q`）

```bash
python3 -c "
with open('app.js','r') as f: content=f.read()
print('=== pz ===')
print(content[627900:651414])
print('=== mz ===')
print(content[651414:665509])
" > /tmp/feature_components.txt
```

- [ ] **Step 2: 创建特征 renderForm 函数**

在 `epValidate` 之后插入特征相关的 renderForm、renderStatus、validate 函数。搜索定位字符串: `,ON=()=>({eventPoint:""`

在其之前插入 `ftRenderStatus`、`ftRenderForm`、`ftValidate`。

`ftRenderForm` 需要包含：
- **编辑模式：** name（已有时 disabled）、描述、type 下拉、eventPoints 输入（逗号分隔）、compositeKeyJsonPaths 数组（type 相关时显示）、calculationConfig（Aggregation 时显示）
- **查看模式：** 以上字段的只读展示 + 关联版本历史列表

注意：pz 中的 compositeKeyJsonPaths 和 calculationConfig 使用了独立的 useState（变量 `m,y` 和 `g,x`）。由于 EntityEditor 的 renderForm 是纯函数不能有自己的 hooks，需要将这些数据序列化到 form 的对应字段中，在 renderForm 内解析显示。onChange 时直接更新 form 的 JSON 字符串字段。

代码结构：
```javascript
,ftRenderStatus=e=>{/* 与 epRenderStatus 相同的生命周期+状态徽章 */}
,ftRenderForm=(e,t,a)=>{
  let r=a==="edit",n=!!(e.id);
  // 解析 compositeKeyJsonPaths 和 calculationConfig
  let o=[];try{o=JSON.parse(e.compositeKeyJsonPaths||"[]")}catch{}
  let i={};try{i=JSON.parse(e.calculationConfig||"{}")}catch{}
  let l=e.type==="Aggregation",s=e.type==="DirectStorage"||e.type==="HistoryStorage";
  // ... 编辑态/查看态渲染
}
,ftValidate=e=>{if(!e.name||!e.name.trim())return"请输入特征名";return null}
```

完整的 renderForm 实现需要从 pz 和 mz 中提取所有字段渲染逻辑。由于代码量较大（pz 约 23KB，mz 约 14KB），实施时需要逐字段提取并适配 `(form, onChange, mode)` 签名。

- [ ] **Step 3: 修改 hz 列表组件**

在 hz 组件中，找到 DETAIL 和 EDIT 的路由逻辑。搜索定位字符串:

`r==="EDIT")return(0,Q.jsx)(pz,{initialFeature:o,onSave:j,onCancel:I,onAddToDrafts:e});if(r==="DETAIL"&&o)return(0,Q.jsx)(mz,{feature:o,onBack:I,onEdit:b})`

替换为:

```javascript
r==="VIEW"){let Z_=o&&o.id?hd.filter(Z__=>Z__.featureId===o.id):[];return(0,Q.jsx)(EntityEditor,{item:o,initialMode:l,versions:Z_,onSave:j,onBack:()=>{n("LIST"),i(null),s(new Set)},onAddToDrafts:e,entityType:"FEATURE",getTargetName:Z__=>Z__.name,getRelatedKeys:Z__=>(Z__.eventPoints||[]).join(", "),renderForm:ftRenderForm,validate:ftValidate,title:Z__=>Z__.name,renderStatus:ftRenderStatus})}
```

同时修改 hz 中"查看"和"编辑"按钮的 handler：
- 原来的 `S`（查看）调用 `n("DETAIL")`，改为 `n("VIEW")` 并设 `l` 为 `"view"`
- 原来的 `b`（编辑）调用 `n("EDIT")`，改为 `n("VIEW")` 并设 `l` 为 `"edit"`
- 原来的 `C`（新建）调用 `n("EDIT")`，改为 `n("VIEW")` 并设 `l` 为 `"edit"`

在 hz 中需要增加一个 mode 子状态（参考 xz 的 `l` 变量），用于区分 view/edit。

搜索 hz 中的状态定义：`hz=({onAddToDrafts:e})=>{let[t,a]=(0,Fa.useState)(eo),[r,n]=(0,Fa.useState)("LIST"),[o,i]=(0,Fa.useState)(null)`

在 `[o,i]` 后插入 `,[Gn,Gm]=(0,Fa.useState)("view")`，然后将上面的 `initialMode:l` 改为 `initialMode:Gn`，并修改查看/编辑/新建 handler 设置 `Gm("view")` 或 `Gm("edit")`。

- [ ] **Step 4: 浏览器验证特征页面**

在浏览器中执行以下验证：
1. 特征列表 → 点击"查看" → view 模式（只读字段显示）
2. 点击"编辑" → edit 模式（所有字段可编辑，type 联动正常）
3. 修改字段 → 取消 → 应弹确认框
4. 编辑模式 → 切换历史版本 → 加载版本内容
5. 保存草稿 / 提交待发布均正常
6. 新建特征正常

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "refactor: 特征页面改用 EntityEditor 容器组件"
```

---

### Task 4: 策略页面改造（vz+yz → EntityEditor）

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 阅读 yz 和 vz 的完整代码**

```bash
python3 -c "
with open('app.js','r') as f: content=f.read()
print('=== vz ===')
print(content[720208:732523])
print('=== yz ===')
print(content[732523:744257])
" > /tmp/activation_components.txt
```

理解：
- yz 的 thresholds 动态表格（增删行，每行 name+score）
- vz 的只读展示（关联规则列表、所属接入点）
- yz 使用 `DN` 作为 React 别名，`de` 作为 JSX 工厂

- [ ] **Step 2: 创建策略 renderForm 函数**

在 `ftValidate` 之后、`ON=()=>` 之前插入 `actRenderStatus`、`actRenderForm`、`actValidate`。

`actRenderForm` 需要包含：
- **编辑模式：** name、描述、eventPoint 下拉（从 rn 数据）、priority、thresholds 动态表格
- **查看模式：** 只读展示 + 关联规则列表 + 所属接入点信息

thresholds 编辑逻辑：renderForm 是纯函数，但 thresholds 操作（增删行、修改 score）可以通过 onChange 直接操作 form.thresholds 数组：
```javascript
// 修改某行
onChange("thresholds", form.thresholds.map((th,idx) => idx===targetIdx ? {...th, [field]: value} : th))
// 增加行
onChange("thresholds", [...form.thresholds.slice(0,-1), {name:"",score:newScore}, form.thresholds[form.thresholds.length-1]])
// 删除行
onChange("thresholds", form.thresholds.filter((_,idx) => idx!==targetIdx))
```

validate: name 不能为空，eventPoint 不能为空

- [ ] **Step 3: 修改 bz 列表组件**

在 bz 中找到 DETAIL/EDIT 路由逻辑。搜索定位字符串:

`r==="EDIT")return(0,W.jsx)(yz,{initialActivation:o,onSave:_,onCancel:I});if(r==="DETAIL"&&o)return(0,W.jsx)(vz,{activation:o,onBack:I,onEdit:b})`

替换为 EntityEditor 引用（与 Task 3 的 hz 改法类似）。同时为 bz 增加 mode 子状态。

- [ ] **Step 4: 浏览器验证策略页面**

验证项：view/edit 切换、thresholds 增删行、脏检测、版本切换、双按钮保存。

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "refactor: 策略页面改用 EntityEditor 容器组件"
```

---

### Task 5: 规则页面改造（Sz+Az → EntityEditor）

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 阅读 Az 和 Sz 的完整代码**

```bash
python3 -c "
with open('app.js','r') as f: content=f.read()
print('=== Sz ===')
print(content[763775:782488])
print('=== Az ===')
print(content[788551:805211])
" > /tmp/rule_components.txt
```

理解：
- Az 的条件表达式树编辑器（引用 Lz 组件）
- Az 的 actions 列表编辑
- Sz 的只读展示

- [ ] **Step 2: 创建规则 renderForm 函数**

在策略相关代码之后、`ON=()=>` 之前插入 `ruleRenderStatus`、`ruleRenderForm`、`ruleValidate`。

`ruleRenderForm` 需要包含：
- **编辑模式：** name、描述、initScore/max、条件树编辑器（Lz）、actions 列表
- **查看模式：** 只读展示

注意：Az 中条件树使用了独立的 useState（condition state）。由于 renderForm 不能有 hooks，条件树数据需要存在 form 的一个字段中（如 `form.condition`），Lz 组件的 update 回调通过 `onChange("condition", newCondition)` 传递。

validate: name 不能为空

- [ ] **Step 3: 修改 Nz 列表组件**

搜索 Nz 中对 Sz 和 Az 的引用，替换为 EntityEditor。同时为 Nz 增加 mode 子状态。

- [ ] **Step 4: 浏览器验证规则页面**

验证项：view/edit 切换、条件树编辑器正常、actions 配置正常、脏检测、版本切换、双按钮保存。

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "refactor: 规则页面改用 EntityEditor 容器组件"
```

---

### Task 6: 动作页面改造（Ez+kz → EntityEditor）

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 阅读 kz 和 Ez 的完整代码**

```bash
python3 -c "
with open('app.js','r') as f: content=f.read()
print('=== Ez ===')
print(content[822326:831140])
print('=== kz ===')
print(content[831140:839804])
" > /tmp/action_components.txt
```

理解：
- kz 的 configSchema JSON 编辑器
- Ez 的只读展示（关联的规则列表、版本历史）

- [ ] **Step 2: 创建动作 renderForm 函数**

在规则相关代码之后、`ON=()=>` 之前插入 `actionRenderStatus`、`actionRenderForm`、`actionValidate`。

`actionRenderForm` 需要包含：
- **编辑模式：** name、描述、type 下拉、configSchema JSON 编辑器
- **查看模式：** 只读展示 + 关联规则列表

validate: name 不能为空

- [ ] **Step 3: 修改 Tz 列表组件**

搜索 Tz 中对 Ez 和 kz 的引用，替换为 EntityEditor。同时为 Tz 增加 mode 子状态。

- [ ] **Step 4: 浏览器验证动作页面**

验证项：view/edit 切换、JSON 编辑器正常、脏检测、版本切换、双按钮保存。

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "refactor: 动作页面改用 EntityEditor 容器组件"
```

---

### Task 7: 清理废弃组件 + 全面验证

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 确认废弃组件无引用**

使用 grep 确认以下组件不再被引用：gz、mz、pz、vz、yz、Sz、Az、Ez、kz。

```bash
for comp in gz mz pz vz yz Sz Az Ez kz; do
  echo "=== $comp ==="
  python3 -c "
with open('app.js','r') as f: c=f.read()
import re
# Skip the definition itself, look for references
for m in re.finditer(r'(?<![a-zA-Z])${comp}(?![a-zA-Z=])', c):
    print(f'  ref at {m.start()}: ...{c[max(0,m.start()-30):m.start()+50]}...')
"
done
```

- [ ] **Step 2: 删除废弃组件代码**

逐个删除 gz、mz、pz、vz、yz、Sz、Az、Ez、kz 的组件定义代码。每个组件通过其边界 char offset 定位，删除从组件定义开始到下一个组件定义之前的代码。

注意：删除后 char offset 会变化，需要从后往前删除（先删 kz，再删 Ez，...最后删 pz），或者使用字符串匹配定位而非 offset。

- [ ] **Step 3: 全面浏览器验证**

逐个页面验证完整功能：

**接入点：**
- [ ] 列表筛选、批量操作正常
- [ ] 查看模式：基本信息、关联策略/特征、版本历史
- [ ] 编辑模式：字段编辑、脏检测、版本切换保护
- [ ] 保存草稿、提交待发布
- [ ] 新建接入点

**特征：**
- [ ] 列表筛选、批量操作正常
- [ ] 查看模式：所有字段只读展示
- [ ] 编辑模式：type 联动、compositeKeyJsonPaths、calculationConfig
- [ ] 脏检测、版本切换保护、双按钮保存

**策略：**
- [ ] 列表筛选、批量操作正常
- [ ] 查看模式：关联规则、所属接入点
- [ ] 编辑模式：thresholds 增删行
- [ ] 脏检测、版本切换保护、双按钮保存

**规则：**
- [ ] 列表筛选、批量操作正常
- [ ] 查看模式：条件树、actions 只读展示
- [ ] 编辑模式：条件树编辑器、actions 配置
- [ ] 脏检测、版本切换保护、双按钮保存

**动作：**
- [ ] 列表筛选、批量操作正常
- [ ] 查看模式：configSchema 展示
- [ ] 编辑模式：JSON 编辑器
- [ ] 脏检测、版本切换保护、双按钮保存

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "refactor: 清理废弃的独立详情/编辑组件"
```
