import React, { useState, useEffect } from 'react';
import { User as UserIcon, Shield, UserPlus, Mail, Trash2, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useFileSystem } from '../context/FileSystemContext';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../context/PermissionContext';
import { fileSystemApi } from '../utils/fileSystemApi';
import { User, Branch, Department, UserRole, getRoleLabel } from '../types';

interface UserFormModalProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    branchId?: string;
    departmentId?: string;
  };
  branches: Branch[];
  departments: Department[];
  onClose: () => void;
  onSave: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, branches, departments, onClose, onSave }) => {
  const { createUser, updateUser } = useFileSystem();

  const { session } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user?.role as UserRole || 'user');
  const [branchId, setBranchId] = useState(user?.branchId || '');
  const [departmentId, setDepartmentId] = useState(user?.departmentId || '');
  const [loading, setLoading] = useState(false);

  // 現在のユーザーの権限レベル
  const currentUserRole = session?.role as UserRole;

  // 選択可能な権限（自分以下の権限のみ）
  const getAvailableRoles = (): { value: UserRole; label: string }[] => {
    const allRoles: { value: UserRole; label: string }[] = [
      { value: 'user', label: '一般ユーザー' },
      { value: 'department_admin', label: '部署管理者' },
      { value: 'branch_admin', label: '営業所管理者' },
      { value: 'super_admin', label: '全権管理者' },
    ];

    // 権限階層に基づいてフィルタリング
    const roleHierarchy: Record<UserRole, number> = {
      'user': 1,
      'department_admin': 2,
      'branch_admin': 3,
      'super_admin': 4
    };

    const currentLevel = roleHierarchy[currentUserRole] || 1;
    return allRoles.filter(r => roleHierarchy[r.value] <= currentLevel);
  };

  // 選択可能な部署（選択した営業所に属する部署のみ）
  const availableDepartments = departments.filter(
    d => d.isActive && (!branchId || d.branchId === branchId || !d.branchId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error('名前とメールアドレスは必須です');
      return;
    }

    if (!user && !password.trim()) {
      toast.error('パスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      if (user) {
        // 更新
        await updateUser(user.id, {
          name,
          role,
          branch_id: branchId,
          department_id: departmentId
        });
      } else {
        await createUser({
          email,
          password,
          name,
          role,
          branch_id: branchId || undefined,
          department_id: departmentId || undefined
        });
      }
      onSave();
      onClose();
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false);
    }
  };

  // フォーム初期値の設定：管理者権限に応じて固定
  useEffect(() => {
    if (!user && session) {
      if (currentUserRole === 'branch_admin') {
        setBranchId(session.branchId || '');
      } else if (currentUserRole === 'department_admin') {
        setBranchId(session.branchId || '');
        setDepartmentId(session.departmentId || '');
      }
    }
  }, [user, session, currentUserRole]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <UserIcon size={18} className="mr-2 text-[#64D2C3]" />
            {user ? 'ユーザーを編集' : 'ユーザーを追加'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="山田太郎"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="yamada@example.com"
              required
              disabled={!!user}
            />
          </div>

          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="8文字以上"
                minLength={8}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              権限
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getAvailableRoles().map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所属営業所
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setDepartmentId('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={currentUserRole === 'branch_admin' || currentUserRole === 'department_admin'}
            >
              <option value="">未設定</option>
              {branches.filter(b => b.isActive).map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.code && `(${branch.code})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所属部署
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={currentUserRole === 'department_admin'}
            >
              <option value="">未設定</option>
              {availableDepartments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.branchName && `[${dept.branchName}] `}{dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagementPanel: React.FC = () => {
  const { session } = useAuth();
  const { users, deleteUser, refreshUsers } = useFileSystem();
  const { hasPermission } = usePermission();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchRes, deptRes] = await Promise.all([
        fileSystemApi.getBranches(),
        fileSystemApi.getDepartments()
      ]);

      // ユーザーデータもAPIから取得して同期
      await refreshUsers();

      if (session) {
        const userRole = session.role as UserRole;

        // 営業所データのフィルタリング
        if (branchRes.success && branchRes.data) {
          let filteredBranches = branchRes.data;
          // 全ユーザー管理権限がない場合、自分の営業所のみ
          if (!hasPermission(userRole, 'manage_all_users')) {
            filteredBranches = branchRes.data.filter(b => b.id === session.branchId);
          }
          setBranches(filteredBranches);
        }

        // 部署データのフィルタリング
        if (deptRes.success && deptRes.data) {
          let filteredDepts = deptRes.data;
          if (!hasPermission(userRole, 'manage_all_users')) {
            if (hasPermission(userRole, 'manage_branch_users')) {
              // 自営業所の部署のみ
              filteredDepts = deptRes.data.filter(d => d.branchId === session.branchId);
            } else if (hasPermission(userRole, 'manage_dept_users')) {
              // 自部署のみ
              filteredDepts = deptRes.data.filter(d => d.id === session.departmentId);
            }
          }
          setDepartments(filteredDepts);
        }
      }
    } catch (error) {
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session, hasPermission]);

  const handleDeleteUser = async (user: { id: string; name: string; role: string }) => {
    // super_admin は削除不可
    if (user.role === 'super_admin') {
      toast.error('全権管理者は削除できません');
      return;
    }
    if (!confirm(`ユーザー「${user.name}」を削除してもよろしいですか？`)) return;

    try {
      await deleteUser(user.id);
      toast.success('ユーザーを削除しました');
    } catch (error) {
      toast.error('削除に失敗しました');
    }
  };

  const filteredUsers = users.filter(user => {
    // 基本的な検索フィルタ
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 権限スコープフィルタ
    if (!session) return false;
    const currentUserRole = session.role as UserRole;

    if (hasPermission(currentUserRole, 'manage_all_users')) {
      return true; // 全員見える
    } else if (hasPermission(currentUserRole, 'manage_branch_users')) {
      // 自営業所のユーザーのみ
      return user.branchId === session.branchId;
    } else if (hasPermission(currentUserRole, 'manage_dept_users')) {
      // 自部署のユーザーのみ
      return user.departmentId === session.departmentId;
    }

    return false;
  });

  const canAddUser = session && (
    hasPermission(session.role as UserRole, 'manage_all_users') ||
    hasPermission(session.role as UserRole, 'manage_branch_users') ||
    hasPermission(session.role as UserRole, 'manage_dept_users')
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <UserIcon size={22} className="mr-2 text-[#64D2C3]" />
          ユーザー管理
        </h2>
        {canAddUser && (
          <button
            onClick={() => setShowUserForm(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
          >
            <UserPlus size={18} className="mr-2" />
            ユーザーを追加
          </button>
        )}
      </div>

      {/* 検索 */}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ユーザー名またはメールで検索..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '検索結果がありません' : '表示できるユーザーがいません（権限を確認してください）'}
          </div>
        ) : (
          filteredUsers.map(user => {
            const isAdminRole = ['super_admin', 'branch_admin', 'department_admin'].includes(user.role);
            const roleColors: Record<string, string> = {
              super_admin: 'bg-purple-100 text-purple-700',
              branch_admin: 'bg-blue-100 text-blue-700',
              department_admin: 'bg-green-100 text-green-700',
              user: 'bg-gray-100 text-gray-700'
            };

            return (
              <div
                key={user.id}
                onClick={() => {
                  // 全権管理者は編集不可などの制限が必要ならここでチェック
                  // ただし自分自身は編集できたほうがいい？
                  // 要件: 「該当ユーザーのカードをクリックしたら編集できるようにして」
                  if (canAddUser) {
                    setEditingUser(user);
                    setShowUserForm(true);
                  }
                }}
                className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${showUserForm && editingUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
              >
                <div className="flex items-center pointer-events-none"> {/* 子要素のクリックで発火しないように制御、あるいはdiv全体がclickableならOK */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdminRole ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                    {isAdminRole ? (
                      <Shield size={20} className="text-blue-600" />
                    ) : (
                      <UserIcon size={20} className="text-gray-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Mail size={14} className="mr-1" />
                      {user.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || roleColors.user}`}>
                    {getRoleLabel(user.role as UserRole)}
                  </span>

                  {user.role !== 'super_admin' && canAddUser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUser(user);
                      }}
                      className="p-2 hover:bg-red-100 rounded text-red-500"
                      title="削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ユーザー追加モーダル */}
      {showUserForm && (
        <UserFormModal
          user={editingUser || undefined}
          branches={branches}
          departments={departments}
          onClose={() => {
            setShowUserForm(false);
            setEditingUser(null);
          }}
          onSave={() => fetchData()}
        />
      )}
    </div>
  );
};

export default UserManagementPanel;
