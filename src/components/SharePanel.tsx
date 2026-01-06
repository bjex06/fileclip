import { useState, useEffect } from 'react';
import { Link2, Copy, Trash2, Eye, EyeOff, Calendar, Download, Lock, ExternalLink } from 'lucide-react';
import { fileSystemApi } from '../utils/fileSystemApi';
import { ShareLink } from '../types';
import { toast } from 'sonner';

interface SharePanelProps {
  onClose?: () => void;
}

export default function SharePanel({ onClose }: SharePanelProps) {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShareLinks();
  }, []);

  const loadShareLinks = async () => {
    setLoading(true);
    try {
      const response = await fileSystemApi.getShareLinks();
      if (response.success && response.data) {
        setShareLinks(response.data);
      }
    } catch (error) {
      toast.error('共有リンクの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('リンクをコピーしました');
  };

  const handleDeleteLink = async (shareId: string) => {
    if (!confirm('この共有リンクを削除しますか？')) {
      return;
    }

    try {
      const response = await fileSystemApi.deleteShareLink(shareId);
      if (response.success) {
        toast.success('共有リンクを削除しました');
        loadShareLinks();
      } else {
        toast.error(response.error || '削除に失敗しました');
      }
    } catch (error) {
      toast.error('削除に失敗しました');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpired = (link: ShareLink) => {
    if (!link.expires_at) return false;
    return new Date(link.expires_at) < new Date();
  };

  const isLimitReached = (link: ShareLink) => {
    if (!link.max_downloads) return false;
    return link.download_count >= link.max_downloads;
  };

  const getLinkStatus = (link: ShareLink) => {
    if (!link.is_active) {
      return { label: '無効', className: 'bg-gray-100 text-gray-600' };
    }
    if (isExpired(link)) {
      return { label: '期限切れ', className: 'bg-red-100 text-red-600' };
    }
    if (isLimitReached(link)) {
      return { label: '上限到達', className: 'bg-orange-100 text-orange-600' };
    }
    return { label: '有効', className: 'bg-green-100 text-green-600' };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">共有リンク</h2>
          <span className="text-sm text-gray-500">({shareLinks.length})</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : shareLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Link2 className="w-16 h-16 mb-4 opacity-20" />
            <p>共有リンクはありません</p>
            <p className="text-sm mt-2">ファイルを右クリックして共有リンクを作成できます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shareLinks.map((link) => {
              const status = getLinkStatus(link);
              return (
                <div
                  key={link.id}
                  className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium truncate">
                          {link.resource_name || '不明なリソース'}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                          {link.resource_type === 'file' ? 'ファイル' : 'フォルダ'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {link.has_password && (
                          <div className="flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" />
                            <span>パスワード保護</span>
                          </div>
                        )}
                        {link.expires_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(link.expires_at)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {link.download_count}
                            {link.max_downloads && ` / ${link.max_downloads}`}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <code className="text-xs bg-gray-200 px-2 py-1 rounded truncate max-w-md">
                          {window.location.origin}/share/{link.token}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyLink(link.token)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="リンクをコピー"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`/share/${link.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        title="リンクを開く"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// 共有リンク作成モーダル
interface CreateShareModalProps {
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateShareModal({
  resourceType,
  resourceId,
  resourceName,
  onClose,
  onCreated
}: CreateShareModalProps) {
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [useExpiry, setUseExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [useDownloadLimit, setUseDownloadLimit] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(10);
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<ShareLink | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fileSystemApi.createShareLink({
        resource_type: resourceType,
        resource_id: resourceId,
        password: usePassword ? password : undefined,
        expires_at: useExpiry ? expiryDate : undefined,
        max_downloads: useDownloadLimit ? maxDownloads : undefined
      });

      if (response.success && response.data) {
        setCreatedLink(response.data);
        toast.success('共有リンクを作成しました');
        onCreated();
      } else {
        toast.error(response.error || '作成に失敗しました');
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (createdLink) {
      const url = `${window.location.origin}/share/${createdLink.token}`;
      navigator.clipboard.writeText(url);
      toast.success('リンクをコピーしました');
    }
  };

  // 明日の日付をデフォルトに
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const defaultExpiry = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        {createdLink ? (
          // 作成完了画面
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Link2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">共有リンクを作成しました</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              以下のリンクを共有してください：
            </p>

            <div className="bg-gray-100 p-3 rounded-lg mb-4">
              <code className="text-sm break-all">
                {window.location.origin}/share/{createdLink.token}
              </code>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                コピー
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                閉じる
              </button>
            </div>
          </>
        ) : (
          // 作成フォーム
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Link2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">共有リンクを作成</h3>
                <p className="text-sm text-gray-500">{resourceName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* パスワード保護 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">パスワードで保護</span>
                </label>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* 有効期限 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExpiry}
                    onChange={(e) => {
                      setUseExpiry(e.target.checked);
                      if (e.target.checked && !expiryDate) {
                        setExpiryDate(defaultExpiry);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">有効期限を設定</span>
                </label>
                {useExpiry && (
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* ダウンロード回数制限 */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useDownloadLimit}
                    onChange={(e) => setUseDownloadLimit(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">ダウンロード回数を制限</span>
                </label>
                {useDownloadLimit && (
                  <input
                    type="number"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 1)}
                    min={1}
                    max={1000}
                    className="mt-2 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || (usePassword && !password)}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '作成中...' : '作成'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
