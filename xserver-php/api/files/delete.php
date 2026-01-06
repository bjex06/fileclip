<?php
/**
 * ファイル削除API（ソフトデリート - ゴミ箱へ移動）
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

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
    $isAdmin = $payload['role'] === 'admin';

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['file_id'])) {
        throw new Exception('ファイルIDが必要です');
    }

    $fileId = $input['file_id'];

    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    $pdo = getDatabaseConnection();

    // ファイル情報取得（削除されていないもの）
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // 削除権限チェック
    if (!$isAdmin && $file['created_by'] != $userId) {
        $stmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions
            WHERE folder_id = ? AND user_id = ?
        ");
        $stmt->execute([$file['folder_id'], $userId]);
        $permission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$permission || !in_array($permission['permission_level'], ['edit', 'manage'])) {
            throw new Exception('このファイルの削除権限がありません');
        }
    }

    // ソフトデリート（ゴミ箱へ移動）
    $stmt = $pdo->prepare("
        UPDATE files
        SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$fileId]);

    // アクティビティログを記録
    $logId = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address, user_agent, created_at)
        VALUES (?, ?, 'delete', 'file', ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $logId,
        $userId,
        $fileId,
        $file['name'],
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'ファイルをゴミ箱に移動しました'
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
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
