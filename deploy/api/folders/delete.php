<?php
/**
 * フォルダ削除API（ソフトデリート - ゴミ箱へ移動）
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

    if (!$input || !isset($input['folder_id'])) {
        throw new Exception('フォルダIDが必要です');
    }

    $folderId = $input['folder_id'];

    if (!isValidId($folderId)) {
        throw new Exception('無効なフォルダIDです');
    }

    $pdo = getDatabaseConnection();

    // フォルダ存在確認（削除されていないもの）
    $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$folder) {
        throw new Exception('フォルダが見つかりません');
    }

    // 削除権限チェック
    if (!$isAdmin && $folder['created_by'] != $userId) {
        $stmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions
            WHERE folder_id = ? AND user_id = ?
        ");
        $stmt->execute([$folderId, $userId]);
        $permission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$permission || $permission['permission_level'] !== 'manage') {
            throw new Exception('このフォルダの削除権限がありません');
        }
    }

    // トランザクション開始
    $pdo->beginTransaction();

    try {
        // フォルダをソフトデリート
        $stmt = $pdo->prepare("
            UPDATE folders
            SET is_deleted = TRUE, deleted_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$folderId]);

        // サブフォルダも再帰的にソフトデリート
        softDeleteSubfolders($pdo, $folderId);

        // フォルダ内のファイルもソフトデリート
        $stmt = $pdo->prepare("
            UPDATE files
            SET is_deleted = TRUE, deleted_at = NOW()
            WHERE folder_id = ? AND is_deleted = FALSE
        ");
        $stmt->execute([$folderId]);

        // アクティビティログを記録
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, ip_address, created_at)
            VALUES (?, 'delete', 'folder', ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $userId,
            $folderId,
            $folder['name'],
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => 'フォルダをゴミ箱に移動しました'
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

function softDeleteSubfolders($pdo, $parentId)
{
    // 子フォルダを取得
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE parent_id = ? AND is_deleted = FALSE");
    $stmt->execute([$parentId]);
    $subfolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($subfolders as $subfolder) {
        // フォルダをソフトデリート
        $stmt = $pdo->prepare("UPDATE folders SET is_deleted = TRUE, deleted_at = NOW() WHERE id = ?");
        $stmt->execute([$subfolder['id']]);

        // フォルダ内のファイルもソフトデリート
        $stmt = $pdo->prepare("UPDATE files SET is_deleted = TRUE, deleted_at = NOW() WHERE folder_id = ? AND is_deleted = FALSE");
        $stmt->execute([$subfolder['id']]);

        // 再帰的に処理
        softDeleteSubfolders($pdo, $subfolder['id']);
    }
}

function generateUUID()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}
?>