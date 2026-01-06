<?php
/**
 * ゴミ箱自動クリーンアップ（30日経過アイテム削除）
 *
 * Xserver cronで毎日1回実行する
 * 設定例: 0 3 * * * php /home/サーバーID/ドメイン/public_html/api/cron/cleanup-trash.php
 */

// CLIからの実行のみ許可（セキュリティ対策）
if (php_sapi_name() !== 'cli') {
    // Web経由の場合はトークン認証を要求
    $token = $_GET['token'] ?? $_SERVER['HTTP_X_CRON_TOKEN'] ?? '';
    $validToken = getenv('CRON_SECRET_TOKEN') ?: 'your-secret-cron-token-here';

    if ($token !== $validToken) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit();
    }
}

require_once '../../config/database.php';

// ログ出力関数
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    echo $logMessage;

    // ログファイルにも出力
    $logDir = __DIR__ . '/../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    file_put_contents($logDir . '/cleanup.log', $logMessage, FILE_APPEND);
}

try {
    logMessage("=== ゴミ箱クリーンアップ開始 ===");

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $deletedFilesCount = 0;
    $deletedFoldersCount = 0;
    $freedSpace = 0;

    // 30日以上経過した削除済みファイルを取得
    $stmt = $pdo->prepare("
        SELECT id, storage_path, thumbnail_path, size, created_by, name
        FROM files
        WHERE is_deleted = TRUE
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();
    $expiredFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    logMessage("期限切れファイル数: " . count($expiredFiles));

    foreach ($expiredFiles as $file) {
        // 物理ファイルを削除
        $filePath = __DIR__ . '/../../uploads/' . $file['storage_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
            logMessage("ファイル削除: " . $file['name'] . " (" . $file['storage_path'] . ")");
        }

        // サムネイルを削除
        if ($file['thumbnail_path']) {
            $thumbnailPath = __DIR__ . '/../../uploads/' . $file['thumbnail_path'];
            if (file_exists($thumbnailPath)) {
                unlink($thumbnailPath);
            }
        }

        // バージョン履歴のファイルを削除
        $stmt2 = $pdo->prepare("SELECT storage_path FROM file_versions WHERE file_id = ?");
        $stmt2->execute([$file['id']]);
        $versions = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        foreach ($versions as $version) {
            $versionPath = __DIR__ . '/../../uploads/' . $version['storage_path'];
            if (file_exists($versionPath)) {
                unlink($versionPath);
            }
        }

        // バージョン履歴をDBから削除
        $stmt2 = $pdo->prepare("DELETE FROM file_versions WHERE file_id = ?");
        $stmt2->execute([$file['id']]);

        // ストレージ使用量を更新
        $stmt2 = $pdo->prepare("UPDATE users SET storage_used = GREATEST(0, storage_used - ?) WHERE id = ?");
        $stmt2->execute([$file['size'], $file['created_by']]);

        $freedSpace += $file['size'];
        $deletedFilesCount++;
    }

    // 期限切れファイルをDBから削除
    $stmt = $pdo->prepare("
        DELETE FROM files
        WHERE is_deleted = TRUE
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();

    // 30日以上経過した削除済みフォルダを取得
    $stmt = $pdo->prepare("
        SELECT id, name
        FROM folders
        WHERE is_deleted = TRUE
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();
    $expiredFolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    logMessage("期限切れフォルダ数: " . count($expiredFolders));

    foreach ($expiredFolders as $folder) {
        // フォルダ権限を削除
        $stmt2 = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ?");
        $stmt2->execute([$folder['id']]);

        // アップロードディレクトリを削除
        $uploadDir = __DIR__ . '/../../uploads/' . $folder['id'];
        if (is_dir($uploadDir)) {
            // ディレクトリ内のファイルを削除
            $files = glob($uploadDir . '/*');
            foreach ($files as $f) {
                if (is_file($f)) {
                    unlink($f);
                }
            }
            @rmdir($uploadDir);
            logMessage("フォルダディレクトリ削除: " . $folder['name']);
        }

        $deletedFoldersCount++;
    }

    // 期限切れフォルダをDBから削除
    $stmt = $pdo->prepare("
        DELETE FROM folders
        WHERE is_deleted = TRUE
        AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();

    // アクティビティログに記録
    if ($deletedFilesCount > 0 || $deletedFoldersCount > 0) {
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, resource_type, resource_name, ip_address)
            VALUES (NULL, 'auto_cleanup', 'system', ?, '127.0.0.1')
        ");
        $logDetail = "ファイル:{$deletedFilesCount}件, フォルダ:{$deletedFoldersCount}件, 解放容量:" . formatBytes($freedSpace);
        $stmt->execute([$logDetail]);
    }

    $pdo->commit();

    logMessage("削除完了 - ファイル: {$deletedFilesCount}件, フォルダ: {$deletedFoldersCount}件");
    logMessage("解放容量: " . formatBytes($freedSpace));
    logMessage("=== ゴミ箱クリーンアップ完了 ===");

    // 結果をJSON出力（API経由の場合）
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'deleted_files' => $deletedFilesCount,
            'deleted_folders' => $deletedFoldersCount,
            'freed_space' => $freedSpace,
            'freed_space_formatted' => formatBytes($freedSpace)
        ]);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    logMessage("エラー: " . $e->getMessage());

    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }

    exit(1);
}

/**
 * バイト数を読みやすい形式に変換
 */
function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];

    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);

    $bytes /= pow(1024, $pow);

    return round($bytes, $precision) . ' ' . $units[$pow];
}
?>
