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

// Mock Storage Removed


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
        return { success: true, data: [] };
    }
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteUser(userId);
      case 'xserver':
        return this.xserverDeleteUser(userId);
      default:
        return { success: false, error: 'Not implemented' };
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
        return { success: false, error: 'Not implemented' };
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
        return { success: false, error: 'Not implemented' };
    }
  }

  // === フォルダー管理 ===
  async getFolders(folderId?: string): Promise<ApiResponse<Folder[]>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseGetFolders();
      case 'xserver':
        return this.xserverGetFolders(arguments[0]);
      default:
        return { success: true, data: [] };
    }
  }

  async createFolder(data: CreateFolderData): Promise<ApiResponse<Folder>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseCreateFolder(data);
      case 'xserver':
        return this.xserverCreateFolder(data);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async updateFolder(data: UpdateFolderData): Promise<ApiResponse<Folder>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUpdateFolder(data);
      case 'xserver':
        return this.xserverUpdateFolder(data);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteFolder(folderId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteFolder(folderId);
      case 'xserver':
        return this.xserverDeleteFolder(folderId);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // === お知らせ管理 ===
  async getNotices(): Promise<ApiResponse<Notice[]>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get('/api/notices/list.php');
      default:
        return { success: true, data: [] };
    }
  }

  async addNotice(notice: Omit<Notice, 'id' | 'date'>): Promise<ApiResponse<Notice>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/notices/create.php', notice);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteNotice(id: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/notices/delete.php', { id });
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async updateFolderPermissions(data: UpdateFolderPermissionsData): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUpdateFolderPermissions(data);
      case 'xserver':
        return this.xserverUpdateFolderPermissions(data);
      default:
        return { success: false, error: 'Not implemented' };
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
        return { success: true, data: [] };
    }
  }

  async uploadFile(data: CreateFileData): Promise<ApiResponse<File>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseUploadFile(data);
      case 'xserver':
        return this.xserverUploadFile(data);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDeleteFile(fileId);
      case 'xserver':
        return this.xserverDeleteFile(fileId);
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  async downloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    switch (this.config.backend) {
      case 'supabase':
        return this.supabaseDownloadFile(fileId);
      case 'xserver':
        return this.xserverDownloadFile(fileId);
      default:
        return { success: false, error: 'Not implemented' };
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

  // === ファイル/フォルダ名変更 ===
  async renameFile(fileId: string, newName: string): Promise<ApiResponse<{ id: string; name: string }>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/files/rename.php', { file_id: fileId, name: newName });
      default:
        // Mock fallback if needed
        return { success: false, error: 'Not implemented' };
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
        return { success: true, data: [] };
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
        return { success: false, error: 'Not implemented' };
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
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteBranch(id: string, force?: boolean): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/branches/delete.php', { id, force });
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // === 部署管理 ===
  async getDepartments(branchId?: string): Promise<ApiResponse<Department[]>> {
    switch (this.config.backend) {
      case 'xserver':
        const params = branchId ? `?branch_id=${branchId}` : '';
        return httpClient.get(`/api/departments/list.php${params}`);
      default:
        return { success: true, data: [] };
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
        return { success: false, error: 'Not implemented' };
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
        return { success: false, error: 'Not implemented' };
    }
  }

  async deleteDepartment(id: string, force?: boolean): Promise<ApiResponse<void>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.post('/api/departments/delete.php', { id, force });
      default:
        return { success: false, error: 'Not implemented' };
    }
  }

  // === フォルダ権限管理（営業所・部署対応）===
  async getFolderPermissions(folderId: string): Promise<ApiResponse<FolderPermissions>> {
    switch (this.config.backend) {
      case 'xserver':
        return httpClient.get(`/api/folders/permissions-list.php?folder_id=${folderId}`);
      default:
        // モック実装
        return { success: true, data: { users: [], branches: [], departments: [] } };
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
        return { success: false, error: 'Not implemented' };
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
        return { success: false, error: 'Not implemented' };
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

  private async supabaseDownloadFile(_fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
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

  private async xserverGetFolders(folderId?: string): Promise<ApiResponse<Folder[]>> {
    const params = folderId ? `?parent_id=${folderId}` : '';
    return httpClient.get(`/api/folders/list.php${params}`);
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

      return httpClient.postFormData('/api/files/file_upload.php', formData);
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
    return httpClient.post('/api/files/file_delete.php', { file_id: fileId });
  }

  private async xserverDownloadFile(fileId: string): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    return httpClient.downloadFile(`/api/files/download.php?file_id=${fileId}`);
  }

  // Mock implementation removed


}

// グローバルファイルシステムAPIクライアント
export const fileSystemApi = new FileSystemApiClient();
