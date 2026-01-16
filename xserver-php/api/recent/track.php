<?php
/**
 * ファイルアクセス記録API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

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

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['file_id'])) {
        throw new Exception('ファイルIDが必要です');
    }

    $fileId = $input['file_id'];

    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    $pdo = getDatabaseConnection();

    // ファイルの存在確認
    $stmt = $pdo->prepare("SELECT id FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$fileId]);

    if (!$stmt->fetch()) {
        throw new Exception('ファイルが見つかりません');
    }

    // 既存のレコードを更新またはINSERT
    $stmt = $pdo->prepare("
        INSERT INTO recent_files (id, user_id, file_id, accessed_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE accessed_at = NOW()
    ");
    $stmt->execute([generateUUID(), $userId, $fileId]);

    // 古いレコードを削除（最新50件のみ保持）
    $stmt = $pdo->prepare("
        DELETE FROM recent_files
        WHERE user_id = ? AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM recent_files
                WHERE user_id = ?
                ORDER BY accessed_at DESC
                LIMIT 50
            ) as keep_ids
        )
    ");
    $stmt->execute([$userId, $userId]);

    $response = [
        'status' => 'success',
        'message' => 'アクセス履歴を記録しました'
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
