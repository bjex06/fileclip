<?php
/**
 * お気に入り追加API
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

    if (!$input || !isset($input['resource_type']) || !isset($input['resource_id'])) {
        throw new Exception('リソースタイプとIDが必要です');
    }

    $resourceType = $input['resource_type'];
    $resourceId = $input['resource_id'];

    if (!in_array($resourceType, ['file', 'folder'])) {
        throw new Exception('リソースタイプはfileまたはfolderである必要があります');
    }

    if (!isValidId($resourceId)) {
        throw new Exception('無効なリソースIDです');
    }

    $pdo = getDatabaseConnection();

    // リソースの存在確認
    if ($resourceType === 'file') {
        $stmt = $pdo->prepare("SELECT id FROM files WHERE id = ? AND is_deleted = FALSE");
    } else {
        $stmt = $pdo->prepare("SELECT id FROM folders WHERE id = ? AND is_deleted = FALSE");
    }
    $stmt->execute([$resourceId]);

    if (!$stmt->fetch()) {
        throw new Exception('リソースが見つかりません');
    }

    // 既に登録済みか確認
    $stmt = $pdo->prepare("
        SELECT id FROM favorites
        WHERE user_id = ? AND resource_type = ? AND resource_id = ?
    ");
    $stmt->execute([$userId, $resourceType, $resourceId]);

    if ($stmt->fetch()) {
        throw new Exception('既にお気に入りに登録されています');
    }

    // お気に入り追加
    $favoriteId = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO favorites (id, user_id, resource_type, resource_id, created_at)
        VALUES (?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$favoriteId, $userId, $resourceType, $resourceId]);

    $response = [
        'status' => 'success',
        'data' => [
            'id' => $favoriteId,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId
        ],
        'message' => 'お気に入りに追加しました'
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
