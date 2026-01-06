import React, { useState, useCallback, useEffect } from 'react';
import { fileSystemApi } from '../utils/fileSystemApi';
import { SearchFilters, SearchResultItem } from '../types';

interface SearchPanelProps {
  onFileSelect?: (fileId: string, folderId: string) => void;
  onFolderSelect?: (folderId: string) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onFileSelect, onFolderSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ files: SearchResultItem[]; folders: SearchResultItem[] }>({
    files: [],
    folders: []
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<SearchFilters>>({
    type: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [meta, setMeta] = useState<{ total: number; total_files: number; total_folders: number } | null>(null);

  const performSearch = useCallback(async () => {
    if (!query.trim() && !filters.fileType && !filters.dateFrom && !filters.dateTo) {
      setResults({ files: [], folders: [] });
      setMeta(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fileSystemApi.search({
        ...filters,
        query: query.trim()
      });

      if (response.success && response.data) {
        setResults(response.data.data);
        setMeta({
          total: response.data.meta.total,
          total_files: response.data.meta.total_files,
          total_folders: response.data.meta.total_folders
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  // デバウンス検索
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim() || filters.fileType || filters.dateFrom || filters.dateTo) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (type: string): string => {
    if (type?.startsWith('image/')) return '🖼️';
    if (type?.startsWith('video/')) return '🎬';
    if (type?.startsWith('audio/')) return '🎵';
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('word') || type?.includes('document')) return '📝';
    if (type?.includes('sheet') || type?.includes('excel')) return '📊';
    if (type?.includes('zip') || type?.includes('rar') || type?.includes('7z')) return '📦';
    return '📄';
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    setQuery('');
    setResults({ files: [], folders: [] });
    setMeta(null);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">検索</h2>

        {/* 検索バー */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ファイル名やフォルダ名で検索..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg hover:bg-gray-50 ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}
          >
            フィルター
          </button>
          <button
            onClick={performSearch}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </div>

        {/* フィルターパネル */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 検索対象 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  検索対象
                </label>
                <select
                  value={filters.type || 'all'}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as 'all' | 'files' | 'folders' })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">すべて</option>
                  <option value="files">ファイルのみ</option>
                  <option value="folders">フォルダのみ</option>
                </select>
              </div>

              {/* ファイルタイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ファイルタイプ
                </label>
                <select
                  value={filters.fileType || ''}
                  onChange={(e) => setFilters({ ...filters, fileType: e.target.value as SearchFilters['fileType'] || undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={filters.type === 'folders'}
                >
                  <option value="">すべて</option>
                  <option value="image">画像</option>
                  <option value="document">ドキュメント</option>
                  <option value="video">動画</option>
                  <option value="audio">音声</option>
                  <option value="archive">アーカイブ</option>
                </select>
              </div>

              {/* ソート */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  並び替え
                </label>
                <select
                  value={filters.sortBy || 'created_at'}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SearchFilters['sortBy'] })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">作成日</option>
                  <option value="name">名前</option>
                  <option value="size">サイズ</option>
                  <option value="type">タイプ</option>
                </select>
              </div>

              {/* ソート順 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  順序
                </label>
                <select
                  value={filters.sortOrder || 'DESC'}
                  onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as 'ASC' | 'DESC' })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DESC">降順</option>
                  <option value="ASC">昇順</option>
                </select>
              </div>
            </div>

            {/* 日付フィルター */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                フィルターをクリア
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 検索結果 */}
      <div className="p-4">
        {meta && (
          <p className="text-sm text-gray-600 mb-4">
            検索結果: {meta.total}件 (ファイル: {meta.total_files}件, フォルダ: {meta.total_folders}件)
          </p>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            検索中...
          </div>
        ) : (
          <>
            {/* フォルダ結果 */}
            {results.folders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">フォルダ</h3>
                <div className="space-y-2">
                  {results.folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => onFolderSelect?.(folder.id)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
                    >
                      <span className="text-2xl">📁</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        <p className="text-sm text-gray-500">
                          {folder.parent_name && `場所: ${folder.parent_name} • `}
                          作成日: {formatDate(folder.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ファイル結果 */}
            {results.files.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">ファイル</h3>
                <div className="space-y-2">
                  {results.files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => onFileSelect?.(file.id, file.folder_id || '')}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
                    >
                      <span className="text-2xl">{getFileIcon(file.type || '')}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.folder_name && `場所: ${file.folder_name} • `}
                          {file.size && `${formatFileSize(file.size)} • `}
                          作成日: {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 結果なし */}
            {!loading && meta && meta.total === 0 && (
              <div className="text-center py-8 text-gray-500">
                検索結果が見つかりませんでした
              </div>
            )}

            {/* 初期状態 */}
            {!meta && !loading && (
              <div className="text-center py-8 text-gray-400">
                検索キーワードを入力してください
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPanel;
