<?php
/**
 * フォルダ権限付与API
 * ユーザー・営業所・部署単位で権限を付与
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

try {
    $payload = authenticateRequest();

    // 管理者またはフォルダ管理権限チェック
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['folder_id'])) {
        throw new Exception('フォルダIDが必要です');
    }

    $folderId = $input['folder_id'];
    $targetType = $input['target_type'] ?? null; // 'user', 'branch', 'department'
    $targetId = $input['target_id'] ?? null;
    $permissionLevel = $input['permission_level'] ?? 'view';

    if (!in_array($targetType, ['user', 'branch', 'department'])) {
        throw new Exception('無効な対象タイプです');
    }

    if (!$targetId) {
        throw new Exception('対象IDが必要です');
    }

    if (!in_array($permissionLevel, ['view', 'edit', 'manage'])) {
        throw new Exception('無効な権限レベルです');
    }

    $pdo = getDatabaseConnection();

    // フォルダ存在確認
    $stmt = $pdo->prepare("SELECT id, created_by FROM folders WHERE id = ? AND is_deleted = 0");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$folder) {
        throw new Exception('フォルダが見つかりません');
    }

    // 権限チェック（管理者またはフォルダ作成者のみ）
    if (!isAdminRole($payload['role']) && $folder['created_by'] !== $payload['user_id']) {
        throw new Exception('権限を変更する権限がありません');
    }

    // UUID生成
    $permId = sprintf(
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

    $targetName = '';

    switch ($targetType) {
        case 'user':
            // ユーザー存在確認
            $stmt = $pdo->prepare("SELECT id, name FROM users WHERE id = ? AND is_active = 1");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$target)
                throw new Exception('ユーザーが見つかりません');
            $targetName = $target['name'];

            // 権限付与（UPSERT）
            $stmt = $pdo->prepare("
                INSERT INTO folder_permissions (id, folder_id, user_id, permission_level, granted_by, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE permission_level = VALUES(permission_level)
            ");
            $stmt->execute([$permId, $folderId, $targetId, $permissionLevel, $payload['user_id']]);
            break;

        case 'branch':
            // 営業所存在確認
            $stmt = $pdo->prepare("SELECT id, name FROM branches WHERE id = ? AND is_active = 1");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$target)
                throw new Exception('営業所が見つかりません');
            $targetName = $target['name'];

            // 権限付与（UPSERT）
            $stmt = $pdo->prepare("
                INSERT INTO folder_branch_permissions (id, folder_id, branch_id, permission_level, granted_by, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE permission_level = VALUES(permission_level)
            ");
            $stmt->execute([$permId, $folderId, $targetId, $permissionLevel, $payload['user_id']]);
            break;

        case 'department':
            // 部署存在確認
            $stmt = $pdo->prepare("SELECT id, name FROM departments WHERE id = ? AND is_active = 1");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$target)
                throw new Exception('部署が見つかりません');
            $targetName = $target['name'];

            // 権限付与（UPSERT）
            $stmt = $pdo->prepare("
                INSERT INTO folder_department_permissions (id, folder_id, department_id, permission_level, granted_by, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE permission_level = VALUES(permission_level)
            ");
            $stmt->execute([$permId, $folderId, $targetId, $permissionLevel, $payload['user_id']]);
            break;
    }

    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, ip_address)
        VALUES (?, 'permission_change', 'folder', ?, ?, ?)
    ");
    $logStmt->execute([
        $payload['user_id'],
        $folderId,
        $targetName,
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => '権限を付与しました',
        'data' => [
            'targetType' => $targetType,
            'targetId' => $targetId,
            'targetName' => $targetName,
            'permissionLevel' => $permissionLevel
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Permission Grant Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>