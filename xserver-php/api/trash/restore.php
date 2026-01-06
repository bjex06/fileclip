<?php
/**
 * ゴミ箱から復元API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    $isAdmin = $payload['role'] === 'admin';

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
            // ファイルを復元
            $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = TRUE");
            $stmt->execute([$itemId]);
            $file = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$file) {
                throw new Exception('ファイルが見つかりません');
            }

            // 権限チェック
            if (!$isAdmin && $file['created_by'] != $userId) {
                throw new Exception('このファイルの復元権限がありません');
            }

            // 復元先フォルダが存在するか確認
            $stmt = $pdo->prepare("SELECT id, is_deleted FROM folders WHERE id = ?");
            $stmt->execute([$file['folder_id']]);
            $folder = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$folder || $folder['is_deleted']) {
                throw new Exception('復元先フォルダが存在しないか、削除されています。先にフォルダを復元してください。');
            }

            // ファイルを復元
            $stmt = $pdo->prepare("UPDATE files SET is_deleted = FALSE, deleted_at = NULL WHERE id = ?");
            $stmt->execute([$itemId]);

            $resourceName = $file['name'];

        } else {
            // フォルダを復元
            $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = TRUE");
            $stmt->execute([$itemId]);
            $folder = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$folder) {
                throw new Exception('フォルダが見つかりません');
            }

            // 権限チェック
            if (!$isAdmin && $folder['created_by'] != $userId) {
                throw new Exception('このフォルダの復元権限がありません');
            }

            // 親フォルダが存在するか確認（親がある場合）
            if ($folder['parent_id']) {
                $stmt = $pdo->prepare("SELECT id, is_deleted FROM folders WHERE id = ?");
                $stmt->execute([$folder['parent_id']]);
                $parentFolder = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$parentFolder || $parentFolder['is_deleted']) {
                    throw new Exception('親フォルダが存在しないか、削除されています。先に親フォルダを復元してください。');
                }
            }

            // フォルダを復元
            $stmt = $pdo->prepare("UPDATE folders SET is_deleted = FALSE, deleted_at = NULL WHERE id = ?");
            $stmt->execute([$itemId]);

            // サブフォルダとファイルも復元
            restoreSubfolders($pdo, $itemId);

            $resourceName = $folder['name'];
        }

        // アクティビティログを記録
        $logId = generateUUID();
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address, user_agent, created_at)
            VALUES (?, ?, 'restore', ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $logId,
            $userId,
            $itemType,
            $itemId,
            $resourceName,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => ($itemType === 'file' ? 'ファイル' : 'フォルダ') . 'を復元しました'
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

function restoreSubfolders($pdo, $parentId) {
    // 子フォルダを復元
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE parent_id = ? AND is_deleted = TRUE");
    $stmt->execute([$parentId]);
    $subfolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subfolders as $subfolder) {
        $stmt = $pdo->prepare("UPDATE folders SET is_deleted = FALSE, deleted_at = NULL WHERE id = ?");
        $stmt->execute([$subfolder['id']]);

        // フォルダ内のファイルも復元
        $stmt = $pdo->prepare("UPDATE files SET is_deleted = FALSE, deleted_at = NULL WHERE folder_id = ? AND is_deleted = TRUE");
        $stmt->execute([$subfolder['id']]);

        // 再帰的に処理
        restoreSubfolders($pdo, $subfolder['id']);
    }

    // 現在のフォルダ内のファイルも復元
    $stmt = $pdo->prepare("UPDATE files SET is_deleted = FALSE, deleted_at = NULL WHERE folder_id = ? AND is_deleted = TRUE");
    $stmt->execute([$parentId]);
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
?>
