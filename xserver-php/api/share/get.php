<?php
/**
 * 共有リンク情報取得API（公開アクセス可能）
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';

try {
    // トークン取得
    $token = $_GET['token'] ?? null;

    if (!$token) {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['token'] ?? null;
    }

    if (!$token) {
        throw new Exception('トークンが必要です');
    }

    $pdo = getDatabaseConnection();

    // 共有リンク取得
    $stmt = $pdo->prepare("
        SELECT sl.*,
               CASE
                   WHEN sl.resource_type = 'file' THEN (SELECT name FROM files WHERE id = sl.resource_id)
                   ELSE (SELECT name FROM folders WHERE id = sl.resource_id)
               END as resource_name,
               CASE
                   WHEN sl.resource_type = 'file' THEN (SELECT size FROM files WHERE id = sl.resource_id)
                   ELSE NULL
               END as file_size,
               CASE
                   WHEN sl.resource_type = 'file' THEN (SELECT type FROM files WHERE id = sl.resource_id)
                   ELSE NULL
               END as file_type
        FROM share_links sl
        WHERE sl.token = ?
    ");
    $stmt->execute([$token]);
    $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$shareLink) {
        throw new Exception('共有リンクが見つかりません');
    }

    // 有効性チェック
    if (!$shareLink['is_active']) {
        throw new Exception('この共有リンクは無効になっています');
    }

    // 有効期限チェック
    if ($shareLink['expires_at'] && strtotime($shareLink['expires_at']) < time()) {
        throw new Exception('この共有リンクは有効期限が切れています');
    }

    // ダウンロード回数制限チェック
    if ($shareLink['max_downloads'] && $shareLink['download_count'] >= $shareLink['max_downloads']) {
        throw new Exception('この共有リンクはダウンロード回数の上限に達しました');
    }

    $response = [
        'status' => 'success',
        'data' => [
            'resource_type' => $shareLink['resource_type'],
            'resource_name' => $shareLink['resource_name'],
            'file_size' => $shareLink['file_size'] ? (int)$shareLink['file_size'] : null,
            'file_type' => $shareLink['file_type'],
            'requires_password' => !empty($shareLink['password_hash']),
            'expires_at' => $shareLink['expires_at'],
            'download_count' => (int)$shareLink['download_count'],
            'max_downloads' => $shareLink['max_downloads'] ? (int)$shareLink['max_downloads'] : null,
            'created_at' => $shareLink['created_at']
        ]
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
?>
