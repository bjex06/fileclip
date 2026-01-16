import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, File as FileIcon, Image, FileText, Video, FileSpreadsheet, AlertCircle, Loader } from 'lucide-react';
import { File } from '../../types';
import { useFileSystem } from '../../context/FileSystemContext';
import Papa from 'papaparse';
import * as mammoth from 'mammoth';
import { read, utils, WorkBook } from 'xlsx';

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
    const [previewContent, setPreviewContent] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // Excel specific state
    const [workbook, setWorkbook] = useState<WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [currentSheet, setCurrentSheet] = useState<string | null>(null);

    const isImage = file.type === 'image' || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
    const isVideo = file.type === 'video' || file.name.match(/\.(mp4|mov|avi|wmv|flv|mkv|webm)$/i);
    const isPdf = file.type === 'pdf' || file.name.match(/\.pdf$/i);
    const isDocx = file.name.match(/\.docx$/i);
    const isDoc = file.type === 'word' || file.name.match(/\.doc$/i); // Includes .doc and .docx broadly, but we separate for mammoth
    const isDocument = isDocx; // Only preview docx
    const isSpreadsheet = file.type === 'excel' || file.name.match(/\.(xls|xlsx|csv)$/i);
    const isCsv = file.name.match(/\.csv$/i);

    // Get file data URL and content
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setPreviewContent(null);
        setPreviewError(null);
        setWorkbook(null);
        setSheetNames([]);
        setCurrentSheet(null);

        const loadContent = async () => {
            const url = getFileDataUrl(file.id);
            if (!url) {
                if (isMounted) {
                    setDataUrl(null);
                    setLoading(false);
                }
                return;
            }

            if (isMounted) setDataUrl(url);

            if (isDocument || isSpreadsheet) {
                // Check file size for expensive operations (5MB limit)
                const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;
                if (file.size > MAX_PREVIEW_SIZE) {
                    if (isMounted) {
                        setPreviewError('ファイルサイズが大きすぎるためプレビューできません（5MB制限）');
                        setLoading(false);
                    }
                    return;
                }

                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                    const blob = await response.blob();

                    if (isCsv) {
                        const text = await blob.text();
                        Papa.parse(text, {
                            complete: (results) => {
                                if (isMounted) {
                                    // Generate simple table HTML
                                    const rows = results.data;
                                    let html = '<div class="overflow-auto max-h-full"><table class="min-w-full border-collapse border border-gray-300 bg-white text-sm">';
                                    rows.forEach((row: any, i) => {
                                        html += '<tr>';
                                        if (Array.isArray(row)) {
                                            row.forEach((cell: any) => {
                                                html += `<td class="border border-gray-300 p-2 ${i === 0 ? 'bg-gray-100 font-medium' : ''}">${cell}</td>`;
                                            });
                                        }
                                        html += '</tr>';
                                    });
                                    html += '</table></div>';
                                    setPreviewContent(html);
                                }
                            },
                            error: (err: Error) => {
                                console.error('CSV Parse Error:', err);
                                if (isMounted) setPreviewError('CSVの読み込みに失敗しました');
                            }
                        });
                    } else if (isDocument) {
                        const arrayBuffer = await blob.arrayBuffer();
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        if (isMounted) setPreviewContent(result.value);
                    } else if (isSpreadsheet) { // Excel
                        const arrayBuffer = await blob.arrayBuffer();
                        const wb = read(arrayBuffer);
                        if (isMounted) {
                            setWorkbook(wb);
                            setSheetNames(wb.SheetNames);
                            if (wb.SheetNames.length > 0) {
                                setCurrentSheet(wb.SheetNames[0]);
                                // Initial render of first sheet
                                const worksheet = wb.Sheets[wb.SheetNames[0]];
                                const html = utils.sheet_to_html(worksheet, { id: 'excel-preview', header: '' });
                                setPreviewContent(html);
                            } else {
                                setPreviewContent('<p>シートが見つかりませんでした</p>');
                            }
                        }
                    }
                } catch (error) {
                    console.error('Preview generation failed:', error);
                    if (isMounted) setPreviewError('プレビューの生成に失敗しました');
                }
            }

            if (isMounted) setLoading(false);
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, [file.id, getFileDataUrl]);

    // Update spreadsheet content when sheet changes
    useEffect(() => {
        if (workbook && currentSheet) {
            const worksheet = workbook.Sheets[currentSheet];
            const html = utils.sheet_to_html(worksheet, { id: 'excel-preview', header: '' });
            setPreviewContent(html);
        }
    }, [currentSheet, workbook]);

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
        if (isDocument || isDoc) return <FileText size={48} className="text-blue-400" />;
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

        // PDF preview
        if (isPdf && dataUrl) {
            return (
                <iframe
                    src={dataUrl}
                    title={file.name}
                    className="w-full h-[70vh] sm:h-[80vh] max-w-4xl rounded-lg bg-white"
                />
            );
        }

        // Legacy Word (.doc) warning
        if (isDoc && !isDocx) {
            return (
                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-800/80 backdrop-blur rounded-2xl flex flex-col items-center justify-center text-gray-400 p-6 sm:p-8">
                    <FileText size={48} className="text-blue-400 mb-4" />
                    <p className="text-center text-white font-medium">古いWord形式(.doc)</p>
                    <p className="text-center text-xs mt-2 text-yellow-400">この形式はプレビューできません。<br />ダウンロードしてご確認ください。</p>
                    <button onClick={handleDownload} className="mt-4 px-4 py-2 bg-[#64D2C3] text-white rounded-lg text-sm">
                        ダウンロード
                    </button>
                </div>
            );
        }

        // Document & Spreadsheet HTML Preview
        if ((isDocument || isSpreadsheet) && previewContent) {
            return (
                <div className="w-full h-[70vh] sm:h-[80vh] max-w-5xl rounded-lg bg-white overflow-hidden shadow-2xl flex flex-col">
                    {/* Warning Header */}
                    <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-center text-yellow-800 text-xs sm:text-sm flex justify-center items-center gap-2">
                        <AlertCircle size={14} />
                        <span>これは簡易プレビューです。正確なレイアウトを確認するには<button onClick={handleDownload} className="underline font-semibold ml-1">ダウンロード</button>してください。</span>
                    </div>

                    {/* Excel Sheet Tabs */}
                    {isSpreadsheet && !isCsv && sheetNames.length > 0 && (
                        <div className="bg-gray-100 border-b border-gray-200 overflow-x-auto whitespace-nowrap px-2 flex gap-1">
                            {sheetNames.map(sheet => (
                                <button
                                    key={sheet}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentSheet(sheet);
                                    }}
                                    className={`px-4 py-2 text-sm border-b-2 transition-colors ${currentSheet === sheet
                                        ? 'border-[#64D2C3] text-[#64D2C3] bg-white'
                                        : 'border-transparent text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {sheet}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-auto p-4 sm:p-8">
                        <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: previewContent }}
                        />
                    </div>
                    <style>{`
                        table { border-collapse: collapse; min-width: 100%; }
                        td, th { border: 1px solid #ccc; padding: 4px 8px; white-space: nowrap; }
                    `}</style>
                </div>
            );
        }

        if ((isDocument || isSpreadsheet) && previewError) {
            return (
                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-gray-800/80 backdrop-blur rounded-2xl flex flex-col items-center justify-center text-gray-400 p-6 sm:p-8">
                    <AlertCircle size={48} className="text-red-400 mb-4" />
                    <p className="text-center text-white font-medium">プレビューエラー</p>
                    <p className="text-center text-xs mt-2">{previewError}</p>
                    <button onClick={handleDownload} className="mt-4 px-4 py-2 bg-[#64D2C3] text-white rounded-lg text-sm">
                        ダウンロードして確認
                    </button>
                </div>
            );
        }

        // Fallback
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
                        className="p-3 sm:p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors active:bg-white/20"
                        title="ダウンロード"
                        aria-label="ダウンロード"
                    >
                        <Download size={20} className="sm:w-5 sm:h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 sm:p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors active:bg-white/20"
                        title="閉じる"
                        aria-label="閉じる"
                    >
                        <X size={24} className="sm:w-5 sm:h-5" />
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
                    className="relative max-w-full max-h-full flex flex-col items-center w-full"
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
