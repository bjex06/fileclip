import React, { useState, useEffect } from 'react';
import { X, User, Building2, Users, Shield, Eye, Edit, Trash2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { fileSystemApi } from '../utils/fileSystemApi';
import { FolderPermissions, PermissionLevel, PermissionTargetType, Branch, Department, User as UserType, UserRole, isAdmin } from '../types';
import { useAuth } from '../context/AuthContext';

interface FolderPermissionModalProps {
  folderId: string;
  folderName: string;
  onClose: () => void;
}

const permissionLabels: Record<PermissionLevel, { label: string; icon: React.ReactNode; color: string }> = {
  view: { label: '閲覧', icon: <Eye size={14} />, color: 'bg-gray-100 text-gray-700' },
  edit: { label: '編集', icon: <Edit size={14} />, color: 'bg-blue-100 text-blue-700' },
  manage: { label: '管理', icon: <Shield size={14} />, color: 'bg-purple-100 text-purple-700' }
};

const FolderPermissionModal: React.FC<FolderPermissionModalProps> = ({ folderId, folderName, onClose }) => {
  const { session } = useAuth();
  const [permissions, setPermissions] = useState<FolderPermissions>({ users: [], branches: [], departments: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'departments'>('users');

  // 追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTargetType, setAddTargetType] = useState<PermissionTargetType>('user');
  const [addTargetIds, setAddTargetIds] = useState<string[]>([]);
  const [addPermissionLevel, setAddPermissionLevel] = useState<PermissionLevel>('view');

  // 選択肢データ
  const [users, setUsers] = useState<UserType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const [permRes, userRes, branchRes, deptRes] = await Promise.all([
        fileSystemApi.getFolderPermissions(folderId),
        fileSystemApi.getUsers(),
        fileSystemApi.getBranches(),
        fileSystemApi.getDepartments()
      ]);

      if (permRes.success && permRes.data) setPermissions(permRes.data);
      if (userRes.success && userRes.data) setUsers(userRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
    } catch (error) {
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [folderId]);

  // 権限付与
  const handleGrant = async () => {
    if (addTargetIds.length === 0) {
      toast.error('対象を選択してください');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const targetId of addTargetIds) {
        const res = await fileSystemApi.grantFolderPermission({
          folderId,
          targetType: addTargetType,
          targetId: targetId,
          permissionLevel: addPermissionLevel
        });

        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}件の権限を付与しました${failCount > 0 ? `（${failCount}件失敗）` : ''}`);
        setShowAddForm(false);
        setAddTargetIds([]);
        fetchData();
      } else {
        toast.error('権限の付与に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  // 権限取消
  const handleRevoke = async (targetType: PermissionTargetType, targetId: string, targetName: string) => {
    if (!confirm(`「${targetName}」の権限を取り消しますか？`)) return;

    try {
      const res = await fileSystemApi.revokeFolderPermission({
        folderId,
        targetType,
        targetId
      });

      if (res.success) {
        toast.success('権限を取り消しました');
        fetchData();
      } else {
        toast.error(res.error || '権限の取消に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  // 既に権限があるIDを除外した選択肢を取得
  const getAvailableTargets = () => {
    switch (addTargetType) {
      case 'user':
        const existingUserIds = new Set(permissions.users.map(p => p.userId));
        return users.filter(u => !existingUserIds.has(u.id) && u.isActive);
      case 'branch':
        const existingBranchIds = new Set(permissions.branches.map(p => p.branchId));
        return branches.filter(b => !existingBranchIds.has(b.id) && b.isActive);
      case 'department':
        const existingDeptIds = new Set(permissions.departments.map(p => p.departmentId));
        return departments.filter(d => !existingDeptIds.has(d.id) && d.isActive);
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center">
              <Shield size={18} className="mr-2 text-purple-600" />
              権限管理
            </h2>
            <p className="text-sm text-gray-500 mt-1">フォルダ: {folderName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b px-4">
          <button
            onClick={() => {
              setActiveTab('users');
              setAddTargetType('user');
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <User size={16} className="inline mr-1" />
            ユーザー ({permissions.users.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('branches');
              setAddTargetType('branch');
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'branches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Building2 size={16} className="inline mr-1" />
            営業所 ({permissions.branches.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('departments');
              setAddTargetType('department');
              setShowAddForm(false);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'departments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <Users size={16} className="inline mr-1" />
            部署 ({permissions.departments.length})
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : (
            <>
              {/* 全権管理者向けメッセージ */}
              {session?.role === 'super_admin' && (
                <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start">
                  <Shield size={18} className="text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium">全権管理者としてアクセス中</p>
                    <p className="mt-1">
                      あなたは全権管理者のため、このリストの設定に関わらずすべての権限を持っています。
                      特定のユーザーに権限を明示的に付与したい場合のみ、ここから追加してください。
                    </p>
                  </div>
                </div>
              )}

              {/* ユーザータブ */}
              {activeTab === 'users' && (
                <div className="space-y-3">
                  {permissions.users.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 mb-2">ユーザー権限がありません</p>
                      {isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('user');
                            setShowAddForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center w-full"
                        >
                          <Plus size={16} className="mr-1" />
                          ユーザーを追加する
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {permissions.users.map(perm => (
                        <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center">
                            <User size={18} className="mr-2 text-gray-500" />
                            <div>
                              <div className="font-medium">{perm.userName}</div>
                              {perm.userEmail && (
                                <div className="text-xs text-gray-500">{perm.userEmail}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`flex items-center px-2 py-1 rounded text-xs ${permissionLabels[perm.permissionLevel].color}`}>
                              {permissionLabels[perm.permissionLevel].icon}
                              <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                            </span>
                            <button
                              onClick={() => handleRevoke('user', perm.userId, perm.userName)}
                              className="p-1 hover:bg-red-100 rounded text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!showAddForm && isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('user');
                            setShowAddForm(true);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center"
                        >
                          <Plus size={16} className="mr-1" />
                          ユーザーを追加
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 営業所タブ */}
              {activeTab === 'branches' && (
                <div className="space-y-3">
                  {permissions.branches.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 mb-2">営業所権限がありません</p>
                      {isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('branch');
                            setShowAddForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center w-full"
                        >
                          <Plus size={16} className="mr-1" />
                          営業所を追加する
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {permissions.branches.map(perm => (
                        <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center">
                            <Building2 size={18} className="mr-2 text-blue-500" />
                            <div>
                              <div className="font-medium">{perm.branchName}</div>
                              {perm.branchCode && (
                                <div className="text-xs text-gray-500">{perm.branchCode}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`flex items-center px-2 py-1 rounded text-xs ${permissionLabels[perm.permissionLevel].color}`}>
                              {permissionLabels[perm.permissionLevel].icon}
                              <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                            </span>
                            <button
                              onClick={() => handleRevoke('branch', perm.branchId, perm.branchName)}
                              className="p-1 hover:bg-red-100 rounded text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!showAddForm && isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('branch');
                            setShowAddForm(true);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center"
                        >
                          <Plus size={16} className="mr-1" />
                          営業所を追加
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 部署タブ */}
              {activeTab === 'departments' && (
                <div className="space-y-3">
                  {permissions.departments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 mb-2">部署権限がありません</p>
                      {isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('department');
                            setShowAddForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center w-full"
                        >
                          <Plus size={16} className="mr-1" />
                          部署を追加する
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {permissions.departments.map(perm => (
                        <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center">
                            <Users size={18} className="mr-2 text-green-500" />
                            <div>
                              <div className="font-medium">{perm.departmentName}</div>
                              <div className="text-xs text-gray-500">
                                {perm.branchName || '全社共通'}
                                {perm.departmentCode && ` (${perm.departmentCode})`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`flex items-center px-2 py-1 rounded text-xs ${permissionLabels[perm.permissionLevel].color}`}>
                              {permissionLabels[perm.permissionLevel].icon}
                              <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                            </span>
                            <button
                              onClick={() => handleRevoke('department', perm.departmentId, perm.departmentName)}
                              className="p-1 hover:bg-red-100 rounded text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {!showAddForm && isAdmin(session?.role as UserRole) && (
                        <button
                          onClick={() => {
                            setAddTargetType('department');
                            setShowAddForm(true);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center"
                        >
                          <Plus size={16} className="mr-1" />
                          部署を追加
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 追加フォーム */}
        {showAddForm && (
          <div className="border-t p-4 bg-gray-50">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象タイプ</label>
                  <select
                    value={addTargetType}
                    onChange={(e) => {
                      setAddTargetType(e.target.value as PermissionTargetType);
                      setAddTargetIds([]); // Clear selection on type change
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                  >
                    <option value="user">ユーザー</option>
                    <option value="branch">営業所</option>
                    <option value="department">部署</option>
                  </select>
                </div>

                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">権限</label>
                  <select
                    value={addPermissionLevel}
                    onChange={(e) => setAddPermissionLevel(e.target.value as PermissionLevel)}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                  >
                    <option value="view">閲覧</option>
                    <option value="edit">編集</option>
                    <option value="manage">管理</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">追加する対象を選択 ({addTargetIds.length})</label>
                  <button
                    type="button"
                    onClick={() => {
                      const available = getAvailableTargets();
                      if (addTargetIds.length === available.length) {
                        setAddTargetIds([]);
                      } else {
                        setAddTargetIds(available.map((t: any) => t.id));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {addTargetIds.length === getAvailableTargets().length ? 'すべて解除' : 'すべて選択'}
                  </button>
                </div>
                <div className="border rounded-md max-h-48 overflow-y-auto bg-white p-2">
                  {getAvailableTargets().length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      追加可能な候補がありません
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {getAvailableTargets().map((t: any) => (
                        <label key={t.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addTargetIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddTargetIds([...addTargetIds, t.id]);
                              } else {
                                setAddTargetIds(addTargetIds.filter(id => id !== t.id));
                              }
                            }}
                            className="mr-3 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {addTargetType === 'user' && t.name}
                            {addTargetType === 'branch' && `${t.name} ${t.code ? `(${t.code})` : ''}`}
                            {addTargetType === 'department' && `${t.branchName ? `[${t.branchName}] ` : ''}${t.name}`}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleGrant}
                  disabled={addTargetIds.length === 0}
                  className={`px-4 py-2 text-white rounded-md flex items-center transition-colors ${addTargetIds.length === 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Check size={16} className="mr-1" />
                  {addTargetIds.length > 0 ? `${addTargetIds.length}件を追加` : '追加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="border-t p-4 flex justify-between">
          {!showAddForm && isAdmin(session?.role as UserRole) && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              権限を追加
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderPermissionModal;
