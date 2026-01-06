// ファイルシステムAPI抽象化レイヤー

import { httpClient, getApiConfig, ApiResponse } from './api';
import { User, Folder, File, TrashItem, ShareLink, SearchFilters, SearchResult, SearchMeta, FolderPath, Branch, Department, FolderPermissions, PermissionLevel, PermissionTargetType, UserRole, Notice } from '../types';

export interface CreateFolderData {
  name: string;
  created_by: string;
}

export interface UpdateFolderData {
  folder_id: string;
  name: string;
}

export interface UpdateFolderPermissionsData {
  folder_id: string;
  user_id: string;
  action: 'grant' | 'revoke';
}

export interface CreateFileData {
  name: string;
  type: string;
  folder_id: string;
  created_by: string;
  size: number;
  file?: globalThis.File;
}

// モックストレージ
const mockStorage = {
  users: new Map<string, User>(),
  folders: new Map<string, Folder>(),
  files: new Map<string, File>(),
  branches: new Map<string, Branch>(),
  departments: new Map<string, Department>(),
  detailedPermissions: new Map<string, FolderPermissions>(),
  notices: new Map<string, Notice>()
};

// ローカルストレージから復元
const initMockStorage = () => {
  try {
    const savedBranches = localStorage.getItem('mock_branches');
    const savedDepartments = localStorage.getItem('mock_departments');
    if (savedBranches) {
      const branches = JSON.parse(savedBranches) as Branch[];
      branches.forEach(b => mockStorage.branches.set(b.id, b));
    }
    if (savedDepartments) {
      const departments = JSON.parse(savedDepartments) as Department[];
      departments.forEach(d => mockStorage.departments.set(d.id, d));
    }
    const savedPermissions = localStorage.getItem('mock_permissions');
    if (savedPermissions) {
      const permissions = JSON.parse(savedPermissions); // Map entries [[key, value], ...]
      // JSON.stringify(Array.from(map)) creates an array of entries
      if (Array.isArray(permissions)) {
        permissions.forEach(([key, value]) => mockStorage.detailedPermissions.set(key, value));
      }
    }
    const savedNotices = localStorage.getItem('mock_notices');
    if (savedNotices) {
      const notices = JSON.parse(savedNotices);
      if (Array.isArray(notices)) {
        notices.forEach(([key, value]) => mockStorage.notices.set(key, value));
      }
    } else {
      // Initialize default mock notices
      const MOCK_NOTICES: Notice[] = [
        { id: '1', title: '【重要】システムメンテナンスのお知らせ', content: '12月20日 22:00～24:00の間、メンテナンスのためシステムが利用できません。', date: '2025/12/10', category: 'maintenance', importance: 'high' },
        { id: '2', title: '新機能：ファイルプレビューが改善されました', content: 'PDFや画像のプレビューがよりスムーズになりました。', date: '2025/12/12', category: 'update', importance: 'normal' },
        { id: '3', title: '年末年始の営業について', content: '12月29日～1月3日までサポート窓口は休業となります。', date: '2025/12/01', category: 'info', importance: 'normal' },
      ];
      MOCK_NOTICES.forEach(notice => mockStorage.notices.set(notice.id, notice));
    }
  } catch (e) {
    console.error('Failed to restore mock storage', e);
  }
};

const saveMockBranches = () => {
  const branches = Array.from(mockStorage.branches.values());
  localStorage.setItem('mock_branches', JSON.stringify(branches));
};

const saveMockDepartments = () => {
  const departments = Array.from(mockStorage.departments.values());
  localStorage.setItem('mock_departments', JSON.stringify(departments));
};

const saveMockPermissions = () => {
  const permissions = Array.from(mockStorage.detailedPermissions.entries());
  localStorage.setItem('mock_permissions', JSON.stringify(permissions));
};

const saveMockUsers = () => {
  const users = Array.from(mockStorage.users.values());
  localStorage.setItem('mock_users', JSON.stringify(users));
};

const saveMockNotices = () => {
  const notices = Array.from(mockStorage.notices.entries());
  localStorage.setItem('mock_notices', JSON.stringify(notices));
};

// ローカルストレージからユーザーも復元
const initMockUsers = () => {
  try {
    const savedUsers = localStorage.getItem('mock_users');
    if (savedUsers) {
      const users = JSON.parse(savedUsers) as User[];
      users.forEach(u => mockStorage.users.set(u.id, u));
    }
  } catch (e) {
    console.error('Failed to restore mock users', e);
  }
};

// 初期化
initMockStorage();
initMockUsers();

// ファイルシステムAPIクライアント
export class FileSystemApiClient {
  private config = getApiConfig();

  // === ユーザー管理 ===
  async getUsers(): Promise<ApiResponse<User[]>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseGetUsers();
      case 'xserver':
        return this.xserverGetUsers();
      default:
        return this.mockGetUsers();
    }
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteUser(userId);
      case 'xserver':
        return this.xserverDeleteUser(userId);
      default:
        return this.mockDeleteUser(userId);
    }
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    branch_id?: string;
    department_id?: string;
    position?: string;
    employee_code?: string;
  }): Promise<ApiResponse<User>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/users/create.php', data);
      default:
        // モック実装
        const branch = data.branch_id ? mockStorage.branches.get(data.branch_id) : null;
        const department = data.department_id ? mockStorage.departments.get(data.department_id) : null;
        const newUser: User = {
          id: data.email, // メールアドレスをIDとして使用
          name: data.name,
          email: data.email,
          role: data.role || 'user',
          branchId: data.branch_id,
          branchName: branch?.name,
          departmentId: data.department_id,
          departmentName: department?.name,
          position: data.position,
          employeeCode: data.employee_code,
          isActive: true
        };
        mockStorage.users.set(newUser.id, newUser);
        saveMockUsers();
        return { success: true, data: newUser };
    }
  }

  async updateUser(userId: string, data: {
    name?: string;
    email?: string;
    role?: UserRole;
    branch_id?: string;
    department_id?: string;
    is_active?: boolean;
    password?: string;
  }): Promise<ApiResponse<User>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/users/update.php', { user_id: userId, ...data });
      default:
        // モック実装
        const user = mockStorage.users.get(userId);
        if (!user) {
          return { success: false, error: 'ユーザーが見つかりません' };
        }

        const branch = data.branch_id ? mockStorage.branches.get(data.branch_id) : undefined;
        const department = data.department_id ? mockStorage.departments.get(data.department_id) : undefined;

        // branch_id/department_id が明示的に渡された場合のみ更新（undefinedなら維持、null/空文字ならクリア）
        // UIからは '' (空文字) がクリアの意味で渡される

        const updatedUser: User = {
          ...user,
          name: data.name || user.name,
          role: data.role || user.role,
          isActive: data.is_active !== undefined ? data.is_active : user.isActive,
        };

        if (data.branch_id !== undefined) {
          updatedUser.branchId = data.branch_id;
          updatedUser.branchName = branch?.name;
        }

        if (data.department_id !== undefined) {
          updatedUser.departmentId = data.department_id;
          updatedUser.departmentName = department?.name;
        }

        mockStorage.users.set(userId, updatedUser);
        saveMockUsers();
        return { success: true, data: updatedUser };
    }
  }

  // === フォルダー管理 ===
  async getFolders(): Promise<ApiResponse<Folder[]>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseGetFolders();
      case 'xserver':
        return this.xserverGetFolders();
      default:
        return this.mockGetFolders();
    }
  }

  async createFolder(data: CreateFolderData): Promise<ApiResponse<Folder>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseCreateFolder(data);
      case 'xserver':
        return this.xserverCreateFolder(data);
      default:
        return this.mockCreateFolder(data);
    }
  }

  async updateFolder(data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUpdateFolder(data);
      case 'xserver':
        return this.xserverUpdateFolder(data);
      default:
        return this.mockUpdateFolder(data);
    }
  }

  async deleteFolder(folderId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteFolder(folderId);
      case 'xserver':
        return this.xserverDeleteFolder(folderId);
      default:
        return this.mockDeleteFolder(folderId);
    }
  }

  // === お知らせ管理 ===
  async getNotices(): Promise<ApiResponse<Notice[]>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/notices/list.php');
      default:
        return this.mockGetNotices();
    }
  }

  async addNotice(notice: Omit<Notice, 'id' | 'date'>): Promise<ApiResponse<Notice>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/notices/create.php', notice);
      default:
        return this.mockAddNotice(notice);
    }
  }

  async deleteNotice(id: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/notices/delete.php', { id });
      default:
        return this.mockDeleteNotice(id);
    }
  }

  async updateFolderPermissions(data: UpdateFolderPermissionsData): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUpdateFolderPermissions(data);
      case 'xserver':
        return this.xserverUpdateFolderPermissions(data);
      default:
        return this.mockUpdateFolderPermissions(data);
    }
  }

  // === ファイル管理 ===
  async getFiles(folderId?: string): Promise<ApiResponse<File[]>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseGetFiles(folderId);
      case 'xserver':
        return this.xserverGetFiles(folderId);
      default:
        return this.mockGetFiles(folderId);
    }
  }

  async uploadFile(data: CreateFileData): Promise<ApiResponse<File>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUploadFile(data);
      case 'xserver':
        return this.xserverUploadFile(data);
      default:
        return this.mockUploadFile(data);
    }
  }

  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteFile(fileId);
      case 'xserver':
        return this.xserverDeleteFile(fileId);
      default:
        return this.mockDeleteFile(fileId);
    }
  }

  async downloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDownloadFile(fileId);
      case 'xserver':
        return this.xserverDownloadFile(fileId);
      default:
        return this.mockDownloadFile(fileId);
    }
  }

  // === ゴミ箱管理 ===
  async getTrashItems(): Promise<ApiResponse<TrashItem[]>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/trash/list.php');
      default:
        return { success: true, data: [] };
    }
  }

  async restoreFromTrash(id: string, type: 'file' | 'folder'): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/trash/restore.php', { id, type });
      default:
        return { success: true };
    }
  }

  async permanentlyDelete(id: string, type: 'file' | 'folder'): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/trash/delete.php', { id, type });
      default:
        return { success: true };
    }
  }

  async emptyTrash(): Promise<ApiResponse<{ deleted_count: number }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/trash/empty.php', {});
      default:
        return { success: true, data: { deleted_count: 0 } };
    }
  }

  // === 共有リンク管理 ===
  async getShareLinks(): Promise<ApiResponse<ShareLink[]>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/share/list.php');
      default:
        return { success: true, data: [] };
    }
  }

  async createShareLink(data: {
    resource_type: 'file' | 'folder';
    resource_id: string;
    password?: string;
    expires_at?: string;
    max_downloads?: number;
  }): Promise<ApiResponse<ShareLink>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/share/create.php', data);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteShareLink(shareId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/share/delete.php', { share_id: shareId });
      default:
        return { success: true };
    }
  }

  async getShareLinkInfo(token: string): Promise<ApiResponse<{
    resource_type: string;
    resource_name: string;
    file_size?: number;
    file_type?: string;
    requires_password: boolean;
    expires_at?: string;
    download_count: number;
    max_downloads?: number;
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get(`/api/share/get.php?token=${token}`);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // === お気に入り管理 ===
  async getFavorites(): Promise<ApiResponse<Array<{
    id: string;
    resource_type: 'file' | 'folder';
    resource_id: string;
    resource_name: string;
    file_size?: number;
    file_type?: string;
    file_extension?: string;
    parent_id?: string;
    created_at: string;
  }>>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/favorites/list.php');
      default:
        return { success: true, data: [] };
    }
  }

  async addFavorite(resourceType: 'file' | 'folder', resourceId: string): Promise<ApiResponse<{ id: string }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/favorites/add.php', { resource_type: resourceType, resource_id: resourceId });
      default:
        return { success: true, data: { id: '' } };
    }
  }

  async removeFavorite(resourceType: 'file' | 'folder', resourceId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/favorites/remove.php', { resource_type: resourceType, resource_id: resourceId });
      default:
        return { success: true };
    }
  }

  // === 最近使用したファイル ===
  async getRecentFiles(limit: number = 20): Promise<ApiResponse<Array<{
    id: string;
    file_id: string;
    name: string;
    type: string;
    extension: string;
    size: number;
    folder_id: string;
    folder_name: string;
    accessed_at: string;
  }>>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get(`/api/recent/list.php?limit=${limit}`);
      default:
        return { success: true, data: [] };
    }
  }

  async trackFileAccess(fileId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/recent/track.php', { file_id: fileId });
      default:
        return { success: true };
    }
  }

  // === アクティビティログ ===
  async getActivityLogs(params: {
    page?: number;
    per_page?: number;
    action?: string;
    resource_type?: string;
    user_id?: string;
  } = {}): Promise<ApiResponse<{
    data: Array<{
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
    }>;
    pagination: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', String(params.page));
        if (params.per_page) queryParams.append('per_page', String(params.per_page));
        if (params.action) queryParams.append('action', params.action);
        if (params.resource_type) queryParams.append('resource_type', params.resource_type);
        if (params.user_id) queryParams.append('user_id', params.user_id);
        return httpClient.get(`/api/activity/list.php?${queryParams.toString()}`);
      default:
        return { success: true, data: { data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 0 } } };
    }
  }

  // === ストレージ使用量 ===
  async getStorageUsage(): Promise<ApiResponse<{
    used: number;
    quota: number;
    percentage: number;
    available: number;
    breakdown: {
      documents: { size: number; count: number };
      images: { size: number; count: number };
      videos: { size: number; count: number };
      audio: { size: number; count: number };
      others: { size: number; count: number };
    };
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/storage/usage.php');
      default:
        return {
          success: true, data: {
            used: 0,
            quota: 1073741824,
            percentage: 0,
            available: 1073741824,
            breakdown: {
              documents: { size: 0, count: 0 },
              images: { size: 0, count: 0 },
              videos: { size: 0, count: 0 },
              audio: { size: 0, count: 0 },
              others: { size: 0, count: 0 }
            }
          }
        };
    }
  }

  // === 検索 ===
  async search(filters: Partial<SearchFilters>, limit: number = 50, offset: number = 0): Promise<ApiResponse<{
    data: SearchResult;
    meta: SearchMeta;
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/search/search.php', {
          query: filters.query || '',
          type: filters.type || 'all',
          file_type: filters.fileType,
          extensions: filters.extensions,
          min_size: filters.minSize,
          max_size: filters.maxSize,
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          folder_id: filters.folderId,
          sort_by: filters.sortBy || 'created_at',
          sort_order: filters.sortOrder || 'DESC',
          limit,
          offset
        });
      default:
        return {
          success: true, data: {
            data: { files: [], folders: [] },
            meta: { total_files: 0, total_folders: 0, total: 0, limit, offset, query: filters.query || '' }
          }
        };
    }
  }

  // === フォルダパス（パンくずナビゲーション）===
  async getFolderPath(folderId: string | null): Promise<ApiResponse<FolderPath>> {
    switch (this.config.backend) {
      case 'xserver':
        const params = folderId ? `?folder_id=${folderId}` : '';
        return httpClient.get(`/api/folders/path.php${params}`);
      default:
        return {
          success: true, data: {
            path: [{ id: null, name: 'ルート', parent_id: null }],
            current: folderId
          }
        };
    }
  }

  // === ファイル/フォルダ移動 ===
  async moveFile(fileId: string, targetFolderId: string | null): Promise<ApiResponse<{ file_id: string; new_folder_id: string | null }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/files/move.php', {
          file_id: fileId,
          target_folder_id: targetFolderId
        });
      default:
        return { success: true, data: { file_id: fileId, new_folder_id: targetFolderId } };
    }
  }

  async moveFolder(folderId: string, targetParentId: string | null): Promise<ApiResponse<{ folder_id: string; new_parent_id: string | null }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/folders/move.php', {
          folder_id: folderId,
          target_parent_id: targetParentId
        });
      default:
        return { success: true, data: { folder_id: folderId, new_parent_id: targetParentId } };
    }
  }

  // === ファイルバージョン管理 ===
  async getFileVersions(fileId: string): Promise<ApiResponse<{
    file: { id: string; name: string; type: string; current_size: number };
    versions: Array<{
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
    }>;
    total_versions: number;
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get(`/api/versions/list.php?file_id=${fileId}`);
      default:
        return {
          success: true, data: {
            file: { id: fileId, name: '', type: '', current_size: 0 },
            versions: [],
            total_versions: 0
          }
        };
    }
  }

  async createFileVersion(fileId: string, file: globalThis.File, comment?: string): Promise<ApiResponse<{
    version_id: string;
    version_number: number;
    size: number;
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_id', fileId);
        if (comment) formData.append('comment', comment);
        return httpClient.postFormData('/api/versions/create.php', formData);
      default:
        return { success: true, data: { version_id: '', version_number: 1, size: file.size } };
    }
  }

  async restoreFileVersion(versionId: string): Promise<ApiResponse<{
    file_id: string;
    restored_version: number;
  }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/versions/restore.php', { version_id: versionId });
      default:
        return { success: true, data: { file_id: '', restored_version: 1 } };
    }
  }

  // === 営業所管理 ===
  async getBranches(): Promise<ApiResponse<Branch[]>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/branches/list.php');
      default:
        // モック実装
        const branches = Array.from(mockStorage.branches.values());
        return { success: true, data: branches };
    }
  }

  async createBranch(data: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    managerId?: string;
    managerName?: string;
    displayOrder?: number;
  }): Promise<ApiResponse<Branch>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/branches/create.php', data);
      default:
        // モック実装
        const newBranch: Branch = {
          id: crypto.randomUUID(),
          name: data.name,
          code: data.code,
          address: data.address,
          phone: data.phone,
          managerId: data.managerId,
          managerName: data.managerName,
          isActive: true,
          displayOrder: data.displayOrder || mockStorage.branches.size + 1,
          userCount: 0,
          departmentCount: 0,
          createdAt: new Date().toISOString()
        };
        mockStorage.branches.set(newBranch.id, newBranch);
        saveMockBranches();
        return { success: true, data: newBranch };
    }
  }

  async updateBranch(id: string, data: {
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    managerId?: string;
    managerName?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Branch>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/branches/update.php', { id, ...data });
      default:
        // モック実装
        const branch = mockStorage.branches.get(id);
        if (!branch) {
          return { success: false, error: '営業所が見つかりません' };
        }
        const updatedBranch = { ...branch, ...data };
        mockStorage.branches.set(id, updatedBranch);
        saveMockBranches();
        return { success: true, data: updatedBranch };
    }
  }

  async deleteBranch(id: string, force?: boolean): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/branches/delete.php', { id, force });
      default:
        // モック実装
        mockStorage.branches.delete(id);
        saveMockBranches();
        return { success: true };
    }
  }

  // === 部署管理 ===
  async getDepartments(branchId?: string): Promise<ApiResponse<Department[]>> {
    switch (this.config.backend) {
      case 'xserver':
        const params = branchId ? `?branch_id=${branchId}` : '';
        return httpClient.get(`/api/departments/list.php${params}`);
      default:
        // モック実装
        let departments = Array.from(mockStorage.departments.values());
        if (branchId) {
          departments = departments.filter(d => d.branchId === branchId);
        }
        // 営業所名を追加
        departments = departments.map(d => {
          const branch = d.branchId ? mockStorage.branches.get(d.branchId) : null;
          return { ...d, branchName: branch?.name };
        });
        return { success: true, data: departments };
    }
  }

  async createDepartment(data: {
    name: string;
    branchId?: string;
    code?: string;
    parentId?: string;
    description?: string;
    managerId?: string;
    displayOrder?: number;
  }): Promise<ApiResponse<Department>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/departments/create.php', data);
      default:
        // モック実装
        const branch = data.branchId ? mockStorage.branches.get(data.branchId) : null;
        const newDepartment: Department = {
          id: crypto.randomUUID(),
          name: data.name,
          branchId: data.branchId,
          branchName: branch?.name,
          code: data.code,
          parentId: data.parentId,
          description: data.description,
          isActive: true,
          displayOrder: data.displayOrder || mockStorage.departments.size + 1,
          userCount: 0,
          createdAt: new Date().toISOString()
        };
        mockStorage.departments.set(newDepartment.id, newDepartment);
        saveMockDepartments();
        return { success: true, data: newDepartment };
    }
  }

  async updateDepartment(id: string, data: {
    name?: string;
    branchId?: string;
    code?: string;
    parentId?: string;
    description?: string;
    managerId?: string;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<ApiResponse<Department>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/departments/update.php', { id, ...data });
      default:
        // モック実装
        const department = mockStorage.departments.get(id);
        if (!department) {
          return { success: false, error: '部署が見つかりません' };
        }
        const branch = data.branchId ? mockStorage.branches.get(data.branchId) : null;
        const updatedDepartment = { ...department, ...data, branchName: branch?.name || department.branchName };
        mockStorage.departments.set(id, updatedDepartment);
        saveMockDepartments();
        return { success: true, data: updatedDepartment };
    }
  }

  async deleteDepartment(id: string, force?: boolean): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/departments/delete.php', { id, force });
      default:
        // モック実装
        mockStorage.departments.delete(id);
        saveMockDepartments();
        return { success: true };
    }
  }

  // === フォルダ権限管理（営業所・部署対応）===
  async getFolderPermissions(folderId: string): Promise<ApiResponse<FolderPermissions>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get(`/api/folders/permissions-list.php?folder_id=${folderId}`);
      default:
        // モック実装
        // 保存された詳細権限を返す、なければ空で初期化して返す
        let perms = mockStorage.detailedPermissions.get(folderId);
        if (!perms) {
          // 下位互換性: Folder.folder_permissions から復元を試みる（ユーザーのみ）
          const folder = mockStorage.folders.get(folderId);
          perms = { users: [], branches: [], departments: [] };
          if (folder) {
            folder.folder_permissions.forEach(fp => {
              const u = mockStorage.users.get(fp.user_id);
              if (u) {
                perms!.users.push({
                  id: crypto.randomUUID(),
                  userId: u.id,
                  userName: u.name,
                  userEmail: u.email,
                  permissionLevel: 'view', // デフォルト
                  createdAt: new Date().toISOString()
                });
              }
            });
          }
          mockStorage.detailedPermissions.set(folderId, perms);
          saveMockPermissions();
        }
        return { success: true, data: perms };
    }
  }

  async grantFolderPermission(data: {
    folderId: string;
    targetType: PermissionTargetType;
    targetId: string;
    permissionLevel: PermissionLevel;
  }): Promise<ApiResponse<{ targetType: string; targetId: string; targetName: string; permissionLevel: string }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/folders/permissions-grant.php', {
          folder_id: data.folderId,
          target_type: data.targetType,
          target_id: data.targetId,
          permission_level: data.permissionLevel
        });
      default:
        // モック実装
        let perms = mockStorage.detailedPermissions.get(data.folderId);
        if (!perms) {
          perms = { users: [], branches: [], departments: [] };
        }

        const id = crypto.randomUUID();
        let targetName = '';

        if (data.targetType === 'user') {
          const user = mockStorage.users.get(data.targetId);
          if (!user) return { success: false, error: 'ユーザーが見つかりません' };

          if (perms.users.some(p => p.userId === data.targetId)) {
            return { success: false, error: '既に権限が付与されています' };
          }

          targetName = user.name;
          perms.users.push({
            id,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            permissionLevel: data.permissionLevel,
            createdAt: new Date().toISOString()
          });

          // FileSystemContext互換性のためFolderオブジェクトも更新
          const folder = mockStorage.folders.get(data.folderId);
          if (folder) {
            if (!folder.folder_permissions.some(p => p.user_id === user.id)) {
              folder.folder_permissions.push({ user_id: user.id });
              // Folder update is in-memory reference, so it's updated. 
              // But we should ensure persistance if we were strict, but folders are persisted elsewhere?
              // No, mockStorage is in-memory. saveMockFolders is missing but other mockUpdate functions update mockStorage.
              // We rely on memory for now.
            }
          }

        } else if (data.targetType === 'branch') {
          const branch = mockStorage.branches.get(data.targetId);
          if (!branch) return { success: false, error: '営業所が見つかりません' };

          if (perms.branches.some(p => p.branchId === data.targetId)) {
            return { success: false, error: '既に権限が付与されています' };
          }

          targetName = branch.name;
          perms.branches.push({
            id,
            branchId: branch.id,
            branchName: branch.name,
            branchCode: branch.code,
            permissionLevel: data.permissionLevel,
            createdAt: new Date().toISOString()
          });
        } else if (data.targetType === 'department') {
          const dept = mockStorage.departments.get(data.targetId);
          if (!dept) return { success: false, error: '部署が見つかりません' };

          if (perms.departments.some(p => p.departmentId === data.targetId)) {
            return { success: false, error: '既に権限が付与されています' };
          }

          targetName = dept.name;
          perms.departments.push({
            id,
            departmentId: dept.id,
            departmentName: dept.name,
            departmentCode: dept.code,
            permissionLevel: data.permissionLevel,
            createdAt: new Date().toISOString()
          });
        }

        mockStorage.detailedPermissions.set(data.folderId, perms);
        saveMockPermissions();

        return {
          success: true,
          data: {
            targetType: data.targetType,
            targetId: data.targetId,
            targetName,
            permissionLevel: data.permissionLevel
          }
        };
    }
  }

  async revokeFolderPermission(data: {
    folderId: string;
    targetType: PermissionTargetType;
    targetId: string;
  }): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/folders/permissions-revoke.php', {
          folder_id: data.folderId,
          target_type: data.targetType,
          target_id: data.targetId
        });
      default:
        let perms = mockStorage.detailedPermissions.get(data.folderId);
        if (!perms) return { success: false, error: '権限が見つかりません' };

        if (data.targetType === 'user') {
          perms.users = perms.users.filter(p => p.userId !== data.targetId);

          // Folderオブジェクトからも削除
          const folder = mockStorage.folders.get(data.folderId);
          if (folder) {
            folder.folder_permissions = folder.folder_permissions.filter(p => p.user_id !== data.targetId);
            // mockStorage.folders.set(data.folderId, folder); // Updates ref
          }
        } else if (data.targetType === 'branch') {
          perms.branches = perms.branches.filter(p => p.branchId !== data.targetId);
        } else if (data.targetType === 'department') {
          perms.departments = perms.departments.filter(p => p.departmentId !== data.targetId);
        }

        mockStorage.detailedPermissions.set(data.folderId, perms);
        saveMockPermissions();
        return { success: true };
    }
  }

  // === Supabase実装 ===
  private async supabaseGetUsers(): Promise<ApiResponse<User[]>> {
    return httpClient.get('/rest/v1/users?select=id,name,role,is_active');
  }

  private async supabaseDeleteUser(userId: string): Promise<ApiResponse<void>> {
    return httpClient.delete(`/rest/v1/users?id=eq.${userId}`);
  }

  private async supabaseGetFolders(): Promise<ApiResponse<Folder[]>> {
    return httpClient.get('/rest/v1/folders?select=*,folder_permissions(*)');
  }

  private async supabaseCreateFolder(data: CreateFolderData): Promise<ApiResponse<Folder>> {
    const response = await httpClient.post<Folder>('/rest/v1/folders', {
      name: data.name,
      created_by: data.created_by,
      created_at: new Date().toISOString()
    });

    if (response.success && response.data) {
      await httpClient.post('/rest/v1/folder_permissions', {
        folder_id: response.data.id,
        user_id: data.created_by
      });
    }

    return response;
  }

  private async supabaseUpdateFolder(data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    return httpClient.put(`/rest/v1/folders?id=eq.${data.folder_id}`, {
      name: data.name
    });
  }

  private async supabaseDeleteFolder(folderId: string): Promise<ApiResponse<void>> {
    await httpClient.delete(`/rest/v1/files?folder_id=eq.${folderId}`);
    await httpClient.delete(`/rest/v1/folder_permissions?folder_id=eq.${folderId}`);
    return httpClient.delete(`/rest/v1/folders?id=eq.${folderId}`);
  }

  private async supabaseUpdateFolderPermissions(data: UpdateFolderPermissionsData): Promise<ApiResponse<void>> {
    if (data.action === 'grant') {
      return httpClient.post('/rest/v1/folder_permissions', {
        folder_id: data.folder_id,
        user_id: data.user_id
      });
    } else {
      return httpClient.delete(`/rest/v1/folder_permissions?folder_id=eq.${data.folder_id}&user_id=eq.${data.user_id}`);
    }
  }

  private async supabaseGetFiles(folderId?: string): Promise<ApiResponse<File[]>> {
    const query = folderId ? `?folder_id=eq.${folderId}` : '';
    return httpClient.get(`/rest/v1/files${query}`);
  }

  private async supabaseUploadFile(data: CreateFileData): Promise<ApiResponse<File>> {
    return httpClient.post('/rest/v1/files', {
      name: data.name,
      type: data.type,
      size: data.size,
      folder_id: data.folder_id,
      created_by: data.created_by,
      storage_path: `${data.folder_id}/${Date.now()}-${data.name}`,
      created_at: new Date().toISOString()
    });
  }

  private async supabaseDeleteFile(fileId: string): Promise<ApiResponse<void>> {
    return httpClient.delete(`/rest/v1/files?id=eq.${fileId}`);
  }

  private async supabaseDownloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    // Supabaseの場合はStorage APIを使用
    return { success: false, error: 'Not implemented for Supabase' };
  }

  // === Xserver実装 ===
  private async xserverGetUsers(): Promise<ApiResponse<User[]>> {
    return httpClient.get('/api/users/list.php');
  }

  private async xserverDeleteUser(userId: string): Promise<ApiResponse<void>> {
    return httpClient.post('/api/users/delete.php', { user_id: userId });
  }

  private async xserverGetFolders(): Promise<ApiResponse<Folder[]>> {
    return httpClient.get('/api/folders/list.php');
  }

  private async xserverCreateFolder(data: CreateFolderData): Promise<ApiResponse<Folder>> {
    return httpClient.post('/api/folders/create.php', {
      name: data.name,
      created_by: data.created_by
    });
  }

  private async xserverUpdateFolder(data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    return httpClient.post('/api/folders/update.php', {
      folder_id: data.folder_id,
      name: data.name
    });
  }

  private async xserverDeleteFolder(folderId: string): Promise<ApiResponse<void>> {
    return httpClient.post('/api/folders/delete.php', { folder_id: folderId });
  }

  private async xserverUpdateFolderPermissions(data: UpdateFolderPermissionsData): Promise<ApiResponse<void>> {
    return httpClient.post('/api/folders/permissions.php', {
      folder_id: data.folder_id,
      user_id: data.user_id,
      action: data.action
    });
  }

  private async xserverGetFiles(folderId?: string): Promise<ApiResponse<File[]>> {
    const params = folderId ? `?folder_id=${folderId}` : '';
    return httpClient.get(`/api/files/list.php${params}`);
  }

  private async xserverUploadFile(data: CreateFileData): Promise<ApiResponse<File>> {
    if (data.file) {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('folder_id', data.folder_id);
      formData.append('created_by', data.created_by);

      return httpClient.postFormData('/api/files/upload.php', formData);
    }

    return httpClient.post('/api/files/create.php', {
      name: data.name,
      type: data.type,
      size: data.size,
      folder_id: data.folder_id,
      created_by: data.created_by
    });
  }

  private async xserverDeleteFile(fileId: string): Promise<ApiResponse<void>> {
    return httpClient.post('/api/files/delete.php', { file_id: fileId });
  }

  private async xserverDownloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    return httpClient.downloadFile(`/api/files/download.php?file_id=${fileId}`);
  }

  // === Mock実装 ===
  private async mockGetUsers(): Promise<ApiResponse<User[]>> {
    return { success: true, data: Array.from(mockStorage.users.values()) };
  }

  private async mockDeleteUser(userId: string): Promise<ApiResponse<void>> {
    mockStorage.users.delete(userId);

    // フォルダ権限からも削除
    mockStorage.folders.forEach(folder => {
      folder.folder_permissions = folder.folder_permissions.filter(p => p.user_id !== userId);
    });

    return { success: true };
  }

  private async mockGetFolders(): Promise<ApiResponse<Folder[]>> {
    return { success: true, data: Array.from(mockStorage.folders.values()) };
  }

  private async mockCreateFolder(data: CreateFolderData): Promise<ApiResponse<Folder>> {
    const folder: Folder = {
      id: crypto.randomUUID(),
      name: data.name,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      folder_permissions: [{ user_id: data.created_by }]
    };
    mockStorage.folders.set(folder.id, folder);
    return { success: true, data: folder };
  }

  private async mockUpdateFolder(data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    const folder = mockStorage.folders.get(data.folder_id);
    if (!folder) {
      return { success: false, error: 'フォルダが見つかりません' };
    }
    folder.name = data.name;
    mockStorage.folders.set(data.folder_id, folder);
    return { success: true, data: folder };
  }

  private async mockDeleteFolder(folderId: string): Promise<ApiResponse<void>> {
    mockStorage.folders.delete(folderId);

    // 関連ファイルも削除
    mockStorage.files.forEach((file, fileId) => {
      if (file.folder_id === folderId) {
        mockStorage.files.delete(fileId);
      }
    });

    return { success: true };
  }

  private async mockUpdateFolderPermissions(data: UpdateFolderPermissionsData): Promise<ApiResponse<void>> {
    const folder = mockStorage.folders.get(data.folder_id);
    if (!folder) {
      return { success: false, error: 'フォルダが見つかりません' };
    }

    if (data.action === 'grant') {
      if (!folder.folder_permissions.some(p => p.user_id === data.user_id)) {
        folder.folder_permissions.push({ user_id: data.user_id });
      }
    } else {
      folder.folder_permissions = folder.folder_permissions.filter(p => p.user_id !== data.user_id);
    }

    mockStorage.folders.set(data.folder_id, folder);
    return { success: true };
  }

  private async mockGetFiles(folderId?: string): Promise<ApiResponse<File[]>> {
    let files = Array.from(mockStorage.files.values());
    if (folderId) {
      files = files.filter(f => f.folder_id === folderId);
    }
    return { success: true, data: files };
  }

  private async mockUploadFile(data: CreateFileData): Promise<ApiResponse<File>> {
    const file: File = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      size: data.size,
      folder_id: data.folder_id,
      created_by: data.created_by,
      storage_path: `${data.folder_id}/${Date.now()}-${data.name}`,
      created_at: new Date().toISOString()
    };
    mockStorage.files.set(file.id, file);
    return { success: true, data: file };
  }

  private async mockDeleteFile(fileId: string): Promise<ApiResponse<void>> {
    mockStorage.files.delete(fileId);
    return { success: true };
  }

  private async mockDownloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    const file = mockStorage.files.get(fileId);
    if (!file) {
      return { success: false, error: 'ファイルが見つかりません' };
    }

    // モック用のダミーコンテンツ
    const blob = new Blob(['Mock file content'], { type: 'text/plain' });
    return { success: true, blob, filename: file.name };
  }

  // === Notices Mock ===
  private async mockGetNotices(): Promise<ApiResponse<Notice[]>> {
    const notices = Array.from(mockStorage.notices.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return { success: true, data: notices };
  }

  private async mockAddNotice(noticeData: Omit<Notice, 'id' | 'date'>): Promise<ApiResponse<Notice>> {
    const newNotice: Notice = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      ...noticeData
    };
    mockStorage.notices.set(newNotice.id, newNotice);
    saveMockNotices();
    return { success: true, data: newNotice };
  }

  private async mockDeleteNotice(id: string): Promise<ApiResponse<void>> {
    mockStorage.notices.delete(id);
    saveMockNotices();
    return { success: true };
  }

  // === モックストレージ操作用ヘルパー ===
  addUserToMockStorage(user: User) {
    mockStorage.users.set(user.id, user);
  }

  removeUserFromMockStorage(userId: string) {
    mockStorage.users.delete(userId);
  }

  getMockStorage() {
    return mockStorage;
  }

  initializeDefaultFolder(userId: string) {
    if (mockStorage.folders.size === 0) {
      const defaultFolder: Folder = {
        id: '1',
        name: '共有フォルダ',
        created_by: userId,
        created_at: new Date().toISOString(),
        folder_permissions: [{ user_id: userId }]
      };
      mockStorage.folders.set(defaultFolder.id, defaultFolder);
    }
  }
}

// グローバルファイルシステムAPIクライアント
export const fileSystemApi = new FileSystemApiClient();
