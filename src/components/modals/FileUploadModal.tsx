import React, { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { useAuth } from '../../context/AuthContext';
import { Upload, X, Image, FileText, FileSpreadsheet, File as FileIcon, Video, CheckCircle, Loader, Trash2, AlertTriangle, Folder as FolderIcon, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadModalProps {
  folderId?: string | null;
  onClose: () => void;
  initialFiles?: File[] | null;
}

interface DuplicateFile {
  newFile: globalThis.File;
  existingFileId: string;
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ folderId, onClose, initialFiles }) => {
  const { addFile, files, deleteFile, folders } = useFileSystem();
  const { session } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<globalThis.File[]>(initialFiles || []);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [progress, setProgress] = useState(0);
  const [duplicateConfirm, setDuplicateConfirm] = useState<DuplicateFile | null>(null);
  const [pendingUploads, setPendingUploads] = useState<globalThis.File[]>([]);

  // Writable folders for selection
  const writableFolders = folders.filter(f =>
    session?.role === 'super_admin' ||
    session?.role === 'admin' ||
    f.created_by === session?.id ||
    f.folder_permissions.some(p => p.user_id === session?.id)
  );

  const [targetFolderId, setTargetFolderId] = useState<string>(folderId || (writableFolders.length > 0 ? writableFolders[0].id : ''));
  const [showFolderSelect, setShowFolderSelect] = useState(false);

  useEffect(() => {
    if (folderId) {
      setTargetFolderId(folderId);
    }
  }, [folderId]);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get files in target folder
  const folderFiles = files.filter(f => f.folder_id === targetFolderId);

  // Check if file with same name exists
  const findDuplicate = (fileName: string) => {
    return folderFiles.find(f => f.name === fileName);
  };

  const handleUpload = async () => {
    if (selectedFiles.length > 0) {
      // Start processing - check for duplicates first
      const filesToUpload: globalThis.File[] = [];

      for (const file of selectedFiles) {
        const duplicate = findDuplicate(file.name);
        if (duplicate) {
          // Set pending uploads and show confirmation
          setPendingUploads([...selectedFiles.slice(selectedFiles.indexOf(file))]);
          setDuplicateConfirm({ newFile: file, existingFileId: duplicate.id });
          return;
        }
        filesToUpload.push(file);
      }

      // No duplicates - proceed with upload
      await processUpload(filesToUpload);
    }
  };

  const handleDuplicateOverwrite = async () => {
    if (!duplicateConfirm) return;

    // Delete existing file
    await deleteFile(duplicateConfirm.existingFileId);

    // Continue uploading remaining files
    const remainingFiles = pendingUploads;
    setDuplicateConfirm(null);
    setPendingUploads([]);

    // Check remaining files for duplicates
    const filesToUpload: globalThis.File[] = [];
    for (const file of remainingFiles) {
      const duplicate = findDuplicate(file.name);
      if (duplicate && file !== duplicateConfirm.newFile) {
        setPendingUploads([...remainingFiles.slice(remainingFiles.indexOf(file))]);
        setDuplicateConfirm({ newFile: file, existingFileId: duplicate.id });

        // Upload files before this duplicate
        if (filesToUpload.length > 0) {
          await processUpload(filesToUpload);
        }
        return;
      }
      filesToUpload.push(file);
    }

    // No more duplicates - upload all remaining
    await processUpload(filesToUpload);
  };

  const handleDuplicateSkip = async () => {
    if (!duplicateConfirm) return;

    // Skip this file and continue with remaining
    const remainingFiles = pendingUploads.filter(f => f !== duplicateConfirm.newFile);
    setDuplicateConfirm(null);
    setPendingUploads([]);

    if (remainingFiles.length === 0) {
      toast.info('アップロードをスキップしました');
      return;
    }

    // Check remaining files for duplicates
    const filesToUpload: globalThis.File[] = [];
    for (const file of remainingFiles) {
      const duplicate = findDuplicate(file.name);
      if (duplicate) {
        setPendingUploads([...remainingFiles.slice(remainingFiles.indexOf(file))]);
        setDuplicateConfirm({ newFile: file, existingFileId: duplicate.id });

        // Upload files before this duplicate
        if (filesToUpload.length > 0) {
          await processUpload(filesToUpload);
        }
        return;
      }
      filesToUpload.push(file);
    }

    // No more duplicates - upload all remaining
    if (filesToUpload.length > 0) {
      await processUpload(filesToUpload);
    }
  };

  const processUpload = async (filesToUpload: globalThis.File[]) => {
    if (filesToUpload.length === 0) return;

    setUploadStatus('uploading');

    const totalFiles = filesToUpload.length;
    let completed = 0;

    // Process files one by one to simulate progress
    for (const file of filesToUpload) {
      try {
        // Simulate slight delay per file
        await new Promise(resolve => setTimeout(resolve, 500));
        await addFile(file.name, getFileType(file.name), targetFolderId, file);
        completed++;
        setProgress((completed / totalFiles) * 100);
      } catch (error) {
        console.error(error);
        toast.error(`${file.name}のアップロードに失敗しました`);
      }
    }

    setUploadStatus('success');

    setTimeout(() => {
      onClose();
      toast.success(`${totalFiles}個のファイルをアップロードしました`);
    }, 1500);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadStatus !== 'idle') return;
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (uploadStatus !== 'idle') return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(Array.from(e.target.files));
    }
  };

  const getFileType = (fileName: string): string => {
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.match(/\.(doc|docx)$/i)) return 'word';
    if (fileName.match(/\.(xls|xlsx)$/i)) return 'excel';
    if (fileName.match(/\.(jpg|jpeg|png|gif)$/i)) return 'image';
    if (fileName.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i)) return 'video';
    return 'other';
  };

  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    switch (type) {
      case 'pdf': return <FileIcon className="text-red-500" size={24} />;
      case 'word': return <FileText className="text-blue-500" size={24} />;
      case 'excel': return <FileSpreadsheet className="text-green-500" size={24} />;
      case 'image': return <Image className="text-purple-500" size={24} />;
      case 'video': return <Video className="text-orange-500" size={24} />;
      default: return <FileIcon className="text-gray-500" size={24} />;
    }
  };

  // Duplicate file confirmation dialog
  if (duplicateConfirm) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-all duration-300">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-md p-5 sm:p-8 text-center animate-bounce-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-50 to-white -z-10" />
          <div className="w-14 h-14 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <AlertTriangle size={28} className="text-orange-500 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-base sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3">同名ファイルが存在します</h2>
          <p className="text-gray-600 mb-1 sm:mb-2 text-sm sm:text-base">
            <span className="font-semibold text-orange-600 break-all">「{duplicateConfirm.newFile.name}」</span>
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
            このファイルは既に存在します。上書きしますか？
          </p>
          <div className="flex gap-2 sm:gap-3 justify-center">
            <button
              onClick={handleDuplicateSkip}
              className="px-4 sm:px-6 py-2 sm:py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg sm:rounded-xl transition-colors font-medium text-xs sm:text-sm border border-gray-200"
            >
              スキップ
            </button>
            <button
              onClick={handleDuplicateOverwrite}
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-bold text-xs sm:text-sm"
            >
              上書きする
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (uploadStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-all duration-300">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[90vw] sm:max-w-sm p-6 sm:p-8 text-center animate-bounce-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#64D2C3]/10 to-white -z-10" />
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-[#64D2C3]/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-scale-up">
            <CheckCircle size={32} className="text-[#64D2C3] sm:w-12 sm:h-12" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2">完了!</h2>
          <p className="text-gray-500 text-sm sm:text-base">{selectedFiles.length}個のファイルをアップロードしました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn transition-all duration-300">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-lg overflow-hidden relative flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base sm:text-xl font-bold flex items-center text-gray-800">
            <div className="p-1.5 sm:p-2 bg-[#64D2C3]/20 rounded-lg mr-2 sm:mr-3">
              <Upload size={18} className="text-[#64D2C3] sm:w-5 sm:h-5" />
            </div>
            ファイルアップロード
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
            disabled={uploadStatus === 'uploading'}
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Folder Selection (if not pre-selected) */}
        {!folderId && (
          <div className="px-4 sm:px-6 pt-4 pb-0">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                保存先フォルダ
              </label>
              <button
                onClick={() => setShowFolderSelect(!showFolderSelect)}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-[#64D2C3] hover:ring-2 hover:ring-[#64D2C3]/20 transition-all text-left group"
                disabled={uploadStatus === 'uploading'}
              >
                <div className="flex items-center">
                  <div className="p-1.5 bg-orange-50 rounded-lg mr-3 group-hover:bg-orange-100 transition-colors">
                    <FolderIcon size={18} className="text-orange-500" />
                  </div>
                  <span className="font-medium text-gray-700">
                    {folders.find(f => f.id === targetFolderId)?.name || 'フォルダを選択してください'}
                  </span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${showFolderSelect ? 'rotate-180' : ''}`} />
              </button>

              {showFolderSelect && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFolderSelect(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-20 max-h-48 overflow-y-auto animate-fadeIn custom-scrollbar">
                    {writableFolders.length > 0 ? (
                      writableFolders.map(folder => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            setTargetFolderId(folder.id);
                            setShowFolderSelect(false);
                          }}
                          className={`w-full flex items-center p-3 hover:bg-gray-50 transition-colors text-left ${targetFolderId === folder.id ? 'bg-[#64D2C3]/5 text-[#4ABFB0]' : 'text-gray-700'}`}
                        >
                          <FolderIcon size={16} className={`mr-3 ${targetFolderId === folder.id ? 'text-[#64D2C3]' : 'text-gray-400'}`} />
                          <span className="font-medium">{folder.name}</span>
                          {targetFolderId === folder.id && <CheckCircle size={16} className="ml-auto text-[#64D2C3]" />}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        書き込み可能なフォルダがありません
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* Drop Zone */}
          <div
            className={`border-2 sm:border-3 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 flex flex-col items-center justify-center transition-all duration-300 ${dragOver ? 'border-[#64D2C3] bg-[#64D2C3]/10 scale-102' : 'border-gray-200 hover:border-[#64D2C3] hover:bg-gray-50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi,.wmv,.flv,.mkv"
            />

            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-[#64D2C3]/20 rounded-full animate-bounce-slow">
              <Upload size={20} className="text-[#64D2C3] sm:w-6 sm:h-6" />
            </div>
            <p className="text-center mb-1 font-bold text-gray-700 text-sm sm:text-base">
              ファイルをドロップ
            </p>
            <p className="text-[10px] sm:text-xs text-gray-400 text-center mb-3 sm:mb-4">
              複数ファイル対応
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow"
            >
              ファイルを追加
            </button>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider pl-1">
                待機中 ({selectedFiles.length})
              </h3>
              <div className="space-y-1.5 sm:space-y-2 max-h-[150px] sm:max-h-[200px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center p-2 sm:p-3 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-100 animate-fadeIn">
                    <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm mr-2 sm:mr-3 flex-shrink-0">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 text-xs sm:text-sm truncate">{file.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    {uploadStatus !== 'uploading' && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 sm:p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {uploadStatus === 'uploading' && (
            <div className="mt-3 sm:mt-4">
              <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
                <span>アップロード中...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] h-full rounded-full transition-all duration-300 animate-progress-stripe"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end p-3 sm:p-6 border-t border-gray-100 bg-gray-50/50 gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={uploadStatus === 'uploading'}
            className="px-3 sm:px-5 py-2 sm:py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg sm:rounded-xl transition-colors font-medium text-xs sm:text-sm"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            className={`px-4 sm:px-8 py-2 sm:py-2.5 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-bold text-xs sm:text-sm flex items-center ${selectedFiles.length === 0 || uploadStatus === 'uploading' || !targetFolderId ? 'opacity-50 cursor-not-allowed transform-none' : ''
              }`}
            disabled={selectedFiles.length === 0 || uploadStatus === 'uploading' || !targetFolderId}
          >
            {uploadStatus === 'uploading' ? (
              <>
                <Loader size={16} className="mr-1.5 sm:mr-2 animate-spin sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">アップロード中...</span>
                <span className="sm:hidden">処理中...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">アップロード ({selectedFiles.length})</span>
                <span className="sm:hidden">実行 ({selectedFiles.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;