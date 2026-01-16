import React, { useState, useEffect } from 'react';
import { X, User, Building2, Users, Shield, Eye, Edit, Trash2, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { fileSystemApi } from '../utils/fileSystemApi';
import { FolderPermissions, PermissionLevel, PermissionTargetType, Branch, Department, User as UserType, UserRole, isAdmin, isSuperAdmin } from '../types';
import { useAuth } from '../context/AuthContext';

interface FolderPermissionModalProps {
  folderId: string;
  folderName: string;
  onClose: () => void;
}

const permissionLabels: Record<PermissionLevel, { label: string; icon: React.ReactNode; color: string }> = {
  view: { label: '閲覧・DL', icon: <Eye size={14} />, color: 'bg-gray-100 text-gray-700' },
  edit: { label: '編集・UP', icon: <Edit size={14} />, color: 'bg-blue-100 text-blue-700' },
  manage: { label: '完全管理', icon: <Shield size={14} />, color: 'bg-purple-100 text-purple-700' }
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
          <div className="flex items-center gap-2">
            {!showAddForm && isAdmin(session?.role as UserRole) && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center transition-colors"
              >
                <Plus size={16} className="mr-1" />
                権限を追加
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 追加フォーム (Overlay style) */}
        {showAddForm ? (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-medium">権限の追加</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">対象タイプ</label>
                  <select
                    value={addTargetType}
                    onChange={(e) => {
                      setAddTargetType(e.target.value as PermissionTargetType);
                      setAddTargetIds([]);
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  >
                    <option value="user">ユーザー (個別)</option>
                    <option value="branch">営業所 (全員)</option>
                    <option value="department">部署 (全員)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {addTargetType === 'user' && '特定のユーザーのみを指定します'}
                    {addTargetType === 'branch' && 'その営業所に所属する全員が対象'}
                    {addTargetType === 'department' && 'その部署に所属する全員が対象'}
                  </p>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">権限レベル</label>
                  <select
                    value={addPermissionLevel}
                    onChange={(e) => setAddPermissionLevel(e.target.value as PermissionLevel)}
                    className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                  >
                    <option value="view">閲覧・ダウンロード (ファイルの閲覧のみ)</option>
                    <option value="edit">編集・アップロード (ファイルの追加・削除)</option>
                    <option value="manage">完全管理 (設定変更・フォルダ削除)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">対象を選択 ({addTargetIds.length})</label>
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
                    {addTargetIds.length > 0 && addTargetIds.length === getAvailableTargets().length ? 'すべて解除' : 'すべて選択'}
                  </button>
                </div>
                <div className="border rounded-md max-h-60 overflow-y-auto bg-gray-50 p-2">
                  {getAvailableTargets().length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      追加可能な候補がありません<br />
                      <span className="text-xs">(すべての候補に既に権限が付与されています)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {getAvailableTargets().map((t: any) => (
                        <label key={t.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors border border-transparent hover:border-gray-200">
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
                          <span className="text-sm text-gray-700 flex-1">
                            {addTargetType === 'user' && (
                              <span>{t.name} <span className="text-gray-400 text-xs ml-1">{t.email}</span></span>
                            )}
                            {addTargetType === 'branch' && (
                              <span>{t.name} {t.code && <span className="text-gray-400 text-xs ml-1">({t.code})</span>}</span>
                            )}
                            {addTargetType === 'department' && (
                              <span>{t.branchName ? `[${t.branchName}] ` : ''}{t.name}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t mt-4">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white border text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleGrant}
                  disabled={addTargetIds.length === 0}
                  className={`px-4 py-2 text-white rounded-md flex items-center transition-colors text-sm font-medium ${addTargetIds.length === 0 ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Check size={16} className="mr-1" />
                  {addTargetIds.length > 0 ? `${addTargetIds.length}件を追加` : '追加'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* タブ */}
            <div className="flex border-b px-4 bg-gray-50/50">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'users'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                  }`}
              >
                <User size={16} className="mr-2" />
                ユーザー
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'users' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                  {permissions.users.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('branches')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'branches'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                  }`}
              >
                <Building2 size={16} className="mr-2" />
                営業所
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'branches' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                  {permissions.branches.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'departments'
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                  }`}
              >
                <Users size={16} className="mr-2" />
                部署
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === 'departments' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                  {permissions.departments.length}
                </span>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  読み込み中...
                </div>
              ) : (
                <>
                  {/* 全権管理者向けメッセージ */}
                  {session?.role === 'super_admin' && (
                    <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start">
                      <Shield size={18} className="text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-xs text-purple-800">
                        <span className="font-bold">全権管理者としてアクセス中:</span> すべての権限を持っています。特定のユーザーに明示的な権限を与える場合のみ追加してください。
                      </div>
                    </div>
                  )}

                  {/* ユーザータブ */}
                  {activeTab === 'users' && (
                    <div className="space-y-2">
                      {/* Super Admins Display */}
                      {users.filter(u => isSuperAdmin(u.role)).map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="bg-purple-100 p-2 rounded-full mr-3">
                              <Shield size={18} className="text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 flex items-center">
                                {admin.name}
                                <span className="ml-2 px-1.5 py-0.5 bg-purple-200 text-purple-700 text-xs rounded-full">全権管理者</span>
                              </div>
                              <div className="text-xs text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              <Shield size={14} />
                              <span className="ml-1">完全管理 (システム権限)</span>
                            </span>
                            <div className="w-8" /> {/* Spacer for alignment */}
                          </div>
                        </div>
                      ))}

                      {permissions.users.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 mt-2">
                          <User size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 mb-1">個別の権限は設定されていません</p>
                          <p className="text-xs text-gray-400">右上の「権限を追加」ボタンからユーザーを追加できます</p>
                        </div>
                      ) : (
                        permissions.users
                          .filter(perm => {
                            // Check if this user is a super admin (already displayed above)
                            const user = users.find(u => String(u.id) === String(perm.userId));
                            return !user || !isSuperAdmin(user.role);
                          })
                          .map(perm => (
                            <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                              <div className="flex items-center">
                                <div className="bg-gray-100 p-2 rounded-full mr-3">
                                  <User size={18} className="text-gray-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{perm.userName}</div>
                                  {perm.userEmail && (
                                    <div className="text-xs text-gray-500">{perm.userEmail}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${permissionLabels[perm.permissionLevel].color}`}>
                                  {permissionLabels[perm.permissionLevel].icon}
                                  <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                                </span>
                                <button
                                  onClick={() => handleRevoke('user', perm.userId, perm.userName)}
                                  className="p-1.5 hover:bg-red-100 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                  title="権限を削除"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}

                  {/* 営業所タブ */}
                  {activeTab === 'branches' && (
                    <div className="space-y-2">
                      {permissions.branches.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <Building2 size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 mb-1">営業所権限は設定されていません</p>
                          <p className="text-xs text-gray-400">右上の「権限を追加」ボタンから追加できます</p>
                        </div>
                      ) : (
                        permissions.branches.map(perm => (
                          <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                            <div className="flex items-center">
                              <div className="bg-blue-50 p-2 rounded-full mr-3">
                                <Building2 size={18} className="text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{perm.branchName}</div>
                                {perm.branchCode && (
                                  <div className="text-xs text-gray-500">{perm.branchCode}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${permissionLabels[perm.permissionLevel].color}`}>
                                {permissionLabels[perm.permissionLevel].icon}
                                <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                              </span>
                              <button
                                onClick={() => handleRevoke('branch', perm.branchId, perm.branchName)}
                                className="p-1.5 hover:bg-red-100 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                title="権限を削除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* 部署タブ */}
                  {activeTab === 'departments' && (
                    <div className="space-y-2">
                      {permissions.departments.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <Users size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 mb-1">部署権限は設定されていません</p>
                          <p className="text-xs text-gray-400">右上の「権限を追加」ボタンから追加できます</p>
                        </div>
                      ) : (
                        permissions.departments.map(perm => (
                          <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                            <div className="flex items-center">
                              <div className="bg-green-50 p-2 rounded-full mr-3">
                                <Users size={18} className="text-green-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{perm.departmentName}</div>
                                <div className="text-xs text-gray-500">
                                  {perm.branchName || '全社共通'}
                                  {perm.departmentCode && ` (${perm.departmentCode})`}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${permissionLabels[perm.permissionLevel].color}`}>
                                {permissionLabels[perm.permissionLevel].icon}
                                <span className="ml-1">{permissionLabels[perm.permissionLevel].label}</span>
                              </span>
                              <button
                                onClick={() => handleRevoke('department', perm.departmentId, perm.departmentName)}
                                className="p-1.5 hover:bg-red-100 rounded-md text-gray-400 hover:text-red-500 transition-colors"
                                title="権限を削除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* フッターなし (追加ボタンはヘッダーに移動) */}
            <div className="border-t p-3 bg-gray-50 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FolderPermissionModal;
