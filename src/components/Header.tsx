import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Shield, LogOut, Settings, Cog, Menu as MenuIcon } from 'lucide-react';
import { isAdmin, getRoleLabel } from '../types';
import AccountSettings from './AccountSettings';
import Logo from './Logo';

const Header: React.FC = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      // エラーはAuthContext内で処理済み
    }
  };

  const userRole = session?.role as any;
  const userIsAdmin = session ? isAdmin(userRole) : false;

  return (
    <>
      <header className="bg-gray-900 border-t-4 border-[#FFB85F] shadow-md">
        <div className="w-full px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg p-2 shadow-sm ring-2 ring-[#4A90E2]/20">
              <Logo size="lg" showText={false} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center">
                <span className="text-[#4A90E2]">File</span>
                <span className="text-[#FFB85F] ml-1">CLIP</span>
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide">SECURE FILE SHARING</p>
            </div>
          </div>

          {session && (
            <div className="flex items-center gap-3">
              {/* ユーザー情報表示 */}
              <div className="flex items-center text-sm bg-gray-800 text-gray-200 rounded-full px-4 py-1.5 border border-gray-700">
                {userIsAdmin ? (
                  <Shield size={16} className="mr-2 text-[#FFB85F]" />
                ) : (
                  <User size={16} className="mr-2 text-[#4A90E2]" />
                )}
                <span className="font-medium">{session.name}</span>
              </div>

              {/* 権限表示 */}
              <div className="hidden md:flex text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-md font-medium border border-gray-700">
                {getRoleLabel(userRole)}
              </div>

              {/* 統合メニュー */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-gray-800 text-gray-300 hover:text-white transition-colors focus:outline-none"
                  title="メニュー"
                >
                  <MenuIcon size={24} />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 text-gray-700 z-20 animate-fadeIn ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                        <p className="text-xs font-semibold text-gray-500">ログイン中</p>
                        <p className="text-sm font-medium truncate text-gray-900">{session.name}</p>
                        <p className="text-xs text-gray-500">{getRoleLabel(userRole)}</p>
                      </div>

                      {userIsAdmin && (
                        <button
                          onClick={() => {
                            navigate('/settings');
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center group"
                        >
                          <Cog size={16} className="mr-3 text-blue-600 group-hover:text-blue-700" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">管理者メニュー</div>
                            <div className="text-xs text-gray-500">ユーザー・組織設定</div>
                          </div>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowAccountSettings(true);
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center group"
                      >
                        <Settings size={16} className="mr-3 text-gray-500 group-hover:text-gray-700" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">アカウント設定</div>
                          <div className="text-xs text-gray-500">パスワード変更</div>
                        </div>
                      </button>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          handleSignOut();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center group"
                      >
                        <LogOut size={16} className="mr-3 group-hover:text-red-700" />
                        <span className="text-sm font-medium">ログアウト</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* アカウント設定モーダル */}
      {showAccountSettings && (
        <AccountSettings onClose={() => setShowAccountSettings(false)} />
      )}
    </>
  );
};

export default Header;
