<?php
/**
 * ゴミ箱からの完全削除API
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
require_once '../../utils/validation.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $userId = $payload['user_id'];
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['id']) || !isset($input['type'])) {
        throw new Exception('IDとタイプが必要です');
    }

    $itemId = $input['id'];
    $itemType = $input['type'];

    if (!isValidId($itemId)) {
        throw new Exception('無効なIDです');
    }

    if (!in_array($itemType, ['file', 'folder'])) {
        throw new Exception('タイプはfileまたはfolderである必要があります');
    }

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    try {
        if ($itemType === 'file') {
            // ファイルを完全削除
            $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = TRUE");
            $stmt->execute([$itemId]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$file) {
                throw new Exception('ファイルが見つかりません');
            }

            // 権限チェック
            if (!$isAdmin && $file['created_by'] != $userId) {
                throw new Exception('このファイルの削除権限がありません');
            }

            // 物理ファイルを削除
            $filePath = '../../uploads/' . $file['storage_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            // バージョン履歴のファイルも削除 (テーブルが存在しないため一時的に無効化)
            /*
            $stmt = $pdo->prepare("SELECT storage_path FROM file_versions WHERE file_id = ?");
            $stmt->execute([$itemId]);
            $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($versions as $version) {
                $versionPath = '../../uploads/' . $version['storage_path'];
                if (file_exists($versionPath)) {
                    unlink($versionPath);
                }
            }

            // バージョン履歴を削除
            $stmt = $pdo->prepare("DELETE FROM file_versions WHERE file_id = ?");
            $stmt->execute([$itemId]);
            */

            // ストレージ使用量を更新 (カラムが存在しないため一時的に無効化)
            /*
            $stmt = $pdo->prepare("UPDATE users SET storage_used = storage_used - ? WHERE id = ?");
            $stmt->execute([$file['size'], $file['created_by']]);
            */

            // DBから完全削除
            $stmt = $pdo->prepare("DELETE FROM files WHERE id = ?");
            $stmt->execute([$itemId]);

        } else {
            // フォルダを完全削除
            $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = TRUE");
            $stmt->execute([$itemId]);
            $folder = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$folder) {
                throw new Exception('フォルダが見つかりません');
            }

            // 権限チェック
            if (!$isAdmin && $folder['created_by'] != $userId) {
                throw new Exception('このフォルダの削除権限がありません');
            }

            // フォルダとその内容を再帰的に完全削除
            permanentlyDeleteFolder($pdo, $itemId);
        }

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => '完全に削除しました'
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

function permanentlyDeleteFolder($pdo, $folderId)
{
    // 子フォルダを再帰的に削除
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE parent_id = ?");
    $stmt->execute([$folderId]);
    $subfolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subfolders as $subfolder) {
        permanentlyDeleteFolder($pdo, $subfolder['id']);
    }

    // フォルダ内のファイルを削除
    $stmt = $pdo->prepare("SELECT id, storage_path, size, created_by FROM files WHERE folder_id = ?");
    $stmt->execute([$folderId]);
    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($files as $file) {
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
        $stmt2 = $pdo->prepare("UPDATE users SET storage_used = storage_used - ? WHERE id = ?");
        $stmt2->execute([$file['size'], $file['created_by']]);
        */
    }

    // ファイルをDBから削除
    $stmt = $pdo->prepare("DELETE FROM files WHERE folder_id = ?");
    $stmt->execute([$folderId]);

    // フォルダ権限を削除
    $stmt = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ?");
    $stmt->execute([$folderId]);

    // フォルダをDBから削除
    $stmt = $pdo->prepare("DELETE FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);

    // アップロードディレクトリを削除
    $uploadDir = '../../uploads/' . $folderId;
    if (is_dir($uploadDir)) {
        array_map('unlink', glob("$uploadDir/*"));
        rmdir($uploadDir);
    }
}
?>