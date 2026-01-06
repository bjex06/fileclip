// 権限階層: super_admin > branch_admin > department_admin > user
export type UserRole = 'super_admin' | 'branch_admin' | 'department_admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string;
  branchName?: string;
  departmentId?: string;
  departmentName?: string;
  position?: string;
  employeeCode?: string;
  isActive: boolean;
}

// 権限チェック用ヘルパー
export const isAdmin = (role: UserRole): boolean => {
  return ['super_admin', 'branch_admin', 'department_admin'].includes(role);
};

export const isSuperAdmin = (role: UserRole): boolean => {
  return role === 'super_admin';
};

export const canManageBranch = (role: UserRole): boolean => {
  return ['super_admin', 'branch_admin'].includes(role);
};

export const canManageDepartment = (role: UserRole): boolean => {
  return ['super_admin', 'branch_admin', 'department_admin'].includes(role);
};

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    super_admin: '全権管理者',
    branch_admin: '営業所管理者',
    department_admin: '部署管理者',
    user: '一般ユーザー'
  };
  return labels[role] || role;
};

export interface Folder {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  folder_permissions: { user_id: string }[];
}

export interface File {
  id: string;
  name: string;
  type: string;
  size: number;
  folder_id: string;
  created_by: string;
  storage_path: string;
  created_at: string;
}

export interface TrashItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  extension?: string;
  original_path: string;
  deleted_at: string;
  deleted_by: string;
}

export interface ShareLink {
  id: string;
  token: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  resource_name?: string;
  has_password: boolean;
  expires_at?: string;
  download_count: number;
  max_downloads?: number;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  created_at: string;
}

export interface RecentFile {
  id: string;
  user_id: string;
  file_id: string;
  file?: File;
  accessed_at: string;
}

export interface StorageUsage {
  used: number;
  quota: number;
  percentage: number;
}

export interface SearchFilters {
  query: string;
  type: 'all' | 'files' | 'folders';
  fileType?: 'image' | 'document' | 'video' | 'audio' | 'archive';
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
  folderId?: string;
  sortBy: 'name' | 'size' | 'created_at' | 'type';
  sortOrder: 'ASC' | 'DESC';
}

export interface SearchResult {
  files: SearchResultItem[];
  folders: SearchResultItem[];
}

export interface SearchResultItem {
  id: string;
  name: string;
  type?: string;
  size?: number;
  folder_id?: string;
  folder_name?: string;
  parent_id?: string;
  parent_name?: string;
  created_by: string;
  creator_name?: string;
  created_at: string;
  resource_type: 'file' | 'folder';
}

export interface SearchMeta {
  total_files: number;
  total_folders: number;
  total: number;
  limit: number;
  offset: number;
  query: string;
  request_id?: string;
}

export interface BreadcrumbItem {
  id: string | null;
  name: string;
  parent_id: string | null;
}

export interface FolderPath {
  path: BreadcrumbItem[];
  current: string | null;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  size: number;
  storage_path: string;
  comment?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  is_current: boolean;
}

// 営業所（Branch Office）
export interface Branch {
  id: string;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  managerId?: string;      // 責任者のユーザーID
  managerName?: string;    // 責任者名（表示用、ユーザーから取得）
  isActive: boolean;
  displayOrder: number;
  userCount?: number;
  departmentCount?: number;
  createdAt?: string;
}

// 部署（Department）
export interface Department {
  id: string;
  branchId?: string;
  branchName?: string;
  branchCode?: string;
  name: string;
  code?: string;
  parentId?: string;
  parentName?: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  displayOrder: number;
  userCount?: number;
  createdAt?: string;
}

// フォルダ権限
export type PermissionLevel = 'view' | 'edit' | 'manage';
export type PermissionTargetType = 'user' | 'branch' | 'department';

export interface UserPermission {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  permissionLevel: PermissionLevel;
  createdAt?: string;
}

export interface BranchPermission {
  id: string;
  branchId: string;
  branchName: string;
  branchCode?: string;
  permissionLevel: PermissionLevel;
  createdAt?: string;
}

export interface DepartmentPermission {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentCode?: string;
  branchName?: string;
  permissionLevel: PermissionLevel;
  createdAt?: string;
}

export interface FolderPermissions {
  users: UserPermission[];
  branches: BranchPermission[];
  departments: DepartmentPermission[];
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'maintenance' | 'update' | 'info';
  importance: 'normal' | 'high';
}