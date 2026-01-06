import React, { useState, useMemo } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { File as FileIcon, Upload, Trash, Download, Image, FileText, FileSpreadsheet, Video, Edit2, X, Check, Eye, ArrowUpDown, Calendar, FileType, HardDrive, LayoutGrid, List } from 'lucide-react';
import FileUploadModal from './modals/FileUploadModal';
import FilePreviewModal from './modals/FilePreviewModal';
import Dashboard from './Dashboard';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { UserRole, isAdmin, File } from '../types';

interface FilePanelProps {
  searchQuery?: string;
}

type SortOption = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' | 'size_asc' | 'size_desc' | 'type';
type ViewMode = 'grid' | 'list';

const sortLabels: Record<SortOption, string> = {
  name_asc: '名前（A→Z）',
  name_desc: '名前（Z→A）',
  date_desc: '新しい順',
  date_asc: '古い順',
  size_desc: 'サイズ（大→小）',
  size_asc: 'サイズ（小→大）',
  type: 'ファイル種類',
};

const FilePanel: React.FC<FilePanelProps> = ({ searchQuery = '' }) => {
  const {
    folders,
    files,
    currentUser,
    currentFolderId,
    deleteFile,
    users,
    renameFile,
    downloadFile
  } = useFileSystem();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<globalThis.File[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: File } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Renaming State
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = (e: React.MouseEvent, file: File) => {
    e.stopPropagation();
    e.preventDefault();
    setRenamingId(file.id);
    setRenameValue(file.name);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    await renameFile(renamingId, renameValue);
    setRenamingId(null);
  };

  const handleDownload = async (e: React.MouseEvent, file: File) => {
    e.stopPropagation();
    e.preventDefault();
    await downloadFile(file.id, file.name);
  };

  // Get current folder
  const currentFolder = folders.find(folder => folder.id === currentFolderId);

  // Filter logic: Search Mode vs Folder Mode
  const isSearchMode = searchQuery.trim().length > 0;

  // Accessible folders check (for search)
  const accessibleFolderIds = folders
    .filter(f => f.folder_permissions.some(p => p.user_id === currentUser?.id) || f.created_by === currentUser?.id)
    .map(f => f.id);

  const filteredFiles = isSearchMode
    ? files.filter(file =>
      accessibleFolderIds.includes(file.folder_id) &&
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : files.filter(file => file.folder_id === currentFolderId);

  // Sort files
  const displayFiles = useMemo(() => {
    const sorted = [...filteredFiles];
    switch (sortOption) {
      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      case 'size_desc':
        return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
      case 'size_asc':
        return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
      case 'type':
        return sorted.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return sorted;
    }
  }, [filteredFiles, sortOption]);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle preview
  const handlePreview = (file: File, index: number) => {
    setPreviewFile(file);
    setPreviewIndex(index);
  };

  const handlePreviewNext = () => {
    if (previewIndex < displayFiles.length - 1) {
      const nextIndex = previewIndex + 1;
      setPreviewFile(displayFiles[nextIndex]);
      setPreviewIndex(nextIndex);
    }
  };

  const handlePreviewPrev = () => {
    if (previewIndex > 0) {
      const prevIndex = previewIndex - 1;
      setPreviewFile(displayFiles[prevIndex]);
      setPreviewIndex(prevIndex);
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, file: File) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const getContextMenuItems = (file: File): ContextMenuItem[] => {
    const canEdit = isAdmin(currentUser?.role as UserRole) || currentUser?.id === file.created_by;
    return [
      { label: 'プレビュー', icon: <Eye size={16} />, onClick: () => handlePreview(file, displayFiles.indexOf(file)) },
      { label: 'ダウンロード', icon: <Download size={16} />, onClick: () => downloadFile(file.id, file.name) },
      { label: '', onClick: () => { }, divider: true },
      { label: '名前を変更', icon: <Edit2 size={16} />, onClick: () => { setRenamingId(file.id); setRenameValue(file.name); }, disabled: !canEdit },
      { label: '', onClick: () => { }, divider: true },
      { label: '削除', icon: <Trash size={16} />, onClick: () => deleteFile(file.id), danger: true, disabled: !canEdit },
    ];
  };

  // File icon mapping
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileIcon className="text-red-500" />;
      case 'excel': return <FileSpreadsheet className="text-green-500" />;
      case 'word': return <FileText className="text-blue-500" />;
      case 'image': return <Image className="text-purple-500" />;
      case 'video': return <Video className="text-orange-500" />;
      default: return <FileIcon className="text-gray-400" />;
    }
  };

  const getFolderName = (folderId: string) => {
    return folders.find(f => f.id === folderId)?.name || '不明なフォルダ';
  };

  // If no folder is selected AND not searching, show placeholder
  if (!currentFolderId && !isSearchMode) {
    return (
      <>
        <Dashboard
          onUploadClick={() => {
            setDroppedFiles([]);
            setShowUploadModal(true);
          }}
          onFileClick={(file) => {
            setPreviewFile(file);
            setPreviewIndex(-1); // -1 indicates dashboard mode (no prev/next)
          }}
        />
        {showUploadModal && (
          <FileUploadModal
            folderId={currentFolderId}
            initialFiles={droppedFiles}
            onClose={() => {
              setShowUploadModal(false);
              setDroppedFiles([]);
            }}
          />
        )}
        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
            onNext={handlePreviewNext}
            onPrev={handlePreviewPrev}
            hasNext={false}
            hasPrev={false}
          />
        )}
      </>
    );
  }

  /* Drag & Drop Logic */

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!currentFolderId) return; // フォルダ選択中のみ有効
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // 関連ターゲットが自分自身の子要素なら無視（ちらつき防止）
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!currentFolderId) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setDroppedFiles(Array.from(e.dataTransfer.files));
      setShowUploadModal(true);
    }
  };

  return (
    <div
      className="relative bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-6 h-full flex flex-col transition-all duration-300 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#64D2C3]/10 backdrop-blur-sm border-4 border-dashed border-[#64D2C3] rounded-2xl flex flex-col items-center justify-center animate-fadeIn pointer-events-none">
          <div className="bg-white p-6 rounded-full shadow-xl animate-bounce">
            <Upload size={48} className="text-[#64D2C3]" />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-[#4ABFB0] tracking-wider">Drop to Upload!</h3>
          <p className="text-[#64D2C3] font-medium mt-2">ファイルをドロップしてアップロード（複数可）</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-gray-100 gap-4 sm:gap-0">
        <h2 className="text-xl font-bold flex items-center text-gray-800">
          {isSearchMode ? (
            <>
              <div className="p-2 bg-orange-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <span className="truncate">検索結果: <span className="text-orange-500">"{searchQuery}"</span></span>
            </>
          ) : (
            <>
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <FileIcon size={20} className="text-blue-600" />
              </div>
              <span className="truncate">{currentFolder?.name || 'ファイル'}</span>
            </>
          )}
        </h2>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="グリッド表示"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="リスト表示"
            >
              <List size={16} />
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center text-sm px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowUpDown size={16} className="mr-2" />
              <span className="hidden sm:inline">{sortLabels[sortOption]}</span>
            </button>

            {showSortMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[160px] z-20 animate-fadeIn">
                  {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortOption(option);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${sortOption === option ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                    >
                      {option.includes('name') && <FileType size={14} />}
                      {option.includes('date') && <Calendar size={14} />}
                      {option.includes('size') && <HardDrive size={14} />}
                      {option === 'type' && <FileIcon size={14} />}
                      {sortLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {!isSearchMode && (
            <button
              onClick={() => {
                setDroppedFiles([]);
                setShowUploadModal(true);
              }}
              className="flex items-center text-sm px-4 py-2 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              <Upload size={18} className="mr-2" />
              <span className="hidden md:inline font-medium">アップロード</span>
            </button>
          )}
        </div>
      </div>

      {/* File count */}
      <div className="text-sm text-gray-500 mb-3 flex items-center justify-between">
        <span>{displayFiles.length}件のファイル</span>
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {displayFiles.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayFiles.map((file, index) => (
                <div
                  key={file.id}
                  className={`group relative p-4 bg-white border rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-fadeIn cursor-pointer ${renamingId === file.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'}`}
                  style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                  onClick={(e) => {
                    if (renamingId === file.id) {
                      e.stopPropagation();
                    } else {
                      handlePreview(file, index);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                      {getFileIcon(file.type)}
                    </div>
                    {isSearchMode && (
                      <span className="text-[10px] px-2 py-1 bg-gray-100 text-gray-500 rounded-full truncate max-w-[100px]">
                        {getFolderName(file.folder_id)}
                      </span>
                    )}
                  </div>

                  <div className="mb-2">
                    {renamingId === file.id ? (
                      <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          className="w-full text-sm py-1 px-2 border border-blue-300 rounded focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button onClick={() => handleRenameSubmit()} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setRenamingId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="font-semibold text-gray-800 truncate" title={file.name}>{file.name}</p>
                    )}

                    <div className="text-xs text-gray-400 mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-gray-300 mr-1"></span>
                          {users.find(u => u.id === file.created_by)?.name || '不明'}
                        </span>
                        {file.size && (
                          <span className="text-gray-300">{formatFileSize(file.size)}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-300 text-right">
                        {formatDate(file.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className={`absolute top-4 right-4 flex space-x-1 transition-all duration-200 transform ${renamingId === file.id ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(file, index);
                      }}
                      className="p-2 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white shadow-sm transition-all"
                      title="プレビュー"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDownload(e, file)}
                      className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white shadow-sm transition-all"
                      title="ダウンロード"
                    >
                      <Download size={16} />
                    </button>

                    {(isAdmin(currentUser.role as UserRole) || currentUser.id === file.created_by) && (
                      <>
                        <button
                          onClick={(e) => handleStartRename(e, file)}
                          className="p-2 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white shadow-sm transition-all"
                          title="名前を変更"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.id);
                          }}
                          className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all"
                          title="削除"
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium w-12"></th>
                    <th className="px-4 py-3 font-medium">名前</th>
                    <th className="px-4 py-3 font-medium w-32">サイズ</th>
                    <th className="px-4 py-3 font-medium w-40">更新日時</th>
                    <th className="px-4 py-3 font-medium w-32">作成者</th>
                    <th className="px-4 py-3 font-medium w-24 text-right">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayFiles.map((file, index) => (
                    <tr
                      key={file.id}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${renamingId === file.id ? 'bg-blue-50' : ''}`}
                      onClick={(e) => {
                        if (renamingId === file.id) return;
                        handlePreview(file, index);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, file)}
                    >
                      <td className="px-4 py-3">
                        {getFileIcon(file.type)}
                      </td>
                      <td className="px-4 py-3">
                        {renamingId === file.id ? (
                          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-full text-sm py-1 px-2 border border-blue-300 rounded focus:outline-none focus:border-blue-500"
                              autoFocus
                              onClick={(event) => event.stopPropagation()}
                            />
                            <button onClick={(e) => { e.stopPropagation(); handleRenameSubmit(); }} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-700">{file.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(file.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mr-2"></span>
                          {users.find(u => u.id === file.created_by)?.name || '不明'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePreview(file, index); }}
                            className="p-1.5 text-purple-500 hover:bg-purple-50 rounded"
                            title="プレビュー"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDownload(e, file)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                            title="ダウンロード"
                          >
                            <Download size={16} />
                          </button>
                          {(isAdmin(currentUser.role as UserRole) || currentUser.id === file.created_by) && (
                            <>
                              <button
                                onClick={(e) => handleStartRename(e, file)}
                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                                title="名前を変更"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                title="削除"
                              >
                                <Trash size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileIcon size={40} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">ファイルが見つかりません</p>
            {!isSearchMode && (
              <button
                onClick={() => {
                  setDroppedFiles([]);
                  setShowUploadModal(true);
                }}
                className="mt-6 px-6 py-2 border-2 border-dashed border-[#64D2C3] text-[#4ABFB0] rounded-xl hover:bg-[#64D2C3]/10 transition-colors font-medium"
              >
                ファイルをアップロード
              </button>
            )}
          </div>
        )}
      </div>

      {/* File upload modal */}
      {showUploadModal && (
        <FileUploadModal
          folderId={currentFolderId}
          initialFiles={droppedFiles}
          onClose={() => {
            setShowUploadModal(false);
            setDroppedFiles([]);
          }}
        />
      )}

      {/* File preview modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onNext={handlePreviewNext}
          onPrev={handlePreviewPrev}
          hasNext={previewIndex !== -1 && previewIndex < displayFiles.length - 1} // Disable nav for dashboard files
          hasPrev={previewIndex !== -1 && previewIndex > 0}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems(contextMenu.file)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default FilePanel;