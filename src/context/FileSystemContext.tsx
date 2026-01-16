import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { User, Folder, File, UserRole, Notice } from '../types';
import { fileSystemApi } from '../utils/fileSystemApi';
import { getApiConfig } from '../utils/api';
import { sessionStorage } from '../utils/auth';

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
  refreshFolders: () => Promise<void>;
  refreshFiles: () => Promise<void>;
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

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  // Initialize data when session changes
  useEffect(() => {
    if (session) {
      refreshData();
    } else {
      setUsers([]);
      setFolders([]);
      setFiles([]);
      setNotices([]);
    }
  }, [session]);

  const refreshData = async () => {
    await Promise.all([
      refreshUsers(),
      refreshFolders(),
      refreshFiles(), // Will fetch for root or current folder
      fetchNotices()
    ]);
  };

  const refreshUsers = async () => {
    try {
      const response = await fileSystemApi.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  };

  const refreshFolders = async () => {
    try {
      const response = await fileSystemApi.getFolders();
      if (response.success && response.data) {
        setFolders(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh folders:', error);
    }
  };

  const refreshFiles = async () => {
    try {
      const response = await fileSystemApi.getFiles(currentFolderId || undefined);
      if (response.success && response.data) {
        setFiles(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  };

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
      const response = await fileSystemApi.createFolder({
        name: folderName,
        created_by: session.id
      });

      if (response.success) {
        await refreshFolders();
        toast.success('フォルダを作成しました');
      } else {
        throw new Error(response.error || 'フォルダの作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('フォルダの作成に失敗しました');
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const response = await fileSystemApi.deleteFolder(folderId);

      if (response.success) {
        if (currentFolderId === folderId) {
          setCurrentFolderId(null);
        }
        await refreshFolders();
        toast.success('フォルダを削除しました');
      } else {
        throw new Error(response.error || 'フォルダの削除に失敗しました');
      }
    } catch (error) {
      toast.error('フォルダの削除に失敗しました');
    }
  };

  const updateFolderPermissions = async (folderId: string, userId: string) => {
    // Current UI seems to toggle permission. 
    // We need to check if user has permission first.
    // However, getting permissions for a folder requires checking the folder object or fetching permissions.
    // The folder object in state has 'folder_permissions'.

    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const hasPermission = folder.folder_permissions?.some(p => p.user_id === userId);
    const action = hasPermission ? 'revoke' : 'grant';

    try {
      const response = await fileSystemApi.updateFolderPermissions({
        folder_id: folderId,
        user_id: userId,
        action
      });

      if (response.success) {
        await refreshFolders();
        toast.success('権限を更新しました');
      } else {
        throw new Error(response.error || '権限の更新に失敗しました');
      }

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
      const response = await fileSystemApi.uploadFile({
        name: fileName,
        type: fileType,
        folder_id: folderId,
        created_by: session.id,
        size: file?.size || 0,
        file: file
      });

      if (response.success) {
        await refreshFiles();
        toast.success('ファイルを追加しました');
      } else {
        throw new Error(response.error || 'ファイルの追加に失敗しました');
      }
    } catch (error) {
      toast.error('ファイルの追加に失敗しました');
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const response = await fileSystemApi.deleteFile(fileId);
      if (response.success) {
        await refreshFiles();
        toast.success('ファイルをゴミ箱に移動しました');
      } else {
        throw new Error(response.error || 'ファイルの削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('ファイルの削除に失敗しました');
    }
  };

  const getFileDataUrl = (fileId: string): string | null => {
    // For Xserver, return the preview API URL
    const config = getApiConfig();
    if (config.backend === 'xserver') {
      const token = sessionStorage.getToken() || '';
      return `${config.baseUrl}/api/files/preview.php?file_id=${fileId}&token=${token}`;
    }
    return null;
  };

  const renameFile = async (fileId: string, newName: string) => {
    try {
      const response = await fileSystemApi.renameFile(fileId, newName);
      if (response.success) {
        await refreshFiles();
        toast.success('ファイル名を変更しました');
      } else {
        throw new Error(response.error || 'ファイル名の変更に失敗しました');
      }
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('ファイル名の変更に失敗しました');
    }
  };

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fileSystemApi.downloadFile(fileId);
      if (response.success && response.blob) {
        // Create object URL and trigger download
        const url = window.URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.filename || fileName;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success('ダウンロードを開始しました');
      } else {
        throw new Error(response.error || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      toast.error('ダウンロードに失敗しました');
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Prevent deleting self
      if (userId === currentUser.id) {
        toast.error('ログイン中のユーザーは削除できません');
        return;
      }

      const response = await fileSystemApi.deleteUser(userId);

      if (response.success) {
        await refreshUsers();
        toast.success('ユーザーを削除しました');
      } else {
        throw new Error(response.error || 'ユーザーの削除に失敗しました');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('ユーザーの削除に失敗しました');
      }
    }
  };


  // 管理者用ユーザー作成
  const createUser = async (data: { email: string; password: string; name: string; role?: UserRole; branch_id?: string; department_id?: string }) => {
    try {
      const response = await fileSystemApi.createUser(data);
      if (response.success) {
        await refreshUsers();
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
      if (response.success) {
        await refreshUsers();
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
        importance: 'normal'
      });
      if (response.success) {
        await fetchNotices();
        toast.success('お知らせを追加しました');
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
        await fetchNotices();
        toast.success('お知らせを削除しました');
      } else {
        toast.error(response.error || 'お知らせの削除に失敗しました');
      }
    } catch (error) {
      console.error('Error deleting notice:', error);
      toast.error('お知らせの削除中にエラーが発生しました');
    }
  };

  const switchUser = (_userId: number) => {
    console.warn('User switching is now handled by authentication');
  };

  const setCurrentFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    // Trigger file refresh for new folder
    // Uses useEffect to watch currentFolderId? No, need to trigger manually or use useEffect.
    // In refreshFiles, we use currentFolderId state.
    // IMPORTANT: State update is async.
    // We should probably rely on useEffect [currentFolderId] to refresh files.
  };

  // Add useEffect for currentFolderId change
  useEffect(() => {
    if (session) {
      refreshFiles();
    }
  }, [currentFolderId]);


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
    refreshFolders,
    refreshFiles,
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