import React, { useState, useEffect, useRef } from 'react';
import { fileSystemApi } from '../utils/fileSystemApi';

interface FileVersion {
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

interface VersionHistoryProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onRestore?: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  fileId,
  fileName,
  onClose,
  onRestore
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [uploadComment, setUploadComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fileSystemApi.getFileVersions(fileId);
      if (response.success && response.data) {
        setVersions(response.data.versions);
      } else {
        setError(response.error || 'バージョン履歴の取得に失敗しました');
      }
    } catch {
      setError('バージョン履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [fileId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUploadNewVersion = async (file: File) => {
    setUploading(true);
    try {
      const response = await fileSystemApi.createFileVersion(fileId, file, uploadComment);
      if (response.success) {
        setUploadComment('');
        await loadVersions();
      } else {
        setError(response.error || 'アップロードに失敗しました');
      }
    } catch {
      setError('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`バージョン ${versionNumber} に復元しますか？`)) return;

    setRestoring(versionId);
    try {
      const response = await fileSystemApi.restoreFileVersion(versionId);
      if (response.success) {
        await loadVersions();
        onRestore?.();
      } else {
        setError(response.error || '復元に失敗しました');
      }
    } catch {
      setError('復元に失敗しました');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">バージョン履歴</h2>
            <p className="text-sm text-gray-500">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 新しいバージョンをアップロード */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadNewVersion(file);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  アップロード中...
                </>
              ) : (
                <>
                  <span>📤</span>
                  新しいバージョンをアップロード
                </>
              )}
            </button>
            <input
              type="text"
              value={uploadComment}
              onChange={(e) => setUploadComment(e.target.value)}
              placeholder="コメント（任意）"
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* バージョン一覧 */}
        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin text-2xl mb-2">⟳</div>
              読み込み中...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p className="mb-2">⚠️ {error}</p>
              <button
                onClick={loadVersions}
                className="text-blue-500 hover:underline"
              >
                再読み込み
              </button>
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-2">📄</p>
              <p>バージョン履歴がありません</p>
              <p className="text-sm mt-1">
                新しいバージョンをアップロードすると、ここに履歴が表示されます
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 flex items-center gap-4 ${
                    version.is_current ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* バージョン番号 */}
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 rounded-lg">
                    <span className="font-bold text-gray-600">
                      v{version.version_number}
                    </span>
                  </div>

                  {/* バージョン情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {version.is_current && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          現在
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(version.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatFileSize(version.size)}
                      {version.created_by_name && (
                        <span className="ml-2">by {version.created_by_name}</span>
                      )}
                    </p>
                    {version.comment && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        💬 {version.comment}
                      </p>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {!version.is_current && (
                      <button
                        onClick={() => handleRestore(version.id, version.version_number)}
                        disabled={restoring === version.id}
                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
                      >
                        {restoring === version.id ? '復元中...' : '復元'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
