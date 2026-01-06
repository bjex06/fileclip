import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog, Building2, Shield, Cog, ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isAdmin, getRoleLabel, UserRole } from '../types';
import { usePermission } from '../context/PermissionContext';
import UserManagementPanel from '../components/UserManagementPanel';
import OrganizationPanel from '../components/OrganizationPanel';
import PermissionSettingsPanel from '../components/PermissionSettingsPanel';
import SystemSettingsPanel from '../components/SystemSettingsPanel';

type SettingsTab = 'organization' | 'users' | 'permissions' | 'system';

const Settings: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');

  // 管理者権限チェック
  if (!session || !isAdmin(session.role as any)) {
    return null;
  }

  const userRole = session.role as UserRole;

  // 権限に応じてタブを表示
  const tabs = [
    // ユーザー管理権限のいずれかを持っていれば表示
    {
      id: 'users' as SettingsTab,
      label: 'ユーザー管理',
      icon: UserCog,
      description: 'ユーザーアカウントの管理',
      visible: hasPermission(userRole, 'manage_all_users') ||
        hasPermission(userRole, 'manage_branch_users') ||
        hasPermission(userRole, 'manage_dept_users')
    },
    // 営業所または部署の管理権限があれば表示
    {
      id: 'organization' as SettingsTab,
      label: '組織管理',
      icon: Building2,
      description: '営業所・部署の管理',
      visible: hasPermission(userRole, 'manage_branches') ||
        hasPermission(userRole, 'manage_departments')
    },
    // 権限設定（確認）は全管理者が閲覧可能
    {
      id: 'permissions' as SettingsTab,
      label: '権限設定',
      icon: Shield,
      description: 'ロールと権限の確認',
      visible: true
    },
    // システム設定
    {
      id: 'system' as SettingsTab,
      label: 'システム設定',
      icon: Cog,
      description: 'システム全体の設定',
      visible: hasPermission(userRole, 'system_settings')
    },
  ].filter(tab => tab.visible);

  // デフォルトタブを設定
  const defaultTab = tabs.length > 0 ? tabs[0].id : 'users';
  if (!tabs.find(t => t.id === activeTab)) {
    setActiveTab(defaultTab);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl opacity-50 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-orange-400/20 rounded-full blur-3xl opacity-50 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 bg-gray-900 border-t-4 border-[#FFB85F] shadow-md sticky top-0">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-gray-800 transition-all mr-4 text-gray-400 hover:text-white group"
              title="File CLIPに戻る"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <SettingsIcon size={22} className="text-[#FFB85F]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-none flex items-center">
                  <span className="text-[#4A90E2] mr-1">Admin</span>
                  <span className="text-white">Settings</span>
                </h1>
                <p className="text-xs text-gray-400 font-medium mt-0.5">システム管理コンソール</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center text-sm bg-gray-800 border border-gray-700 rounded-full pl-1 pr-4 py-1 shadow-sm">
              <div className="bg-gray-700 p-1.5 rounded-full mr-2">
                <Shield size={14} className="text-[#FFB85F]" />
              </div>
              <span className="font-medium text-gray-200">{session.name}</span>
            </div>
            <span className="text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700 px-3 py-1.5 rounded-full shadow-md">
              {getRoleLabel(userRole)}
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-8 h-[calc(100vh-73px)]">
        <div className="flex flex-col md:flex-row h-full gap-6">

          {/* サイドバーナビゲーション */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/50 p-4 h-full md:h-auto sticky top-24">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Menu</div>
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center p-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white shadow-md shadow-[#64D2C3]/25'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-[#4ABFB0]'
                      }`}
                  >
                    <div className={`mr-3 p-1.5 rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-[#64D2C3]/10'
                      }`}>
                      <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-[#64D2C3]'} />
                    </div>
                    <div className="text-left">
                      <div className="leading-none mb-1">{tab.label}</div>
                      <div className={`text-[10px] ${activeTab === tab.id ? 'text-white/80' : 'text-gray-400'}`}>
                        {tab.description}
                      </div>
                    </div>
                    {activeTab === tab.id && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full"></div>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div className="flex-1 h-full overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-8">
              {activeTab === 'users' && (
                <div className="animate-fadeIn">
                  <UserManagementPanel />
                </div>
              )}
              {activeTab === 'organization' && (hasPermission(userRole, 'manage_branches') || hasPermission(userRole, 'manage_departments')) && (
                <div className="animate-fadeIn">
                  <OrganizationPanel fullWidth />
                </div>
              )}
              {activeTab === 'permissions' && (
                <div className="animate-fadeIn">
                  <PermissionSettingsPanel />
                </div>
              )}
              {activeTab === 'system' && hasPermission(userRole, 'system_settings') && (
                <div className="animate-fadeIn">
                  <SystemSettingsPanel />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
