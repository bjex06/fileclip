import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText, Image, Film, Music, Archive, File } from 'lucide-react';
import { fileSystemApi } from '../utils/fileSystemApi';
import { TrashItem } from '../types';
import { toast } from 'sonner';

interface TrashPanelProps {
  onClose?: () => void;
}

export default function TrashPanel({ onClose }: TrashPanelProps) {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  useEffect(() => {
    loadTrashItems();
  }, []);

  const loadTrashItems = async () => {
    setLoading(true);
    try {
      const response = await fileSystemApi.getTrashItems();
      if (response.success && response.data) {
        setTrashItems(response.data);
      }
    } catch (error) {
      toast.error('ゴミ箱の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      const response = await fileSystemApi.restoreFromTrash(item.id, item.type);
      if (response.success) {
        toast.success(`${item.name} を復元しました`);
        loadTrashItems();
      } else {
        toast.error(response.error || '復元に失敗しました');
      }
    } catch (error) {
      toast.error('復元に失敗しました');
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!confirm(`${item.name} を完全に削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fileSystemApi.permanentlyDelete(item.id, item.type);
      if (response.success) {
        toast.success(`${item.name} を完全に削除しました`);
        loadTrashItems();
      } else {
        toast.error(response.error || '削除に失敗しました');
      }
    } catch (error) {
      toast.error('削除に失敗しました');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const response = await fileSystemApi.emptyTrash();
      if (response.success) {
        toast.success('ゴミ箱を空にしました');
        setTrashItems([]);
        setShowEmptyConfirm(false);
      } else {
        toast.error(response.error || 'ゴミ箱を空にできませんでした');
      }
    } catch (error) {
      toast.error('ゴミ箱を空にできませんでした');
    }
  };

  const getFileIcon = (item: TrashItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-5 h-5 text-yellow-500" />;
    }

    const ext = item.extension?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <Image className="w-5 h-5 text-green-500" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return <Film className="w-5 h-5 text-purple-500" />;
    }
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
      return <Music className="w-5 h-5 text-pink-500" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-5 h-5 text-orange-500" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">ゴミ箱</h2>
          <span className="text-sm text-gray-500">({trashItems.length})</span>
        </div>
        {trashItems.length > 0 && (
          <button
            onClick={() => setShowEmptyConfirm(true)}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            ゴミ箱を空にする
          </button>
        )}
      </div>

      {/* Empty Confirm Modal */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">ゴミ箱を空にしますか？</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ゴミ箱内の全てのアイテム（{trashItems.length}件）が完全に削除されます。
              この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                空にする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Trash2 className="w-16 h-16 mb-4 opacity-20" />
            <p>ゴミ箱は空です</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trashItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(item)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(item.deleted_at)}</span>
                      {item.type === 'file' && (
                        <>
                          <span>-</span>
                          <span>{formatSize(item.size)}</span>
                        </>
                      )}
                      <span>-</span>
                      <span className="truncate">{item.original_path}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRestore(item)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="復元"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="完全に削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          ゴミ箱のアイテムは30日後に自動的に削除されます
        </p>
      </div>
    </div>
  );
}
