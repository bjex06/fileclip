import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Users, Plus, Edit2, Trash2, X, ChevronRight, ChevronDown, MapPin, Phone, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fileSystemApi } from '../utils/fileSystemApi';
import { Branch, Department, UserRole, canManageBranch, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../context/PermissionContext';
import { useFileSystem } from '../context/FileSystemContext';

// 営業所フォームモーダル
interface BranchFormModalProps {
  branch?: Branch;
  onClose: () => void;
  onSave: () => void;
}

const BranchFormModal: React.FC<BranchFormModalProps> = ({ branch, onClose, onSave }) => {
  const { users } = useFileSystem();
  const [name, setName] = useState(branch?.name || '');
  const [code, setCode] = useState(branch?.code || '');
  const [address, setAddress] = useState(branch?.address || '');
  const [phone, setPhone] = useState(branch?.phone || '');
  const [managerId, setManagerId] = useState(branch?.managerId || '');
  const [loading, setLoading] = useState(false);

  // 営業所管理者または全権管理者のユーザーのみ選択可能
  const eligibleManagers = users.filter(u =>
    u.role === 'super_admin' || u.role === 'branch_admin'
  );

  const selectedManager = users.find(u => u.id === managerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('営業所名を入力してください');
      return;
    }

    setLoading(true);
    try {
      let result;
      const managerName = selectedManager?.name || '';
      if (branch) {
        result = await fileSystemApi.updateBranch(branch.id, { name, code, address, phone, managerId, managerName });
        if (result.success) {
          toast.success('営業所を更新しました');
          onSave();
          onClose();
        } else {
          toast.error(result.error || '更新に失敗しました');
        }
      } else {
        result = await fileSystemApi.createBranch({ name, code, address, phone, managerId, managerName });
        if (result.success) {
          toast.success('営業所を作成しました');
          onSave();
          onClose();
        } else {
          toast.error(result.error || '作成に失敗しました');
        }
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Building2 size={18} className="mr-2 text-[#64D2C3]" />
            {branch ? '営業所を編集' : '営業所を追加'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              営業所名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="東京本社"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              営業所コード
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="TKY"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              住所
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="東京都千代田区..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電話番号
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="03-1234-5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              責任者（営業所管理者）
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#64D2C3] focus:border-transparent"
            >
              <option value="">未設定</option>
              {eligibleManagers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role === 'super_admin' ? '全権管理者' : '営業所管理者'})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">営業所管理者以上の権限を持つユーザーから選択</p>
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
    </div>,
    document.body
  );
};

// 部署フォームモーダル
interface DepartmentFormModalProps {
  department?: Department;
  branches: Branch[];
  departments: Department[];
  onClose: () => void;
  onSave: () => void;
}

const DepartmentFormModal: React.FC<DepartmentFormModalProps> = ({
  department, branches, departments, onClose, onSave
}) => {
  const [name, setName] = useState(department?.name || '');
  const [code, setCode] = useState(department?.code || '');
  const [branchId, setBranchId] = useState(department?.branchId || '');
  const [parentId, setParentId] = useState(department?.parentId || '');
  const [description, setDescription] = useState(department?.description || '');
  const [loading, setLoading] = useState(false);

  // 親部署候補（自分自身と子孫は除外）
  const parentCandidates = departments.filter(d =>
    d.id !== department?.id &&
    (!branchId || d.branchId === branchId || !d.branchId)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('部署名を入力してください');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (department) {
        result = await fileSystemApi.updateDepartment(department.id, {
          name, code, branchId: branchId || undefined, parentId: parentId || undefined, description
        });
        if (result.success) {
          toast.success('部署を更新しました');
          onSave();
          onClose();
        } else {
          toast.error(result.error || '更新に失敗しました');
        }
      } else {
        result = await fileSystemApi.createDepartment({
          name, code, branchId: branchId || undefined, parentId: parentId || undefined, description
        });
        if (result.success) {
          toast.success('部署を作成しました');
          onSave();
          onClose();
        } else {
          toast.error(result.error || '作成に失敗しました');
        }
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center">
            <Users size={18} className="mr-2 text-[#64D2C3]" />
            {department ? '部署を編集' : '部署を追加'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部署名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="営業部"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              部署コード
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SALES"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所属営業所
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全社共通</option>
              {branches.filter(b => b.isActive).map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} {branch.code && `(${branch.code})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              親部署
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">なし（トップレベル）</option>
              {parentCandidates.filter(d => d.isActive).map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.branchName && `[${dept.branchName}] `}{dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="部署の説明..."
              rows={3}
            />
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
    </div>,
    document.body
  );
};

// メインパネル
interface OrganizationPanelProps {
  fullWidth?: boolean;
}

const OrganizationPanel: React.FC<OrganizationPanelProps> = ({ fullWidth = false }) => {
  const { session } = useAuth();
  const { hasPermission } = usePermission();
  const [activeTab, setActiveTab] = useState<'branches' | 'departments'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  // モーダル状態
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | undefined>();
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>();

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchRes, deptRes] = await Promise.all([
        fileSystemApi.getBranches(),
        fileSystemApi.getDepartments()
      ]);

      // 権限に基づいてフィルタリング
      if (session) {
        const userRole = session.role as UserRole;

        if (branchRes.success && branchRes.data) {
          let filteredBranches = branchRes.data;
          // 営業所管理者は自分の営業所のみ表示
          if (userRole === 'branch_admin' && session.branchId) {
            filteredBranches = branchRes.data.filter(b => b.id === session.branchId);
          }
          setBranches(filteredBranches);
        }

        if (deptRes.success && deptRes.data) {
          let filteredDepts = deptRes.data;
          // 営業所管理者は自分の営業所の部署のみ表示
          if (userRole === 'branch_admin' && session.branchId) {
            filteredDepts = deptRes.data.filter(d => d.branchId === session.branchId);
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
  }, []);

  // 営業所削除
  const handleDeleteBranch = async (branch: Branch) => {
    if (!confirm(`営業所「${branch.name}」を削除してもよろしいですか？`)) return;
    try {
      const res = await fileSystemApi.deleteBranch(branch.id);
      if (res.success) {
        toast.success('営業所を削除しました');
        fetchData();
      } else {
        toast.error(res.error || '削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  // 部署削除
  const handleDeleteDepartment = async (department: Department) => {
    if (!confirm(`部署「${department.name}」を削除してもよろしいですか？`)) return;
    try {
      const res = await fileSystemApi.deleteDepartment(department.id);
      if (res.success) {
        toast.success('部署を削除しました');
        fetchData();
      } else {
        toast.error(res.error || '削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  // 営業所の展開切り替え
  const toggleBranchExpand = (branchId: string) => {
    setExpandedBranches(prev => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  // 営業所管理権限があるユーザーのみ表示（super_admin, branch_admin）
  if (!session || !canManageBranch(session.role as UserRole)) {
    return null;
  }

  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 ${fullWidth ? 'p-8' : 'p-6'}`}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-800 flex items-center text-xl">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Building2 size={24} className="text-blue-600" />
          </div>
          組織管理
        </h2>
      </div>

      {/* タブ */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('branches')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'branches'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Building2 size={16} className="inline mr-1" />
          営業所
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'departments'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Users size={16} className="inline mr-1" />
          部署
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : (
        <>


          {/* ... (keep other code) ... */}

          {/* 営業所タブ */}
          {activeTab === 'branches' && (
            <div>
              <div className="flex justify-end mb-3">
                {/* 権限に基づいて表示 */}
                {hasPermission(session?.role as UserRole, 'manage_branches') && (
                  <button
                    onClick={() => { setEditingBranch(undefined); setShowBranchForm(true); }}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
                  >
                    <Plus size={18} className="mr-1.5" />
                    営業所を追加
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {branches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    営業所がありません
                  </div>
                ) : (
                  branches.map(branch => (
                    <div key={branch.id} className="border rounded-lg overflow-hidden">
                      <div
                        className={`flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 ${!branch.isActive ? 'opacity-50' : ''
                          }`}
                        onClick={() => toggleBranchExpand(branch.id)}
                      >
                        <div className="flex items-center">
                          {expandedBranches.has(branch.id) ? (
                            <ChevronDown size={16} className="mr-2 text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="mr-2 text-gray-400" />
                          )}
                          <Building2 size={18} className="mr-2 text-blue-600" />
                          <span className="font-medium">{branch.name}</span>
                          {branch.code && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {branch.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {branch.userCount || 0}人 / {branch.departmentCount || 0}部署
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingBranch(branch); setShowBranchForm(true); }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Edit2 size={14} className="text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteBranch(branch); }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>

                      {expandedBranches.has(branch.id) && (
                        <div className="p-3 border-t bg-white">
                          {branch.address && (
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <MapPin size={14} className="mr-2 text-gray-400" />
                              {branch.address}
                            </div>
                          )}
                          {branch.phone && (
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <Phone size={14} className="mr-2 text-gray-400" />
                              {branch.phone}
                            </div>
                          )}
                          {branch.managerName && (
                            <div className="flex items-center text-sm text-gray-600">
                              <UserCircle size={14} className="mr-2 text-gray-400" />
                              責任者: {branch.managerName}
                            </div>
                          )}

                          {/* この営業所の部署一覧 */}
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium text-gray-500 mb-2">部署</div>
                            <div className="space-y-1">
                              {departments.filter(d => d.branchId === branch.id).length === 0 ? (
                                <div className="text-xs text-gray-400">部署なし</div>
                              ) : (
                                departments
                                  .filter(d => d.branchId === branch.id)
                                  .map(dept => (
                                    <div key={dept.id} className="flex items-center justify-between text-sm">
                                      <span>{dept.name}</span>
                                      <span className="text-xs text-gray-500">{dept.userCount || 0}人</span>
                                    </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 部署タブ */}
          {activeTab === 'departments' && (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => { setEditingDepartment(undefined); setShowDepartmentForm(true); }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
                >
                  <Plus size={18} className="mr-1.5" />
                  部署を追加
                </button>
              </div>

              <div className="space-y-2">
                {departments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    部署がありません
                  </div>
                ) : (
                  departments.map(dept => (
                    <div
                      key={dept.id}
                      className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${!dept.isActive ? 'opacity-50' : ''
                        }`}
                    >
                      <div className="flex items-center">
                        <Users size={18} className="mr-2 text-green-600" />
                        <div>
                          <div className="font-medium">{dept.name}</div>
                          <div className="text-xs text-gray-500">
                            {dept.branchName || '全社共通'}
                            {dept.parentName && ` / ${dept.parentName}`}
                          </div>
                        </div>
                        {dept.code && (
                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {dept.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{dept.userCount || 0}人</span>
                        <button
                          onClick={() => { setEditingDepartment(dept); setShowDepartmentForm(true); }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Edit2 size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* モーダル */}
      {showBranchForm && (
        <BranchFormModal
          branch={editingBranch}
          onClose={() => { setShowBranchForm(false); setEditingBranch(undefined); }}
          onSave={fetchData}
        />
      )}

      {showDepartmentForm && (
        <DepartmentFormModal
          department={editingDepartment}
          branches={branches}
          departments={departments}
          onClose={() => { setShowDepartmentForm(false); setEditingDepartment(undefined); }}
          onSave={fetchData}
        />
      )}
    </div>
  );
};

export default OrganizationPanel;
