<?php
/**
 * 営業所削除API（管理者専用）
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
    // 認証チェック
    $payload = authenticateRequest();

    // 管理者権限チェック
    requireAdminRole($payload);

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['id'])) {
        throw new Exception('営業所IDが必要です');
    }

    $branchId = $input['id'];

    $pdo = getDatabaseConnection();

    // 営業所存在確認
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE id = ?");
    $stmt->execute([$branchId]);
    $branch = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$branch) {
        throw new Exception('営業所が見つかりません');
    }

    // 所属ユーザーがいるかチェック
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM users WHERE branch_id = ? AND is_active = 1");
    $stmt->execute([$branchId]);
    $userCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($userCount > 0) {
        throw new Exception("この営業所には{$userCount}人のユーザーが所属しています。先にユーザーを別の営業所に移動してください。");
    }

    // 部署がある場合は警告
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM departments WHERE branch_id = ? AND is_active = 1");
    $stmt->execute([$branchId]);
    $deptCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

    if ($deptCount > 0 && !isset($input['force'])) {
        throw new Exception("この営業所には{$deptCount}個の部署があります。削除すると部署も削除されます。強制削除する場合は force: true を指定してください。");
    }

    // トランザクション開始
    $pdo->beginTransaction();

    try {
        // 関連する部署を無効化
        $stmt = $pdo->prepare("UPDATE departments SET is_active = 0 WHERE branch_id = ?");
        $stmt->execute([$branchId]);

        // 営業所を削除（物理削除）または無効化
        if (isset($input['hardDelete']) && $input['hardDelete']) {
            $stmt = $pdo->prepare("DELETE FROM branches WHERE id = ?");
        } else {
            $stmt = $pdo->prepare("UPDATE branches SET is_active = 0 WHERE id = ?");
        }
        $stmt->execute([$branchId]);

        // アクティビティログ
        $logStmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, ip_address)
            VALUES (?, 'delete', 'branch', ?, ?, ?)
        ");
        $logStmt->execute([
            $payload['user_id'],
            $branchId,
            $branch['name'],
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => '営業所を削除しました'
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