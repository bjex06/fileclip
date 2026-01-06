<?php
/**
 * お気に入り削除API
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

    $input = json_decode(file_get_contents('php://input'), true);

    // favorite_idまたはresource_type + resource_idで削除可能
    $pdo = getDatabaseConnection();

    if (isset($input['favorite_id'])) {
        $favoriteId = $input['favorite_id'];

        if (!isValidId($favoriteId)) {
            throw new Exception('無効なお気に入りIDです');
        }

        $stmt = $pdo->prepare("DELETE FROM favorites WHERE id = ? AND user_id = ?");
        $stmt->execute([$favoriteId, $userId]);

    } elseif (isset($input['resource_type']) && isset($input['resource_id'])) {
        $resourceType = $input['resource_type'];
        $resourceId = $input['resource_id'];

        if (!in_array($resourceType, ['file', 'folder'])) {
            throw new Exception('リソースタイプはfileまたはfolderである必要があります');
        }

        if (!isValidId($resourceId)) {
            throw new Exception('無効なリソースIDです');
        }

        $stmt = $pdo->prepare("
            DELETE FROM favorites
            WHERE user_id = ? AND resource_type = ? AND resource_id = ?
        ");
        $stmt->execute([$userId, $resourceType, $resourceId]);

    } else {
        throw new Exception('favorite_id または resource_type/resource_id が必要です');
    }

    if ($stmt->rowCount() === 0) {
        throw new Exception('お気に入りが見つかりません');
    }

    $response = [
        'status' => 'success',
        'message' => 'お気に入りから削除しました'
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
