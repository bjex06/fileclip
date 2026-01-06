import React, { useState } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { useAuth } from '../context/AuthContext';
import { User, Shield, UserPlus, Mail, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole, isAdmin, isSuperAdmin, getRoleLabel } from '../types';

interface UserDetailsModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
  const { deleteUser, currentUser } = useFileSystem();
  
  const handleDeleteUser = async () => {
    if (confirm(`ユーザー「${user.name}」を削除してもよろしいですか？`)) {
      await deleteUser(user.id);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <User size={18} className="mr-2 text-blue-600" />
            ユーザー詳細
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              {isAdmin(user.role as UserRole) ? (
                <Shield size={32} className="text-blue-600" />
              ) : (
                <User size={32} className="text-blue-600" />
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">名前</label>
              <p className="text-lg font-medium">{user.name}</p>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">メールアドレス</label>
              <p className="text-lg font-medium flex items-center">
                <Mail size={16} className="mr-2 text-gray-400" />
                {user.email}
              </p>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">権限</label>
              <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                isAdmin(user.role as UserRole)
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {isAdmin(user.role as UserRole) ? (
                  <>
                    <Shield size={14} className="mr-1" />
                    {getRoleLabel(user.role as UserRole)}
                  </>
                ) : (
                  <>
                    <User size={14} className="mr-1" />
                    一般ユーザー
                  </>
                )}
              </p>
            </div>
          </div>

          {/* 削除ボタンを追加 (管理者のみ表示、super_adminは削除不可) */}
          {isAdmin(currentUser.role as UserRole) && !isSuperAdmin(user.role as UserRole) && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={handleDeleteUser}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ユーザーを削除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserPanel: React.FC = () => {
  const { users, currentUser, createUser } = useFileSystem();
  const { session } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
  } | null>(null);

  // 管理者には全ユーザーを表示、一般ユーザーには自分のみを表示
  const filteredUsers = isAdmin(session?.role as UserRole)
    ? users
    : users.filter(user => user.id === session?.id);

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('すべての項目を入力してください');
      return;
    }

    try {
      await createUser({
        email: newUserEmail,
        password: newUserPassword,
        name: newUserName,
        role: newUserRole
      });
      setShowAddForm(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
    } catch (error) {
      // Error is already handled in createUser
    }
  };
  
  // タイトルを変更 (一般ユーザーにはプロフィールとして表示)
  const panelTitle = isAdmin(session?.role as UserRole) ? 'ユーザー一覧' : 'プロフィール';
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 transition-all">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center">
          <User size={18} className="mr-2 text-blue-600" />
          {panelTitle}
        </h2>
        
        {isAdmin(session?.role as UserRole) && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="ユーザー追加"
          >
            <UserPlus size={16} />
          </button>
        )}
      </div>

      {showAddForm && isAdmin(session?.role as UserRole) && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100 animate-fadeIn">
          <div className="space-y-3">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="ユーザー名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="メールアドレス"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="パスワード"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="user">一般ユーザー</option>
              <option value="department_admin">部署管理者</option>
              <option value="branch_admin">営業所管理者</option>
              {isSuperAdmin(session?.role as UserRole) && (
                <option value="super_admin">全権管理者</option>
              )}
            </select>
          </div>

          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleAddUser}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserRole('user');
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
      
      <ul className="space-y-1">
        {filteredUsers.map(user => (
          <li
            key={user.id}
            onClick={() => setSelectedUser({
              id: user.id,
              name: user.name,
              email: user.id, // Using ID as email since it's stored that way
              role: user.role
            })}
            className="flex items-center p-2 rounded border border-transparent hover:bg-gray-50 cursor-pointer"
          >
            {isAdmin(user.role as UserRole) ? (
              <Shield size={18} className="mr-2 text-blue-600" />
            ) : (
              <User size={18} className="mr-2 text-gray-600" />
            )}

            <span className="flex-1 truncate">{user.name}</span>

            <span className={`text-xs px-2 py-0.5 rounded ${
              isAdmin(user.role as UserRole)
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {getRoleLabel(user.role as UserRole)}
            </span>
          </li>
        ))}
      </ul>

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
};

export default UserPanel;