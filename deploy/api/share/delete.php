<?php
/**
 * 共有リンク削除API
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

    if (!$input || !isset($input['share_id'])) {
        throw new Exception('共有リンクIDが必要です');
    }

    $shareId = $input['share_id'];

    if (!isValidId($shareId)) {
        throw new Exception('無効な共有リンクIDです');
    }

    $pdo = getDatabaseConnection();

    // 共有リンク取得
    $stmt = $pdo->prepare("SELECT * FROM share_links WHERE id = ?");
    $stmt->execute([$shareId]);
    $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$shareLink) {
        throw new Exception('共有リンクが見つかりません');
    }

    // 権限チェック
    if (!$isAdmin && $shareLink['created_by'] != $userId) {
        throw new Exception('この共有リンクを削除する権限がありません');
    }

    // 共有リンク削除
    $stmt = $pdo->prepare("DELETE FROM share_links WHERE id = ?");
    $stmt->execute([$shareId]);

    $response = [
        'status' => 'success',
        'message' => '共有リンクを削除しました'
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