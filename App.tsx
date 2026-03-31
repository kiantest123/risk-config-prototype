
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Zap, Shield, AlertTriangle, Menu, User, Bell, BookOpen,
  ChevronDown, ChevronRight, Database, Layers, Search, FileText,
  List, ShoppingCart, Lock, ArrowRight, X, CheckCircle2,
  Globe, Target, GitBranch, Play
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { PolicyManager } from './components/PolicyManager';
import { OverridesManager } from './components/OverridesManager';
import { FeatureList } from './components/FeatureList';
import { EventPointList } from './components/EventPointList';
import { ActivationList } from './components/ActivationList';
import { RuleList } from './components/RuleList';
import { ActionList } from './components/ActionList';
import { ReleaseCandidates, ReleaseOrderList } from './components/ReleaseOrderManager';
import { HelpModal } from './components/HelpModal';
import { mockPolicies, mockOverrides, mockReleaseOrders, mockDrafts } from './mockData';
import { AnyPolicy, PolicyType, ReleaseOrder, DraftItem } from './types';
import { helpContent } from './helpContent';

// ------------------- 类型定义 -------------------

type MenuItem = {
  key: string;
  label: string;
  icon?: React.ElementType;
  children?: MenuItem[];
};

// ------------------- 菜单配置 -------------------

const menuConfig: MenuItem[] = [
  {
    key: 'dashboard',
    label: '监控大盘',
    icon: LayoutDashboard,
  },
  {
    key: 'data-config',
    label: '数据配置',
    icon: Database,
    children: [
      { key: 'event-points', label: '接入点管理', icon: Globe },
      { key: 'feature-list', label: '特征管理', icon: Layers },
    ],
  },
  {
    key: 'decision-config',
    label: '决策配置',
    icon: Target,
    children: [
      { key: 'activations', label: '策略管理', icon: GitBranch },
      { key: 'rules', label: '规则管理', icon: Zap },
      { key: 'actions', label: '动作管理', icon: Play },
    ],
  },
  {
    key: 'risk-control',
    label: '风控策略',
    icon: Shield,
    children: [
      { key: 'circuit-breakers', label: '服务熔断策略', icon: Zap },
      { key: 'guardrails', label: '业务护栏策略', icon: Shield },
      { key: 'overrides', label: '手动干预管理', icon: AlertTriangle },
    ],
  },
  {
    key: 'release-management',
    label: '发布管理',
    icon: FileText,
    children: [
       { key: 'release-candidates', label: '待发布清单', icon: ShoppingCart },
       { key: 'release-orders', label: '发布单列表', icon: List }
    ]
  }
];

// ------------------- 主应用组件 -------------------

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['data-config', 'decision-config', 'risk-control', 'release-management']);
  const [policies, setPolicies] = useState(mockPolicies);
  const [overrides, setOverrides] = useState(mockOverrides);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Release Management State (Lifted Up)
  const [releaseOrders, setReleaseOrders] = useState(mockReleaseOrders);
  const [drafts, setDrafts] = useState(mockDrafts);
  
  // Success Modal State for Release Order Creation
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; order: ReleaseOrder | null }>({
    isOpen: false,
    order: null
  });

  // ------------------- 业务逻辑处理 -------------------

  const handleSavePolicy = (updatedPolicy: AnyPolicy) => {
    setPolicies(prev => {
      const idx = prev.findIndex(p => p.policyId === updatedPolicy.policyId);
      if (idx >= 0) {
        const newPolicies = [...prev];
        newPolicies[idx] = updatedPolicy;
        return newPolicies;
      }
      return [...prev, updatedPolicy];
    });
    console.log("Saving policy to backend...", updatedPolicy);
    // 模拟 AntD Message
    alert("策略配置已推送至风控引擎 (模拟)");
  };

  const handleDeletePolicy = (id: string) => {
    if(confirm("确定要删除该策略吗？该操作不可恢复。")) {
      setPolicies(prev => prev.filter(p => p.policyId !== id));
    }
  };

  const handleDeleteOverride = (id: string) => {
     if(confirm("确定要立即移除该手动干预配置吗？")) {
      setOverrides(prev => prev.filter(o => o.id !== id));
     }
  };

  const handleCreateReleaseOrder = (newOrder: ReleaseOrder) => {
    setReleaseOrders(prev => [newOrder, ...prev]);
    // Optionally: Remove used drafts here if needed
    // Show the success modal instead of switching tabs immediately
    setSuccessModal({ isOpen: true, order: newOrder });
  };
  
  const handleUpdateOrder = (updatedOrder: ReleaseOrder) => {
      setReleaseOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleAddToDrafts = (item: DraftItem) => {
    setDrafts(prev => {
      // Avoid duplicates
      if (prev.some(d => d.type === item.type && d.targetId.toString() === item.targetId.toString())) {
        return prev;
      }
      return [item, ...prev];
    });
    alert(`已将【${item.targetName}】加入待发布清单`);
  };

  // ------------------- 菜单操作逻辑 -------------------

  const toggleSubMenu = (key: string) => {
    setExpandedMenus(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.children) {
      toggleSubMenu(item.key);
    } else {
      setActiveTab(item.key);
      // Mobile close
      setIsMobileMenuOpen(false);
    }
  };

  // ------------------- 渲染辅助 -------------------

  const renderBreadcrumb = () => {
    let parentLabel = '';
    let currentLabel = '';

    menuConfig.forEach(item => {
      if (item.key === activeTab) {
        currentLabel = item.label;
      } else if (item.children) {
        const child = item.children.find(c => c.key === activeTab);
        if (child) {
          parentLabel = item.label;
          currentLabel = child.label;
        }
      }
    });

    return (
      <nav className="flex text-sm text-slate-500 mb-4" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <span className="hover:text-slate-700">风控配置平台</span>
          </li>
          {parentLabel && (
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="ml-1 text-slate-500 md:ml-2">{parentLabel}</span>
              </div>
            </li>
          )}
          <li aria-current="page">
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="ml-1 text-slate-900 font-medium md:ml-2">{currentLabel}</span>
            </div>
          </li>
        </ol>
      </nav>
    );
  };

  // ------------------- 核心渲染 -------------------

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex font-sans">
      {/* Sidebar (Ant Design Dark Style) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#001529] text-slate-300 transition-transform duration-300 ease-in-out transform 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 md:static md:flex-shrink-0 flex flex-col shadow-xl
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 bg-[#002140] shadow-sm">
          <div className="flex items-center gap-2 font-bold text-white text-xl tracking-tight">
            <Shield className="w-6 h-6 text-[#1890ff]" />
            <span>风控<span className="text-[#1890ff]">配置平台</span></span>
          </div>
        </div>
        
        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1">
            {menuConfig.map(item => {
              const isActive = item.key === activeTab;
              const isExpanded = expandedMenus.includes(item.key);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <li key={item.key}>
                  {/* Parent Item */}
                  <div 
                    onClick={() => handleMenuClick(item)}
                    className={`
                      flex items-center justify-between px-6 py-3 cursor-pointer transition-colors select-none
                      ${!hasChildren && isActive ? 'bg-[#1890ff] text-white' : 'hover:text-white text-slate-400 hover:bg-[#ffffff15]'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon && <item.icon className={`w-4 h-4 ${!hasChildren && isActive ? 'text-white' : ''}`} />}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    {hasChildren && (
                      <ChevronDown 
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                      />
                    )}
                  </div>

                  {/* Children Items */}
                  {hasChildren && isExpanded && (
                    <ul className="bg-[#000c17] py-2">
                      {item.children!.map(child => {
                        const isChildActive = child.key === activeTab;
                        return (
                          <li key={child.key}>
                            <div 
                              onClick={() => handleMenuClick(child)}
                              className={`
                                flex items-center px-6 pl-12 py-2.5 cursor-pointer text-sm transition-colors
                                ${isChildActive ? 'bg-[#1890ff] text-white' : 'text-slate-400 hover:text-white hover:bg-[#ffffff15]'}
                              `}
                            >
                              <span className="flex-1">{child.label}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-[#ffffff15] bg-[#001529]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[#1890ff] flex items-center justify-center text-white font-bold text-xs shadow-md">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">管理员</p>
              <p className="text-xs text-slate-500 truncate">在线</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center text-slate-500 text-sm gap-2">
              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs border border-green-200">生产环境</span>
              <span className="text-slate-300">|</span>
              <span>v2.5.0</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="relative hidden sm:block">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="全局搜索..." 
                  className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-md text-sm focus:ring-2 focus:ring-[#1890ff] w-48 transition-all focus:w-64 outline-none"
                />
             </div>

             <button 
               onClick={() => setIsHelpOpen(true)}
               className="text-slate-500 hover:text-[#1890ff] transition-colors"
               title="文档"
             >
               <BookOpen className="w-5 h-5" />
             </button>

             <button className="relative text-slate-500 hover:text-[#1890ff] transition-colors">
               <Bell className="w-5 h-5" />
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            {/* Breadcrumb */}
            {renderBreadcrumb()}

            {/* Page Title & Description */}
            <div className="mb-6">
               <h1 className="text-2xl font-semibold text-[#000000d9]">
                 {menuConfig.flatMap(m => m.children ? m.children : m).find(m => m.key === activeTab)?.label}
               </h1>
            </div>

            {/* Content Body */}
            <div className="animate-in fade-in duration-300 slide-in-from-bottom-2">
              {activeTab === 'dashboard' && <Dashboard />}
              
              {activeTab === 'circuit-breakers' && (
                <PolicyManager 
                  type={PolicyType.CIRCUIT_BREAKER} 
                  policies={policies}
                  onSave={handleSavePolicy}
                  onDelete={handleDeletePolicy}
                />
              )}
              
              {activeTab === 'guardrails' && (
                <PolicyManager 
                  type={PolicyType.GUARDRAIL} 
                  policies={policies}
                  onSave={handleSavePolicy}
                  onDelete={handleDeletePolicy}
                />
              )}

              {activeTab === 'overrides' && (
                <OverridesManager 
                  overrides={overrides}
                  onDelete={handleDeleteOverride}
                />
              )}

              {/* Data Config: Event Points */}
              {activeTab === 'event-points' && (
                <EventPointList onAddToDrafts={handleAddToDrafts} />
              )}

              {/* Data Config: Features */}
              {activeTab === 'feature-list' && (
                <FeatureList onAddToDrafts={handleAddToDrafts} />
              )}

              {/* Decision Config: Activations */}
              {activeTab === 'activations' && (
                <ActivationList onAddToDrafts={handleAddToDrafts} />
              )}

              {/* Decision Config: Rules */}
              {activeTab === 'rules' && (
                <RuleList onAddToDrafts={handleAddToDrafts} />
              )}

              {/* Decision Config: Actions */}
              {activeTab === 'actions' && (
                <ActionList onAddToDrafts={handleAddToDrafts} />
              )}
              
              {/* Release Management */}
              {activeTab === 'release-candidates' && (
                <ReleaseCandidates 
                  drafts={drafts} 
                  onCreateOrder={handleCreateReleaseOrder} 
                />
              )}
              {activeTab === 'release-orders' && (
                <ReleaseOrderList orders={releaseOrders} onUpdateOrder={handleUpdateOrder} />
              )}
            </div>
          </div>
        </main>

        <HelpModal 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
          content={helpContent[activeTab as keyof typeof helpContent] || '# 暂无文档\n此页面暂无详细操作文档。'} 
        />
        
        {/* Release Order Success Modal */}
        {successModal.isOpen && successModal.order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col items-center">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">发布单创建成功！</h3>
               <p className="text-sm text-slate-500 mb-6 text-center">
                 您的变更请求已生成，请前往发布单列表跟踪审批进度。
               </p>
               
               <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 w-full mb-6">
                 <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">发布单号</div>
                 <div className="font-mono font-bold text-lg text-slate-800 select-all">{successModal.order.id}</div>
                 <div className="text-sm text-slate-600 mt-2 truncate">{successModal.order.title}</div>
               </div>
               
               <div className="flex w-full gap-3">
                  <button 
                    onClick={() => setSuccessModal({ isOpen: false, order: null })}
                    className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    返回待发布清单
                  </button>
                  <button 
                    onClick={() => {
                      setSuccessModal({ isOpen: false, order: null });
                      setActiveTab('release-orders');
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    进入发布单列表
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
