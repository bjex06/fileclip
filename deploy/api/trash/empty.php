<?php
/**
 * ゴミ箱を空にするAPI
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/auth.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $userId = $payload['user_id'];
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    try {
        $deletedCount = 0;

        // 削除対象のファイルを取得
        if ($isAdmin) {
            $stmt = $pdo->prepare("SELECT id, storage_path, size, created_by FROM files WHERE is_deleted = TRUE");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT id, storage_path, size, created_by FROM files WHERE is_deleted = TRUE AND created_by = ?");
            $stmt->execute([$userId]);
        }
        $deletedFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($deletedFiles as $file) {
            // 物理ファイルを削除
            $filePath = '../../uploads/' . $file['storage_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            // バージョン履歴のファイルを削除 (テーブルが存在しないため一時的に無効化)
            /*
            $stmt2 = $pdo->prepare("SELECT storage_path FROM file_versions WHERE file_id = ?");
            $stmt2->execute([$file['id']]);
            $versions = $stmt2->fetchAll(PDO::FETCH_ASSOC);
            foreach ($versions as $version) {
                $versionPath = '../../uploads/' . $version['storage_path'];
                if (file_exists($versionPath)) {
                    unlink($versionPath);
                }
            }

            // バージョン履歴を削除
            $stmt2 = $pdo->prepare("DELETE FROM file_versions WHERE file_id = ?");
            $stmt2->execute([$file['id']]);
            */

            // ストレージ使用量を更新 (カラムが存在しないため一時的に無効化)
            /*
            $stmt2 = $pdo->prepare("UPDATE users SET storage_used = GREATEST(0, storage_used - ?) WHERE id = ?");
            $stmt2->execute([$file['size'], $file['created_by']]);
            */

            $deletedCount++;
        }

        // ファイルをDBから削除
        if ($isAdmin) {
            $stmt = $pdo->prepare("DELETE FROM files WHERE is_deleted = TRUE");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("DELETE FROM files WHERE is_deleted = TRUE AND created_by = ?");
            $stmt->execute([$userId]);
        }

        // 削除対象のフォルダを取得
        if ($isAdmin) {
            $stmt = $pdo->prepare("SELECT id FROM folders WHERE is_deleted = TRUE");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("SELECT id FROM folders WHERE is_deleted = TRUE AND created_by = ?");
            $stmt->execute([$userId]);
        }
        $deletedFolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($deletedFolders as $folder) {
            // フォルダ権限を削除
            $stmt2 = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ?");
            $stmt2->execute([$folder['id']]);

            // アップロードディレクトリを削除
            $uploadDir = '../../uploads/' . $folder['id'];
            if (is_dir($uploadDir)) {
                array_map('unlink', glob("$uploadDir/*"));
                @rmdir($uploadDir);
            }

            $deletedCount++;
        }

        // フォルダをDBから削除
        if ($isAdmin) {
            $stmt = $pdo->prepare("DELETE FROM folders WHERE is_deleted = TRUE");
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare("DELETE FROM folders WHERE is_deleted = TRUE AND created_by = ?");
            $stmt->execute([$userId]);
        }

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => 'ゴミ箱を空にしました',
            'deleted_count' => $deletedCount
        ];

        http_response_code(200);
        echo json_encode($response);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>