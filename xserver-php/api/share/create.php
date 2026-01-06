<?php
/**
 * 共有リンク作成API
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

    // リソースの存在確認と権限チェック
    if ($resourceType === 'file') {
        $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
        $stmt->execute([$resourceId]);
        $resource = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$resource) {
            throw new Exception('ファイルが見つかりません');
        }

        // 権限チェック
        if (!$isAdmin && $resource['created_by'] != $userId) {
            $stmt = $pdo->prepare("
                SELECT permission_level FROM folder_permissions
                WHERE folder_id = ? AND user_id = ?
            ");
            $stmt->execute([$resource['folder_id'], $userId]);
            $permission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$permission || !in_array($permission['permission_level'], ['edit', 'manage'])) {
                throw new Exception('共有リンクを作成する権限がありません');
            }
        }

        $resourceName = $resource['name'];
    } else {
        $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = FALSE");
        $stmt->execute([$resourceId]);
        $resource = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$resource) {
            throw new Exception('フォルダが見つかりません');
        }

        // 権限チェック
        if (!$isAdmin && $resource['created_by'] != $userId) {
            $stmt = $pdo->prepare("
                SELECT permission_level FROM folder_permissions
                WHERE folder_id = ? AND user_id = ?
            ");
            $stmt->execute([$resourceId, $userId]);
            $permission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$permission || $permission['permission_level'] !== 'manage') {
                throw new Exception('共有リンクを作成する権限がありません');
            }
        }

        $resourceName = $resource['name'];
    }

    // 共有トークン生成
    $token = bin2hex(random_bytes(32));

    // オプションパラメータ
    $password = isset($input['password']) && !empty($input['password']) ? $input['password'] : null;
    $passwordHash = $password ? password_hash($password, PASSWORD_DEFAULT) : null;
    $expiresAt = isset($input['expires_at']) ? $input['expires_at'] : null;
    $maxDownloads = isset($input['max_downloads']) ? (int)$input['max_downloads'] : null;

    // 共有リンク作成
    $shareId = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO share_links (id, token, resource_type, resource_id, created_by, password_hash, expires_at, max_downloads, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
    ");
    $stmt->execute([
        $shareId,
        $token,
        $resourceType,
        $resourceId,
        $userId,
        $passwordHash,
        $expiresAt,
        $maxDownloads
    ]);

    // アクティビティログを記録
    $logId = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address, user_agent, created_at)
        VALUES (?, ?, 'share', ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $logId,
        $userId,
        $resourceType,
        $resourceId,
        $resourceName,
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'data' => [
            'id' => $shareId,
            'token' => $token,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'resource_name' => $resourceName,
            'has_password' => $password !== null,
            'expires_at' => $expiresAt,
            'max_downloads' => $maxDownloads,
            'download_count' => 0,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s')
        ],
        'message' => '共有リンクを作成しました'
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
