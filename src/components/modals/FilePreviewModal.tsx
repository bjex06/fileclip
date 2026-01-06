import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, File as FileIcon, Image, FileText, Video, FileSpreadsheet, AlertCircle, Loader } from 'lucide-react';
import { File } from '../../types';
import { useFileSystem } from '../../context/FileSystemContext';

interface FilePreviewModalProps {
    file: File;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    file,
    onClose,
    onNext,
    onPrev,
    hasNext = false,
    hasPrev = false,
}) => {
    const { getFileDataUrl, downloadFile } = useFileSystem();
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Get file data URL
    useEffect(() => {
        setLoading(true);
        const url = getFileDataUrl(file.id);
        setDataUrl(url);
        setLoading(false);
    }, [file.id, getFileDataUrl]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
            if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onNext, onPrev, hasNext, hasPrev]);

    const isImage = file.type === 'image' || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    const isVideo = file.type === 'video' || file.name.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    const isPdf = file.type === 'pdf' || file.name.match(/\.pdf$/i);
    const isDocument = file.type === 'word' || file.name.match(/\.(doc|docx)$/i);
    const isSpreadsheet = file.type === 'excel' || file.name.match(/\.(xls|xlsx)$/i);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileTypeIcon = () => {
        if (isImage) return <Image size={48} className="text-purple-400" />;
        if (isVideo) return <Video size={48} className="text-orange-400" />;
        if (isPdf) return <FileText size={48} className="text-red-400" />;
        if (isDocument) return <FileText size={48} className="text-blue-400" />;
        if (isSpreadsheet) return <FileSpreadsheet size={48} className="text-green-400" />;
        return <FileIcon size={48} className="text-gray-400" />;
    };

    const handleDownload = () => {
        downloadFile(file.id, file.name);
    };

    const renderPreview = () => {
        if (loading) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <Loader size={48} className="text-[#64D2C3] animate-spin" />
                </div>
            );
        }

        // Image preview
        if (isImage && dataUrl) {
            return (
                <img
                    src={dataUrl}
                    alt={file.name}
                    className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
            );
        }

        // Video preview
        if (isVideo && dataUrl) {
            return (
                <video
                    src={dataUrl}
                    controls
                    autoPlay={false}
                    className="max-w-full max-h-[70vh] sm:max-h-[80vh] rounded-lg shadow-2xl"
                >
                    お使いのブラウザは動画再生に対応していません
                </video>
            );
        }

        // PDF preview (using iframe for data URL)
        if (isPdf && dataUrl) {
            return (
                <iframe
                    src={dataUrl}
                    title={file.name}
                    className="w-full h-[70vh] sm:h-[80vh] max-w-4xl rounded-lg bg-white"
                />
            );
        }

        // Fallback for unsupported types or missing data
        return (
            <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-800/80 backdrop-blur rounded-2xl flex flex-col items-center justify-center text-gray-400 p-6 sm:p-8">
                <div className="mb-4 p-4 bg-gray-700/50 rounded-full">
                    {dataUrl ? getFileTypeIcon() : <AlertCircle size={48} className="text-yellow-400" />}
                </div>
                <p className="text-base sm:text-lg font-medium text-gray-200 text-center truncate max-w-full px-2">{file.name}</p>
                {!dataUrl ? (
                    <p className="text-xs sm:text-sm mt-2 text-yellow-400 text-center">
                        ファイルデータがありません
                    </p>
                ) : (
                    <p className="text-xs sm:text-sm mt-2 text-gray-400 text-center">
                        このファイル形式はプレビューできません
                    </p>
                )}
                <button
                    onClick={handleDownload}
                    className="mt-4 px-4 py-2 bg-[#64D2C3] text-white rounded-lg text-sm font-medium hover:bg-[#4ABFB0] transition-colors flex items-center gap-2"
                >
                    <Download size={16} />
                    ダウンロード
                </button>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
            {/* Header with file info and controls */}
            <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-50">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg flex-shrink-0">
                        {getFileTypeIcon()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-lg font-medium text-white truncate">{file.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={handleDownload}
                        className="p-2 sm:p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="ダウンロード"
                    >
                        <Download size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 sm:p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="閉じる"
                    >
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Navigation - Left */}
            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all group z-40"
                >
                    <ChevronLeft size={28} className="sm:w-9 sm:h-9 group-hover:-translate-x-1 transition-transform" />
                </button>
            )}

            {/* Navigation - Right */}
            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all group z-40"
                >
                    <ChevronRight size={28} className="sm:w-9 sm:h-9 group-hover:translate-x-1 transition-transform" />
                </button>
            )}

            {/* Content */}
            <div
                className="relative w-full h-full flex items-center justify-center p-4 pt-20 sm:p-12 sm:pt-24"
                onClick={onClose}
            >
                <div
                    className="relative max-w-full max-h-full flex flex-col items-center"
                    onClick={e => e.stopPropagation()}
                >
                    {renderPreview()}
                </div>
            </div>

            {/* Footer with keyboard hints */}
            <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent z-50">
                <div className="flex items-center gap-4 text-[10px] sm:text-xs text-gray-500">
                    <span className="hidden sm:inline">ESC で閉じる</span>
                    {(hasPrev || hasNext) && (
                        <span className="hidden sm:inline">← → でファイル切替</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
