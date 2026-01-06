import React, { useState } from 'react';
import { Save, AlertTriangle, FileText, Server, HardDrive, Clock, Activity, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface SystemConfig {
    maxFileSize: number; // MB
    totalStorageLimit: number; // GB
    allowedExtensions: string[];
    maintenanceMode: boolean;
    retentionPeriod: number; // days
}

const SystemSettingsPanel: React.FC = () => {
    const [config, setConfig] = useState<SystemConfig>({
        maxFileSize: 50,
        totalStorageLimit: 100,
        allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'zip'],
        maintenanceMode: false,
        retentionPeriod: 90
    });

    const [loading, setLoading] = useState(false);
    const [extensionsInput, setExtensionsInput] = useState(config.allowedExtensions.join(', '));

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 実際にはAPIを呼び出して保存する
            // await systemApi.updateConfig(config);
            await new Promise(resolve => setTimeout(resolve, 800)); // モック遅延

            const newExtensions = extensionsInput.split(',').map(ext => ext.trim()).filter(ext => ext);
            setConfig(prev => ({ ...prev, allowedExtensions: newExtensions }));

            toast.success('システム設定を保存しました');
        } catch (error) {
            toast.error('設定の保存に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = () => {
        if (confirm('ブラウザのキャッシュと一時データをクリアしますか？\n(ログイン状態は維持されます)')) {
            localStorage.removeItem('file_cache'); // 仮のキャッシュキー
            toast.success('キャッシュをクリアしました');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center text-gray-800">
                        <Server className="mr-2 text-blue-600" size={24} />
                        システム全体設定
                    </h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        v1.2.0 (Build 20241212)
                    </span>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    {/* ストレージ設定 */}
                    <div className="border-b border-gray-100 pb-6">
                        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                            <HardDrive className="mr-2 text-gray-500" size={20} />
                            ストレージ制限
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    1ファイルあたりの最大サイズ (MB)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1024"
                                    value={config.maxFileSize}
                                    onChange={(e) => setConfig({ ...config, maxFileSize: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">推奨: 10-100MB</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    システム全体の保存容量 (GB)
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="number"
                                        min="1"
                                        value={config.totalStorageLimit}
                                        onChange={(e) => setConfig({ ...config, totalStorageLimit: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 flex justify-between">
                                    <span>現在: 45GB 使用中</span>
                                    <span>上限: {config.totalStorageLimit}GB</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* アップロード制限 */}
                    <div className="border-b border-gray-100 pb-6">
                        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                            <FileText className="mr-2 text-gray-500" size={20} />
                            ファイル形式制限
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                許可する拡張子 (カンマ区切り)
                            </label>
                            <textarea
                                value={extensionsInput}
                                onChange={(e) => setExtensionsInput(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                例: pdf, doc, docx, xls, xlsx, jpg, png
                            </p>
                        </div>
                    </div>

                    {/* ログ設定 */}
                    <div className="border-b border-gray-100 pb-6">
                        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                            <Clock className="mr-2 text-gray-500" size={20} />
                            データ保持ポリシー
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    操作ログ保存期間 (日)
                                </label>
                                <input
                                    type="number"
                                    min="30"
                                    value={config.retentionPeriod}
                                    onChange={(e) => setConfig({ ...config, retentionPeriod: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* メンテナンスモード */}
                    <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3 w-full">
                                <h3 className="text-sm font-medium text-orange-800">メンテナンスモード</h3>
                                <div className="mt-2 text-sm text-orange-700">
                                    <p className="mb-2">有効にすると、管理者以外のユーザーはシステムにアクセスできなくなります。</p>
                                </div>
                                <div className="mt-4 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setConfig({ ...config, maintenanceMode: !config.maintenanceMode })}
                                        className={`${config.maintenanceMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-200 hover:bg-gray-300'
                                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
                                    >
                                        <span
                                            className={`${config.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                        />
                                    </button>
                                    <span className="ml-3 text-sm font-medium text-gray-900">
                                        {config.maintenanceMode ? 'メンテナンス中' : '通常運用中'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <button
                            type="button"
                            onClick={handleClearCache}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                            <RotateCcw className="mr-2" size={16} />
                            システムキャッシュクリア
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                            <Save className="mr-2" size={18} />
                            {loading ? '保存中...' : '設定を保存'}
                        </button>
                    </div>
                </form>
            </div>

            {/* システム情報（Read only） */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                    <Activity className="mr-2 text-gray-500" size={20} />
                    サーバー稼働状況
                </h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">稼働時間</dt>
                        <dd className="mt-1 text-sm text-gray-900">3日 12時間 45分</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">メモリ使用率</dt>
                        <dd className="mt-1 text-sm text-gray-900">32% (2.4GB / 8GB)</dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">DB接続</dt>
                        <dd className="mt-1 text-sm text-green-600 flex items-center">
                            <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                            正常
                        </dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">最終バックアップ</dt>
                        <dd className="mt-1 text-sm text-gray-900">2024/12/12 03:00</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
};

export default SystemSettingsPanel;
