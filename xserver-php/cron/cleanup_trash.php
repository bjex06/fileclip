<?php
/**
 * ゴミ箱の自動クリーンアップスクリプト
 * 30日以上経過したゴミ箱内のファイルを完全に削除します
 * 実行頻度: 1日1回 (cronで設定)
 */

require_once __DIR__ . '/../config/database.php';

// ログ出力設定
$logFile = __DIR__ . '/../logs/cleanup.log';
function logMessage($message)
{
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
    echo "[$timestamp] $message\n";
}

try {
    logMessage("Starting trash cleanup...");

    $pdo = getDatabaseConnection();

    // 30日前の日時
    $thresholdDate = date('Y-m-d H:i:s', strtotime('-30 days'));
    logMessage("Threshold date: $thresholdDate");

    // 1. 期限切れの削除済みファイルを完全に削除
    $stmt = $pdo->prepare("
        SELECT id, storage_path, thumbnail_path, size, created_by 
        FROM files 
        WHERE is_deleted = TRUE AND deleted_at < ?
    ");
    $stmt->execute([$thresholdDate]);
    $expiredFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $deletedFilesCount = 0;
    foreach ($expiredFiles as $file) {
        $fileId = $file['id'];

        // 物理ファイルを削除
        $filePath = __DIR__ . '/../uploads/' . $file['storage_path'];
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // サムネイルも削除
        if ($file['thumbnail_path']) {
            $thumbnailPath = __DIR__ . '/../uploads/' . $file['thumbnail_path'];
            if (file_exists($thumbnailPath)) {
                unlink($thumbnailPath);
            }
        }

        // バージョン履歴のファイルも削除
        $stmtVersion = $pdo->prepare("SELECT storage_path FROM file_versions WHERE file_id = ?");
        $stmtVersion->execute([$fileId]);
        $versions = $stmtVersion->fetchAll(PDO::FETCH_ASSOC);
        foreach ($versions as $version) {
            $versionPath = __DIR__ . '/../uploads/' . $version['storage_path'];
            if (file_exists($versionPath)) {
                unlink($versionPath);
            }
        }

        // DBから関連データを削除
        $pdo->prepare("DELETE FROM file_versions WHERE file_id = ?")->execute([$fileId]);

        // ストレージ使用量を更新
        $pdo->prepare("UPDATE users SET storage_used = storage_used - ? WHERE id = ?")->execute([$file['size'], $file['created_by']]);

        // DBから完全削除
        $pdo->prepare("DELETE FROM files WHERE id = ?")->execute([$fileId]);

        $deletedFilesCount++;
    }

    logMessage("Deleted $deletedFilesCount expired files.");

    // 2. 期限切れの削除済みフォルダを完全に削除
    // 注意: 子要素もすべて削除する必要があるため、再帰的な処理が必要だが、
    // ここでは親フォルダが期限切れなら、中身も道連れで削除する方針とする。
    // 中身がまだ30日経っていなくても、親が消えるなら消えるべきという判断。

    $stmt = $pdo->prepare("
        SELECT id FROM folders 
        WHERE is_deleted = TRUE AND deleted_at < ?
    ");
    $stmt->execute([$thresholdDate]);
    $expiredFolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    include_once __DIR__ . '/../api/trash/delete.php'; // Reuse permanentlyDeleteFolder function if possible, but need to refactor or copy logic.
    // simpler to copy logic for standalone script reliability

    $deletedFoldersCount = 0;
    foreach ($expiredFolders as $folder) {
        permanentlyDeleteFolderRecursive($pdo, $folder['id']);
        $deletedFoldersCount++;
    }

    logMessage("Deleted $deletedFoldersCount expired folders.");
    logMessage("Cleanup completed successfully.");

} catch (Exception $e) {
    logMessage("Error: " . $e->getMessage());
}

// フォルダ削除用再帰関数 (Copied & Adapted from trash/delete.php)
function permanentlyDeleteFolderRecursive($pdo, $folderId)
{
    // 子フォルダ
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE parent_id = ?");
    $stmt->execute([$folderId]);
    $subfolders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($subfolders as $sub) {
        permanentlyDeleteFolderRecursive($pdo, $sub['id']);
    }

    // フォルダ内のファイル
    $stmt = $pdo->prepare("SELECT id, storage_path, thumbnail_path, size, created_by FROM files WHERE folder_id = ?");
    $stmt->execute([$folderId]);
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($files as $file) {
        $filePath = __DIR__ . '/../uploads/' . $file['storage_path'];
        if (file_exists($filePath))
            unlink($filePath);

        if ($file['thumbnail_path']) {
            $thumbnailPath = __DIR__ . '/../uploads/' . $file['thumbnail_path'];
            if (file_exists($thumbnailPath))
                unlink($thumbnailPath);
        }

        // Versions
        $stmtV = $pdo->prepare("SELECT storage_path FROM file_versions WHERE file_id = ?");
        $stmtV->execute([$file['id']]);
        $versions = $stmtV->fetchAll(PDO::FETCH_ASSOC);
        foreach ($versions as $v) {
            $vp = __DIR__ . '/../uploads/' . $v['storage_path'];
            if (file_exists($vp))
                unlink($vp);
        }
        $pdo->prepare("DELETE FROM file_versions WHERE file_id = ?")->execute([$file['id']]);
        $pdo->prepare("UPDATE users SET storage_used = storage_used - ? WHERE id = ?")->execute([$file['size'], $file['created_by']]);
    }

    $pdo->prepare("DELETE FROM files WHERE folder_id = ?")->execute([$folderId]);
    $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ?")->execute([$folderId]);
    $pdo->prepare("DELETE FROM folders WHERE id = ?")->execute([$folderId]);

    $uploadDir = __DIR__ . '/../uploads/' . $folderId;
    if (is_dir($uploadDir)) {
        array_map('unlink', glob("$uploadDir/*"));
        rmdir($uploadDir);
    }
}
?>