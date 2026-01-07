<?php
/**
 * 部署削除API（管理者専用）
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

try {
    // 認証チェック
    $payload = authenticateRequest();

    // 管理者権限チェック
    $adminRoles = ['admin', 'super_admin', 'branch_admin', 'department_admin'];
    if (!in_array($payload['role'], $adminRoles)) {
        throw new Exception('管理者権限が必要です');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['id'])) {
        throw new Exception('部署IDが必要です');
    }

    $deptId = $input['id'];

    $pdo = getDatabaseConnection();

    // 部署存在確認
    $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$deptId]);
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dept) {
        throw new Exception('部署が見つかりません');
    }

    // 所属ユーザーがいるかチェック
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_active = 1");
    $stmt->execute([$deptId]);
    $userCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($userCount > 0) {
        throw new Exception("この部署には{$userCount}人のユーザーが所属しています。先にユーザーを別の部署に移動してください。");
    }

    // 子部署があるかチェック
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM departments WHERE parent_id = ? AND is_active = 1");
    $stmt->execute([$deptId]);
    $childCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($childCount > 0 && !isset($input['force'])) {
        throw new Exception("この部署には{$childCount}個の子部署があります。削除すると子部署も削除されます。強制削除する場合は force: true を指定してください。");
    }

    // トランザクション開始
    $pdo->beginTransaction();

    try {
        // 子部署を無効化
        if ($childCount > 0) {
            $stmt = $pdo->prepare("UPDATE departments SET is_active = 0 WHERE parent_id = ?");
            $stmt->execute([$deptId]);
        }

        // 部署を物理削除
        $stmt = $pdo->prepare("DELETE FROM departments WHERE id = ?");
        $stmt->execute([$deptId]);

        // アクティビティログ
        $logStmt = $pdo->prepare("
            INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address)
            VALUES (UUID(), ?, 'delete', 'department', ?, ?, ?)
        ");
        $logStmt->execute([
            $payload['user_id'],
            $deptId,
            $dept['name'],
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => '部署を削除しました'
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
?>
