import React from 'react';
import { File, Folder } from '../types';

interface FileGridProps {
  files: File[];
  folders: Folder[];
  selectedItems: Set<string>;
  onSelectFile: (fileId: string, multi?: boolean) => void;
  onSelectFolder: (folderId: string, multi?: boolean) => void;
  onOpenFile: (file: File) => void;
  onOpenFolder: (folderId: string) => void;
  onContextMenu?: (e: React.MouseEvent, type: 'file' | 'folder', id: string) => void;
}

const FileGrid: React.FC<FileGridProps> = ({
  files,
  folders,
  selectedItems,
  onSelectFile,
  onSelectFolder,
  onOpenFile,
  onOpenFolder,
  onContextMenu
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, name: string): string => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎬';
    if (type?.startsWith('audio/')) return '🎵';
    if (type === 'application/pdf') return '📄';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('sheet') || type?.includes('excel')) return '📊';
    if (type?.includes('presentation') || type?.includes('powerpoint')) return '📽️';
    if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z')) return '📦';
    if (name.endsWith('.json')) return '📋';
    if (name.endsWith('.xml')) return '📋';
    if (name.endsWith('.md')) return '📝';
    if (type?.startsWith('text/')) return '📝';
    return '📄';
  };

  const getFileExtension = (name: string): string => {
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  };

  const getThumbnailBgColor = (type: string): string => {
    if (type?.startsWith('image/')) return 'bg-pink-100';
    if (type?.startsWith('video/')) return 'bg-purple-100';
    if (type?.startsWith('audio/')) return 'bg-yellow-100';
    if (type === 'application/pdf') return 'bg-red-100';
    if (type?.includes('word') || type?.includes('document')) return 'bg-blue-100';
    if (type?.includes('sheet') || type?.includes('excel')) return 'bg-green-100';
    return 'bg-gray-100';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4">
      {/* フォルダ */}
      {folders.map((folder) => {
        const isSelected = selectedItems.has(`folder-${folder.id}`);
        return (
          <div
            key={`folder-${folder.id}`}
            className={`group relative rounded-lg border-2 transition-all cursor-pointer ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
            }`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                onSelectFolder(folder.id, true);
              } else {
                onSelectFolder(folder.id);
              }
            }}
            onDoubleClick={() => onOpenFolder(folder.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu?.(e, 'folder', folder.id);
            }}
          >
            <div className="p-4 flex flex-col items-center">
              {/* フォルダアイコン */}
              <div className="w-16 h-16 flex items-center justify-center text-5xl mb-2">
                📁
              </div>
              {/* フォルダ名 */}
              <p className="text-sm text-center truncate w-full font-medium">
                {folder.name}
              </p>
            </div>
            {/* 選択チェックマーク */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* ファイル */}
      {files.map((file) => {
        const isSelected = selectedItems.has(`file-${file.id}`);
        const extension = getFileExtension(file.name);
        return (
          <div
            key={`file-${file.id}`}
            className={`group relative rounded-lg border-2 transition-all cursor-pointer ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
            }`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                onSelectFile(file.id, true);
              } else {
                onSelectFile(file.id);
              }
            }}
            onDoubleClick={() => onOpenFile(file)}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu?.(e, 'file', file.id);
            }}
          >
            <div className="p-4 flex flex-col items-center">
              {/* サムネイル/アイコン */}
              <div
                className={`w-16 h-16 flex items-center justify-center text-4xl mb-2 rounded-lg ${getThumbnailBgColor(
                  file.type
                )}`}
              >
                {getFileIcon(file.type, file.name)}
              </div>
              {/* ファイル名 */}
              <p className="text-sm text-center truncate w-full" title={file.name}>
                {file.name}
              </p>
              {/* サイズと拡張子 */}
              <p className="text-xs text-gray-500 mt-1">
                {extension && <span className="mr-2">{extension}</span>}
                {formatFileSize(file.size)}
              </p>
            </div>
            {/* 選択チェックマーク */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* 空の場合 */}
      {folders.length === 0 && files.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          <span className="text-6xl mb-4 block">📂</span>
          <p>このフォルダは空です</p>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
