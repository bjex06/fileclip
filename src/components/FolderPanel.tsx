import React, { useState } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { useAuth } from '../context/AuthContext';
import { Folder, FolderPlus, Trash, Shield } from 'lucide-react';
import FolderPermissionModal from './FolderPermissionModal';
import { UserRole, isAdmin } from '../types';

const FolderPanel: React.FC = () => {
  const {
    folders,
    currentFolderId,
    addFolder,
    deleteFolder,
    setCurrentFolder
  } = useFileSystem();

  const { session } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [permissionModalFolder, setPermissionModalFolder] = useState<{ id: string; name: string } | null>(null);

  // Filter folders based on user permissions
  const accessibleFolders = folders.filter(folder =>
    folder.folder_permissions.some(p => p.user_id === session?.id) ||
    folder.created_by === session?.id
  );

  const handleAddFolder = async () => {
    if (newFolderName.trim()) {
      await addFolder(newFolderName);
      setNewFolderName('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex-1 flex flex-col overflow-hidden transition-all">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center">
          <Folder size={18} className="mr-2 text-orange-500" />
          フォルダ
        </h2>

        {isAdmin(session?.role as UserRole) && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
            title="新規フォルダ作成"
          >
            <FolderPlus size={16} />
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="mb-3 p-3 bg-orange-50 rounded-md border border-orange-100 animate-fadeIn">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="フォルダ名を入力"
            className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddFolder}
              className="flex-1 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              作成
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewFolderName('');
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {accessibleFolders.length >= 0 ? (
          <ul className="space-y-1">
            <li className="animate-fadeIn">
              <div
                className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${currentFolderId === null
                  ? 'bg-orange-50 border border-orange-200'
                  : 'hover:bg-gray-50 border border-transparent'
                  }`}
                onClick={() => setCurrentFolder(null)}
              >
                <div className={`mr-2 flex items-center justify-center w-[18px] ${currentFolderId === null ? 'text-orange-500' : 'text-gray-400'}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <span className="flex-1 truncate font-medium">ホーム</span>
              </div>
            </li>
            {accessibleFolders.map(folder => (
              <li key={folder.id} className="animate-fadeIn">
                <div
                  className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${currentFolderId === folder.id
                    ? 'bg-orange-50 border border-orange-200'
                    : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  onClick={() => setCurrentFolder(folder.id)}
                >
                  <Folder
                    size={18}
                    className={`mr-2 ${currentFolderId === folder.id ? 'text-orange-500' : 'text-gray-400'
                      }`}
                  />
                  <span className="flex-1 truncate">{folder.name}</span>

                  {isAdmin(session?.role as UserRole) && (
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPermissionModalFolder({ id: folder.id, name: folder.name });
                        }}
                        className="p-1 rounded hover:bg-purple-100 transition-colors"
                        title="詳細権限管理"
                      >
                        <Shield size={16} className="text-purple-500" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`「${folder.name}」フォルダを削除しますか？`)) {
                            deleteFolder(folder.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="削除"
                      >
                        <Trash size={16} className="text-gray-500 hover:text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Folder size={32} className="mb-2 opacity-50" />
            <p className="text-sm">表示できるフォルダがありません</p>
          </div>
        )}
      </div>

      {/* 権限管理モーダル */}
      {permissionModalFolder && (
        <FolderPermissionModal
          folderId={permissionModalFolder.id}
          folderName={permissionModalFolder.name}
          onClose={() => setPermissionModalFolder(null)}
        />
      )}
    </div>
  );
};

export default FolderPanel;