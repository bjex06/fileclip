<?php
/**
 * フォルダ権限取消API
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

try {
    $payload = authenticateRequest();

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['folder_id'])) {
        throw new Exception('フォルダIDが必要です');
    }

    $folderId = $input['folder_id'];
    $targetType = $input['target_type'] ?? null;
    $targetId = $input['target_id'] ?? null;

    if (!in_array($targetType, ['user', 'branch', 'department'])) {
        throw new Exception('無効な対象タイプです');
    }

    if (!$targetId) {
        throw new Exception('対象IDが必要です');
    }

    $pdo = getDatabaseConnection();

    // フォルダ存在確認と権限チェック
    $stmt = $pdo->prepare("SELECT id, created_by FROM folders WHERE id = ? AND is_deleted = 0");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$folder) {
        throw new Exception('フォルダが見つかりません');
    }

    if (!isAdminRole($payload['role']) && $folder['created_by'] !== $payload['user_id']) {
        throw new Exception('権限を変更する権限がありません');
    }

    $targetName = '';

    switch ($targetType) {
        case 'user':
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            $targetName = $target ? $target['name'] : '';

            $stmt = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ? AND user_id = ?");
            $stmt->execute([$folderId, $targetId]);
            break;

        case 'branch':
            $stmt = $pdo->prepare("SELECT name FROM branches WHERE id = ?");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            $targetName = $target ? $target['name'] : '';

            $stmt = $pdo->prepare("DELETE FROM folder_branch_permissions WHERE folder_id = ? AND branch_id = ?");
            $stmt->execute([$folderId, $targetId]);
            break;

        case 'department':
            $stmt = $pdo->prepare("SELECT name FROM departments WHERE id = ?");
            $stmt->execute([$targetId]);
            $target = $stmt->fetch(PDO::FETCH_ASSOC);
            $targetName = $target ? $target['name'] : '';

            $stmt = $pdo->prepare("DELETE FROM folder_department_permissions WHERE folder_id = ? AND department_id = ?");
            $stmt->execute([$folderId, $targetId]);
            break;
    }

    // アクティビティログ
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
        'message' => '権限を取り消しました'
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    error_log("Permission Revoke Error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>