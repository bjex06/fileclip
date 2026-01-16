import React, { useMemo, useState } from 'react';
import { useFileSystem } from '../context/FileSystemContext';
import { useAuth } from '../context/AuthContext';
import { Upload, Bell, Clock, File as FileIcon, FileText, FileSpreadsheet, Image, Video, ExternalLink, Plus, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { isSuperAdmin, Notice, UserRole } from '../types';
import { toast } from 'sonner';

const Dashboard: React.FC<{ onUploadClick: () => void; onFileClick: (file: any) => void }> = ({
    onUploadClick,
    onFileClick
}) => {
    const { files, folders, currentUser, notices, addNotice, deleteNotice } = useFileSystem();
    const { session } = useAuth();
    const isAdmin = isSuperAdmin(session?.role as UserRole);

    // Add Notice State
    const [showAddNotice, setShowAddNotice] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState<Notice['category']>('info');

    // Filter accessible files
    const accessibleFiles = useMemo(() => {
        const accessibleFolderIds = folders
            .filter(f => isAdmin || f.folder_permissions.some(p => p.user_id === currentUser?.id) || f.created_by === currentUser?.id)
            .map(f => f.id);

        return files
            .filter(file => accessibleFolderIds.includes(file.folder_id))
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, 20);
    }, [files, folders, currentUser]);

    const handleAddNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;

        try {
            await addNotice(newTitle, newContent, newCategory);
            setNewTitle('');
            setNewContent('');
            setShowAddNotice(false);
            toast.success('お知らせを追加しました');
        } catch (error) {
            toast.error('お知らせの追加に失敗しました');
        }
    };

    const handleDeleteNotice = async (id: string) => {
        if (confirm('このお知らせを削除しますか？')) {
            await deleteNotice(id);
            toast.success('お知らせを削除しました');
        }
    };

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
        return folders.find(f => f.id === folderId)?.name || 'フォルダ不明';
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'maintenance': return <AlertTriangle size={14} className="text-red-500" />;
            case 'update': return <CheckCircle size={14} className="text-green-500" />;
            default: return <Info size={14} className="text-blue-500" />;
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'maintenance': return 'メンテナンス';
            case 'update': return 'アップデート';
            default: return 'お知らせ';
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'maintenance': return 'bg-red-50 text-red-600 border-red-100';
            case 'update': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-blue-50 text-blue-600 border-blue-100';
        }
    };

    return (
        <div className="h-full flex flex-col justify-between overflow-y-auto custom-scrollbar p-6">

            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#64D2C3]/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500 animate-pulse-slow"></div>
                    <div
                        onClick={onUploadClick}
                        className="relative w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 border border-gray-100 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    >
                        <Upload size={40} className="text-[#64D2C3]" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3 tracking-wide">ファイルを選択してください</h2>
                <p className="text-gray-500 text-center max-w-md leading-relaxed mb-8">
                    左側のフォルダリストからフォルダを選択するか、<br />
                    上部の検索バーからファイルを検索できます
                </p>
                <button
                    onClick={onUploadClick}
                    className="px-8 py-3 bg-gradient-to-r from-[#64D2C3] to-[#4ABFB0] text-white rounded-full shadow-md hover:shadow-lg hover:translate-y-[-2px] transition-all duration-300 font-medium flex items-center"
                >
                    <Upload size={18} className="mr-2" />
                    ファイルをアップロード
                </button>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 w-full animate-slideUp">

                {/* Notices Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6 flex flex-col hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 flex items-center">
                            <Bell size={18} className="mr-2 text-orange-400" />
                            お知らせ
                        </h3>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <button
                                    onClick={() => setShowAddNotice(!showAddNotice)}
                                    className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="お知らせを追加"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                            <button className="text-xs text-blue-500 hover:underline">すべて見る</button>
                        </div>
                    </div>

                    {showAddNotice && (
                        <form onSubmit={handleAddNotice} className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn">
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">タイトル</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="お知らせのタイトル"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">内容</label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="お知らせの内容"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewCategory('info')}
                                        className={`px-3 py-1 text-xs rounded-full border ${newCategory === 'info' ? 'bg-blue-50 border-blue-200 text-blue-600 font-medium' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        お知らせ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCategory('update')}
                                        className={`px-3 py-1 text-xs rounded-full border ${newCategory === 'update' ? 'bg-green-50 border-green-200 text-green-600 font-medium' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        アップデート
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewCategory('maintenance')}
                                        className={`px-3 py-1 text-xs rounded-full border ${newCategory === 'maintenance' ? 'bg-red-50 border-red-200 text-red-600 font-medium' : 'bg-white border-gray-200 text-gray-500'}`}
                                    >
                                        メンテナンス
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddNotice(false)}
                                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                                >
                                    追加する
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                        {notices.length > 0 ? (
                            notices.map(notice => (
                                <div key={notice.id} className="group relative bg-gray-50/50 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${getCategoryColor(notice.category)}`}>
                                            {getCategoryIcon(notice.category)}
                                            {getCategoryLabel(notice.category)}
                                        </span>
                                        <span className={`text-[10px] text-gray-400 ${isAdmin ? 'mr-6' : ''}`}>{notice.date}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800 mb-1 leading-snug">{notice.title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{notice.content}</p>

                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteNotice(notice.id);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="削除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                <p>お知らせはありません</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Files Card */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 p-6 flex flex-col hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-700 flex items-center">
                            <Clock size={18} className="mr-2 text-blue-500" />
                            最近のファイル
                        </h3>
                        <span className="text-xs text-gray-400">{accessibleFiles.length} files</span>
                    </div>
                    <div className="space-y-3 flex-1">
                        {accessibleFiles.length > 0 ? (
                            <div className="h-[360px] overflow-hidden relative group-list">
                                <div className={`${accessibleFiles.length > 5 ? 'animate-scroll-y' : ''}`}>
                                    {/* Original List */}
                                    {accessibleFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => onFileClick(file)}
                                            className="group flex items-center p-2 hover:bg-blue-50/50 rounded-lg transition-colors cursor-pointer mb-3"
                                        >
                                            <div className="p-2 bg-white rounded-lg shadow-sm mr-3 border border-gray-100 group-hover:border-blue-100">
                                                {getFileIcon(file.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500 truncate flex items-center">
                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{getFolderName(file.folder_id)}</span>
                                                    {new Date(file.created_at || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                            <ExternalLink size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}

                                    {/* Duplicate List for Seamless Scrolling if > 5 items */}
                                    {accessibleFiles.length > 5 && accessibleFiles.map(file => (
                                        <div
                                            key={`dup-${file.id}`}
                                            onClick={() => onFileClick(file)}
                                            className="group flex items-center p-2 hover:bg-blue-50/50 rounded-lg transition-colors cursor-pointer mb-3"
                                        >
                                            <div className="p-2 bg-white rounded-lg shadow-sm mr-3 border border-gray-100 group-hover:border-blue-100">
                                                {getFileIcon(file.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500 truncate flex items-center">
                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{getFolderName(file.folder_id)}</span>
                                                    {new Date(file.created_at || '').toLocaleDateString()}
                                                </p>
                                            </div>
                                            <ExternalLink size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                                <FileIcon size={24} className="mb-2 opacity-50" />
                                <p>最近のファイルはありません</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
