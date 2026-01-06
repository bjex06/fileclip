import React, { useState, useEffect } from 'react';
import { File } from '../types';
import { getApiConfig } from '../utils/api';

interface FilePreviewProps {
  file: File;
  onClose: () => void;
  onDownload?: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const config = getApiConfig();

  const getPreviewUrl = () => {
    if (config.backend === 'xserver') {
      return `${config.baseUrl}/api/files/preview.php?file_id=${file.id}`;
    }
    return '';
  };

  const isImage = file.type?.startsWith('image/');
  const isVideo = file.type?.startsWith('video/');
  const isAudio = file.type?.startsWith('audio/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type?.startsWith('text/') ||
                 file.name.endsWith('.json') ||
                 file.name.endsWith('.xml') ||
                 file.name.endsWith('.md');

  const canPreview = isImage || isVideo || isAudio || isPdf;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (): string => {
    if (isImage) return '🖼️';
    if (isVideo) return '🎬';
    if (isAudio) return '🎵';
    if (isPdf) return '📄';
    if (isText) return '📝';
    if (file.type?.includes('word') || file.type?.includes('document')) return '📝';
    if (file.type?.includes('sheet') || file.type?.includes('excel')) return '📊';
    if (file.type?.includes('presentation') || file.type?.includes('powerpoint')) return '📽️';
    if (file.type?.includes('zip') || file.type?.includes('rar') || file.type?.includes('7z')) return '📦';
    return '📄';
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    // シミュレートローディング
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [file.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      {/* 背景クリックで閉じる */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* プレビューコンテナ */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl">{getFileIcon()}</span>
            <div className="min-w-0">
              <h3 className="font-medium truncate">{file.name}</h3>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)} • {file.type || '不明な形式'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <button
                onClick={onDownload}
                className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                ダウンロード
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="閉じる"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* プレビューエリア */}
        <div className="p-4 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-120px)] overflow-auto bg-gray-50">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-500">
              <p className="text-4xl mb-4">⚠️</p>
              <p>{error}</p>
            </div>
          ) : canPreview ? (
            <>
              {isImage && (
                <img
                  src={getPreviewUrl()}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setError('画像の読み込みに失敗しました')}
                />
              )}
              {isVideo && (
                <video
                  src={getPreviewUrl()}
                  controls
                  className="max-w-full max-h-full"
                  onError={() => setError('動画の読み込みに失敗しました')}
                >
                  お使いのブラウザは動画再生に対応していません
                </video>
              )}
              {isAudio && (
                <div className="text-center">
                  <span className="text-8xl mb-6 block">🎵</span>
                  <audio
                    src={getPreviewUrl()}
                    controls
                    className="w-full max-w-md"
                    onError={() => setError('音声の読み込みに失敗しました')}
                  >
                    お使いのブラウザは音声再生に対応していません
                  </audio>
                </div>
              )}
              {isPdf && (
                <iframe
                  src={getPreviewUrl()}
                  className="w-full h-[60vh] border-0"
                  title={file.name}
                />
              )}
            </>
          ) : (
            <div className="text-center">
              <span className="text-8xl mb-6 block">{getFileIcon()}</span>
              <p className="text-gray-600 mb-2">このファイル形式はプレビューできません</p>
              <p className="text-sm text-gray-500">{file.type || '不明な形式'}</p>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  ダウンロードして開く
                </button>
              )}
            </div>
          )}
        </div>

        {/* ファイル情報 */}
        <div className="p-4 border-t bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">作成日</span>
              <p className="font-medium">
                {new Date(file.created_at).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-500">サイズ</span>
              <p className="font-medium">{formatFileSize(file.size)}</p>
            </div>
            <div>
              <span className="text-gray-500">形式</span>
              <p className="font-medium truncate" title={file.type}>
                {file.type || '不明'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">保存場所</span>
              <p className="font-medium truncate" title={file.folder_id}>
                フォルダID: {file.folder_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
