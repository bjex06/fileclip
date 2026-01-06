import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

// 権限機能の識別子
export type PermissionCapability =
    | 'manage_all_users'      // 全ユーザーの管理
    | 'manage_branch_users'   // 自営業所のユーザー管理
    | 'manage_dept_users'     // 自部署のユーザー管理
    | 'manage_branches'       // 営業所の追加・編集
    | 'manage_departments'    // 部署の追加・編集
    | 'view_audit_logs'       // 監査ログ閲覧
    | 'system_settings';      // システム設定

// 権限設定のマトリックス型
export type PermissionMatrix = Record<UserRole, Record<PermissionCapability, boolean>>;

// デフォルトの権限設定
const DEFAULT_PERMISSIONS: PermissionMatrix = {
    super_admin: {
        manage_all_users: true,
        manage_branch_users: true,
        manage_dept_users: true,
        manage_branches: true,
        manage_departments: true,
        view_audit_logs: true,
        system_settings: true,
    },
    branch_admin: {
        manage_all_users: false,
        manage_branch_users: true,
        manage_dept_users: true,
        manage_branches: false, // 営業所自体の追加削除は不可、自営業所の編集は別権限？一旦シンプルに
        manage_departments: true,
        view_audit_logs: false,
        system_settings: false,
    },
    department_admin: {
        manage_all_users: false,
        manage_branch_users: false,
        manage_dept_users: true,
        manage_branches: false,
        manage_departments: false,
        view_audit_logs: false,
        system_settings: false,
    },
    user: {
        manage_all_users: false,
        manage_branch_users: false,
        manage_dept_users: false,
        manage_branches: false,
        manage_departments: false,
        view_audit_logs: false,
        system_settings: false,
    },
};

interface PermissionContextType {
    permissions: PermissionMatrix;
    updatePermission: (role: UserRole, capability: PermissionCapability, value: boolean) => void;
    hasPermission: (role: UserRole, capability: PermissionCapability) => boolean;
    resetPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS);

    // 初回ロード時にLocalStorageから読み込み
    useEffect(() => {
        const saved = localStorage.getItem('app_permissions');
        if (saved) {
            try {
                setPermissions(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse permissions', e);
            }
        }
    }, []);

    // 権限更新
    const updatePermission = (role: UserRole, capability: PermissionCapability, value: boolean) => {
        setPermissions(prev => {
            const next = {
                ...prev,
                [role]: {
                    ...prev[role],
                    [capability]: value
                }
            };
            localStorage.setItem('app_permissions', JSON.stringify(next));
            return next;
        });
    };

    // 権限チェック
    const hasPermission = (role: UserRole, capability: PermissionCapability): boolean => {
        return permissions[role]?.[capability] ?? false;
    };

    const resetPermissions = () => {
        setPermissions(DEFAULT_PERMISSIONS);
        localStorage.removeItem('app_permissions');
    };

    return (
        <PermissionContext.Provider value={{ permissions, updatePermission, hasPermission, resetPermissions }}>
            {children}
        </PermissionContext.Provider>
    );
};

export const usePermission = () => {
    const context = useContext(PermissionContext);
    if (context === undefined) {
        throw new Error('usePermission must be used within a PermissionProvider');
    }
    return context;
};
