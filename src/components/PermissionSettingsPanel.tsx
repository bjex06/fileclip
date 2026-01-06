import React from 'react';
import { Shield, Check, X, Info, RotateCcw } from 'lucide-react';
import { UserRole } from '../types';
import { usePermission, PermissionCapability } from '../context/PermissionContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const PermissionSettingsPanel: React.FC = () => {
    const { permissions, updatePermission, resetPermissions } = usePermission();
    const { session } = useAuth();

    // 全権管理者のみ編集可能
    const canEdit = session?.role === 'super_admin';

    const handleToggle = (role: UserRole, capability: PermissionCapability) => {
        if (!canEdit) return;
        const currentValue = permissions[role][capability];
        updatePermission(role, capability, !currentValue);
        toast.success('権限設定を更新しました');
    };

    const handleReset = () => {
        if (!canEdit) return;
        if (confirm('権限設定を初期状態に戻しますか？')) {
            resetPermissions();
            toast.success('権限設定をリセットしました');
        }
    };

    // 表示用の定義
    const capabilityGroups = [
        {
            category: 'ユーザー管理',
            items: [
                { key: 'manage_all_users', label: '全ユーザーの管理' },
                { key: 'manage_branch_users', label: '自営業所のユーザー管理' },
                { key: 'manage_dept_users', label: '自部署のユーザー管理' },
            ]
        },
        {
            category: '組織管理',
            items: [
                { key: 'manage_branches', label: '営業所の追加・編集' },
                { key: 'manage_departments', label: '部署の追加・編集' },
            ]
        },
        {
            category: 'システム',
            items: [
                { key: 'view_audit_logs', label: '監査ログの閲覧' },
                { key: 'system_settings', label: 'システム設定へのアクセス' },
            ]
        }
    ];

    const RoleHeader = ({ label, color }: { label: string, color: string }) => (
        <th className="py-4 px-4 text-center w-1/6">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${color}`}>
                {label}
            </span>
        </th>
    );

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white/60 p-8">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-xl font-bold flex items-center text-gray-800">
                        <div className="p-2 bg-indigo-100 rounded-lg mr-3 shadow-inner">
                            <Shield size={24} className="text-indigo-600" />
                        </div>
                        権限設定
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 ml-1">ロールごとの操作権限を細かく設定できます</p>
                </div>
                {canEdit && (
                    <button
                        onClick={handleReset}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-indigo-600 rounded-xl transition-all shadow-sm hover:shadow"
                    >
                        <RotateCcw size={16} className="mr-2" />
                        初期値に戻す
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200/60 shadow-sm bg-white/50">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                            <th className="py-4 px-6 text-left font-bold text-gray-600 w-1/3 text-sm">機能 / 操作</th>
                            <RoleHeader label="全権管理者" color="text-purple-700 bg-purple-100" />
                            <RoleHeader label="営業所管理者" color="text-blue-700 bg-blue-100" />
                            <RoleHeader label="部署管理者" color="text-green-700 bg-green-100" />
                            <RoleHeader label="一般ユーザー" color="text-gray-700 bg-gray-100" />
                        </tr>
                    </thead>
                    <tbody>
                        {capabilityGroups.map((group, gIndex) => (
                            <React.Fragment key={gIndex}>
                                <tr className="bg-indigo-50/30">
                                    <td colSpan={5} className="py-3 px-6 font-bold text-indigo-900 text-xs uppercase tracking-wider border-b border-gray-100">
                                        {group.category}
                                    </td>
                                </tr>
                                {group.items.map((item) => (
                                    <tr key={item.key} className="border-b last:border-0 border-gray-100 hover:bg-white/80 transition-colors">
                                        <td className="py-4 px-6 text-gray-700 font-medium text-sm">
                                            {item.label}
                                        </td>
                                        {(['super_admin', 'branch_admin', 'department_admin', 'user'] as UserRole[]).map(role => {
                                            const isChecked = permissions[role][item.key as PermissionCapability];
                                            return (
                                                <td key={role} className="py-3 px-4 text-center">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => handleToggle(role, item.key as PermissionCapability)}
                                                            disabled={!canEdit || role === 'super_admin'}
                                                            className={`
                                                                w-10 h-6 rounded-full p-1 transition-all duration-300 ease-out flex items-center
                                                                ${isChecked
                                                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-md shadow-green-200 justify-end'
                                                                    : 'bg-gray-200 shadow-inner justify-start'}
                                                                ${(!canEdit || role === 'super_admin') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}
                                                            `}
                                                        >
                                                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isChecked ? '' : ''}`} />
                                                        </button>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 flex items-start shadow-sm">
                <div className="p-2 bg-white rounded-full shadow-sm text-blue-500 mr-4">
                    <Info size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-blue-900 mb-1">権限設定の反映について</h3>
                    <p className="text-sm text-blue-700/80 leading-relaxed">
                        スイッチを切り替えると、設定は即座にデータベースへ保存され、ユーザー管理画面やサイドバーの表示にリアルタイムで反映されます。<br />
                        特に「ユーザー管理」権限の変更は、各管理者が閲覧できるユーザーの範囲に大きく影響します。
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PermissionSettingsPanel;
