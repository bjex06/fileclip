import React from 'react';
import Header from './Header';
import FolderPanel from './FolderPanel';
import FilePanel from './FilePanel';

const FileManager: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <Header />

      {/* 検索バーエリア */}
      <div className="container mx-auto px-4 py-4 md:px-6">
        <div className="relative max-w-2xl mx-auto group">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center bg-white rounded-full shadow-sm border-2 border-transparent focus-within:border-[#FFB85F] focus-within:ring-4 focus-within:ring-[#FFB85F]/10 transition-all duration-300">
            <div className="pl-4 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ファイル名で検索（アクセス権のある全フォルダから串刺し検索）"
              className="w-full py-3 px-4 bg-transparent rounded-full focus:outline-none text-gray-700 placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 px-4 md:px-8 pb-6 gap-6 overflow-hidden w-full">
        {/* サイドバー: フォルダ一覧 */}
        <div className={`w-full md:w-64 flex-shrink-0 overflow-y-auto transition-opacity duration-300 ${searchQuery ? 'opacity-50 pointer-events-none md:opacity-100' : ''}`}>
          <FolderPanel />
        </div>

        {/* メインコンテンツ: ファイル一覧 */}
        <div className="flex-1 hidden md:block overflow-y-auto min-w-0">
          <FilePanel searchQuery={searchQuery} />
        </div>
      </div>

      {/* モバイル表示: ファイル一覧 */}
      <div className="md:hidden px-4 pb-4 flex-1">
        <FilePanel searchQuery={searchQuery} />
      </div>
    </div>
  );
};

export default FileManager;
