import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { User, Folder, File, UserRole, isSuperAdmin, Notice } from '../types';
import { fileSystemApi } from '../utils/fileSystemApi';

interface FileSystemContextProps {
  users: User[];
  folders: Folder[];
  files: File[];
  currentUser: User;
  currentFolderId: string | null;
  switchUser: (userId: number) => void;
  addFolder: (folderName: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  updateFolderPermissions: (folderId: string, userId: string) => Promise<void>;
  addFile: (fileName: string, fileType: string, folderId: string, file?: globalThis.File) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  downloadFile: (fileId: string, fileName: string) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  setCurrentFolder: (folderId: string | null) => void;
  deleteUser: (userId: string) => Promise<void>;
  createUser: (data: { email: string; password: string; name: string; role?: UserRole; branch_id?: string; department_id?: string }) => Promise<void>;
  updateUser: (userId: string, data: { name?: string; email?: string; role?: UserRole; branch_id?: string; department_id?: string; is_active?: boolean; password?: string }) => Promise<void>;
  refreshUsers: () => Promise<void>;
  getFileDataUrl: (fileId: string) => string | null;
  notices: Notice[];
  addNotice: (title: string, content: string, category: Notice['category']) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
}

export const FileSystemContext = createContext<FileSystemContextProps | undefined>(undefined);

// Custom hook for using the FileSystem context
export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (context === undefined) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};

// Mock data storage
const mockStorage = {
  users: new Map<string, User>(),
  folders: new Map<string, Folder>(),
  files: new Map<string, File>()
};

// File data storage (blob URLs stored in memory, not localStorage)
const fileDataStorage = new Map<string, string>();

// Get file data URL
export const getFileDataUrlFromStorage = (fileId: string): string | null => {
  return fileDataStorage.get(fileId) || null;
};

// Subscribe to user changes
const userSubscriptions = new Set<() => void>();

export const subscribeToUserChanges = (callback: () => void) => {
  userSubscriptions.add(callback);
  return () => userSubscriptions.delete(callback);
};

export const notifyUserChanges = () => {
  userSubscriptions.forEach(callback => callback());
};

export const addUserToStorage = (id: string, name: string, role: UserRole, email: string) => {
  mockStorage.users.set(id, {
    id,
    name,
    email,
    role,
    isActive: true
  });
  notifyUserChanges();
};

export const removeUserFromStorage = (userId: string) => {
  mockStorage.users.delete(userId);
  notifyUserChanges();
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  // Sync mock storage with state
  const syncStorage = () => {
    setUsers(Array.from(mockStorage.users.values()));
    setFolders(Array.from(mockStorage.folders.values()));
    setFiles(Array.from(mockStorage.files.values()));
  };

  // Subscribe to user changes
  useEffect(() => {
    const unsubscribe = subscribeToUserChanges(syncStorage);
    return () => { unsubscribe(); };
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await fileSystemApi.getNotices();
      if (response.success && response.data) {
        setNotices(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    }
  };

  // Initialize with mock data when session changes
  useEffect(() => {
    if (session) {
      // Add current user to mock storage if not exists
      const user: User = {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        isActive: true
      };
      mockStorage.users.set(session.id, user);
      notifyUserChanges();

      // Initialize folders if none exist
      if (mockStorage.folders.size === 0) {
        const defaultFolder: Folder = {
          id: '1',
          name: '共有フォルダ',
          created_by: session.id,
          created_at: new Date().toISOString(),
          folder_permissions: [{ user_id: session.id }]
        };
        mockStorage.folders.set(defaultFolder.id, defaultFolder);
        syncStorage();
      }
      fetchNotices();
    }
  }, [session]);

  // Get current user from session
  const currentUser = session ? {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    isActive: true
  } : {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@example.com',
    role: 'user' as const,
    isActive: false
  };

  const addFolder = async (folderName: string) => {
    if (!folderName.trim() || !session) {
      toast.error('フォルダ名を入力してください');
      return;
    }

    try {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: folderName,
        created_by: session.id,
        created_at: new Date().toISOString(),
        folder_permissions: [{ user_id: session.id }]
      };

      mockStorage.folders.set(newFolder.id, newFolder);
      syncStorage();
      toast.success('フォルダを作成しました');
    } catch (error) {
      toast.error('フォルダの作成に失敗しました');
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      mockStorage.folders.delete(folderId);

      // Delete associated files
      const filesToDelete = Array.from(mockStorage.files.values())
        .filter(file => file.folder_id === folderId);

      filesToDelete.forEach(file => {
        mockStorage.files.delete(file.id);
      });

      syncStorage();

      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }

      toast.success('フォルダを削除しました');
    } catch (error) {
      toast.error('フォルダの削除に失敗しました');
    }
  };

  const updateFolderPermissions = async (folderId: string, userId: string) => {
    try {
      const folder = mockStorage.folders.get(folderId);
      if (!folder) return;

      const hasPermission = folder.folder_permissions.some(p => p.user_id === userId);
      const newPermissions = hasPermission
        ? folder.folder_permissions.filter(p => p.user_id !== userId)
        : [...folder.folder_permissions, { user_id: userId }];

      const updatedFolder = {
        ...folder,
        folder_permissions: newPermissions
      };

      mockStorage.folders.set(folderId, updatedFolder);
      syncStorage();
      toast.success('権限を更新しました');
    } catch (error) {
      toast.error('権限の更新に失敗しました');
    }
  };

  const addFile = async (fileName: string, fileType: string, folderId: string, file?: globalThis.File) => {
    if (!fileName.trim() || !folderId || !session) {
      toast.error('必要な情報が不足しています');
      return;
    }

    try {
      const fileId = crypto.randomUUID();
      const newFile = {
        id: fileId,
        name: fileName,
        type: fileType,
        size: file?.size || 0,
        folder_id: folderId,
        created_by: session.id,
        storage_path: `${folderId}/${Date.now()}-${fileName}`,
        created_at: new Date().toISOString()
      };

      // Store actual file data if available (wait for it to complete)
      if (file) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              fileDataStorage.set(fileId, reader.result as string);
            }
            resolve();
          };
          reader.onerror = () => {
            console.error('Failed to read file:', fileName);
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      mockStorage.files.set(newFile.id, newFile);
      syncStorage();
      toast.success('ファイルを追加しました');
    } catch (error) {
      toast.error('ファイルの追加に失敗しました');
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      mockStorage.files.delete(fileId);
      // Also remove file data
      fileDataStorage.delete(fileId);
      syncStorage();
      toast.success('ファイルを削除しました');
    } catch (error) {
      toast.error('ファイルの削除に失敗しました');
    }
  };

  const getFileDataUrl = (fileId: string): string | null => {
    return fileDataStorage.get(fileId) || null;
  };

  const renameFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('ファイル名を入力してください');
      return;
    }

    try {
      const file = mockStorage.files.get(fileId);
      if (!file) throw new Error('File not found');

      // Preserve file extension if not provided in new name
      let finalName = newName;
      if (file.name.includes('.')) {
        const extension = file.name.split('.').pop();
        if (extension && !newName.toLowerCase().endsWith(`.${extension.toLowerCase()}`)) {
          finalName = `${newName}.${extension}`;
        }
      }

      const updatedFile = { ...file, name: finalName };
      mockStorage.files.set(fileId, updatedFile);
      syncStorage();
      toast.success('ファイル名を変更しました');
    } catch (error) {
      toast.error('ファイル名の変更に失敗しました');
    }
  };

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      // Check if we have stored file data
      const dataUrl = fileDataStorage.get(fileId);
      let url: string;
      let shouldRevoke = false;

      if (dataUrl) {
        // Use stored file data
        url = dataUrl;
      } else {
        // Create a dummy blob for demonstration since we don't have real file storage
        const content = `This is a sample content for ${fileName}.\n\nIn a real application, this would fetch the actual file data from storage.`;
        const blob = new Blob([content], { type: 'text/plain' });
        url = window.URL.createObjectURL(blob);
        shouldRevoke = true;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      if (shouldRevoke) {
        window.URL.revokeObjectURL(url);
      }

      toast.success('ダウンロードを開始しました');
    } catch (error) {
      toast.error('ダウンロードに失敗しました');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // 全権管理者を削除しようとした場合はエラー
      const user = mockStorage.users.get(userId);
      if (user && isSuperAdmin(user.role as UserRole)) {
        toast.error('全権管理者は削除できません');
        return;
      }

      // 現在ログイン中のユーザーを削除しようとした場合はエラー
      if (userId === currentUser.id) {
        toast.error('ログイン中のユーザーは削除できません');
        return;
      }

      // ユーザーに関連するフォルダの権限を削除
      Array.from(mockStorage.folders.values()).forEach(folder => {
        const updatedPermissions = folder.folder_permissions.filter(p => p.user_id !== userId);
        mockStorage.folders.set(folder.id, {
          ...folder,
          folder_permissions: updatedPermissions
        });
      });

      // ユーザーを削除
      removeUserFromStorage(userId);
      toast.success('ユーザーを削除しました');
    } catch (error) {
      toast.error('ユーザーの削除に失敗しました');
    }
  };

  // ユーザー一覧を再取得
  const refreshUsers = async () => {
    try {
      const response = await fileSystemApi.getUsers();
      if (response.success && response.data) {
        // APIから取得したユーザーでモックストレージを更新
        mockStorage.users.clear();
        response.data.forEach(user => {
          mockStorage.users.set(user.id, user);
        });
        syncStorage();
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  };

  // 管理者用ユーザー作成
  const createUser = async (data: { email: string; password: string; name: string; role?: UserRole; branch_id?: string; department_id?: string }) => {
    try {
      const response = await fileSystemApi.createUser(data);
      if (response.success && response.data) {
        // 新しいユーザーをモックストレージに追加
        // APIからの完全なユーザーデータを保存
        const newUser = response.data;
        mockStorage.users.set(newUser.id, newUser);
        syncStorage();
        toast.success('ユーザーを作成しました');
      } else {
        throw new Error(response.error || 'ユーザーの作成に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('ユーザーの作成に失敗しました');
      }
      throw error;
    }
  };

  const updateUser = async (userId: string, data: { name?: string; email?: string; role?: UserRole; branch_id?: string; department_id?: string; is_active?: boolean; password?: string }) => {
    try {
      const response = await fileSystemApi.updateUser(userId, data);
      if (response.success && response.data) {
        // 更新されたユーザーをモックストレージに反映
        const updatedUser = response.data;
        mockStorage.users.set(updatedUser.id, updatedUser);
        syncStorage();
        toast.success('ユーザー情報を更新しました');
      } else {
        throw new Error(response.error || 'ユーザーの更新に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('ユーザーの更新に失敗しました');
      }
      throw error;
    }
  };

  const addNotice = async (title: string, content: string, category: Notice['category']) => {
    try {
      const response = await fileSystemApi.addNotice({
        title,
        content,
        category,
        importance: 'normal' // Default importance
      });
      if (response.success) {
        toast.success('お知らせを追加しました');
        await fetchNotices();
      } else {
        toast.error(response.error || 'お知らせの追加に失敗しました');
      }
    } catch (error) {
      console.error('Error adding notice:', error);
      toast.error('お知らせの追加中にエラーが発生しました');
    }
  };

  const deleteNotice = async (id: string) => {
    try {
      const response = await fileSystemApi.deleteNotice(id);
      if (response.success) {
        toast.success('お知らせを削除しました');
        await fetchNotices();
      } else {
        toast.error(response.error || 'お知らせの削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('お知らせの削除中にエラーが発生しました');
    }
  };

  const switchUser = (userId: number) => {
    // This is now handled by auth context
    console.warn('User switching is now handled by authentication');
  };

  const setCurrentFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const value = {
    users,
    folders,
    files,
    currentUser,
    currentFolderId,
    switchUser,
    addFolder,
    deleteFolder,
    updateFolderPermissions,
    addFile,
    renameFile,
    downloadFile,
    deleteFile,
    setCurrentFolder,
    deleteUser,
    createUser,
    updateUser,
    refreshUsers,
    getFileDataUrl,
    notices,
    addNotice,
    deleteNotice
  };

  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};