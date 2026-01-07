<?php
/**
 * ユーザー削除API
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
    
    // 管理者権限チェック
    requireAdminRole($payload);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || (!isset($input['user_id']) && !isset($input['id']))) {
        throw new Exception('ユーザーIDが必要です');
    }

    $userId = $input['user_id'] ?? $input['id'];
    
    if (!isValidId($userId)) {
        throw new Exception('無効なユーザーIDです');
    }
    
    // 自分自身を削除しようとしているかチェック
    if ($userId == $payload['user_id']) {
        throw new Exception('自分自身は削除できません');
    }
    
    $pdo = getDatabaseConnection();
    
    // 削除対象ユーザーを取得
    $stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$targetUser) {
        throw new Exception('ユーザーが見つかりません');
    }
    
    // 管理者を削除しようとしているかチェック
    $protectedRoles = ['admin', 'super_admin'];
    if (in_array($targetUser['role'], $protectedRoles)) {
        throw new Exception('管理者ユーザーは削除できません');
    }
    
    // トランザクション開始
    $pdo->beginTransaction();
    
    try {
        // ユーザーに関連するフォルダ権限を削除
        $stmt = $pdo->prepare("DELETE FROM folder_permissions WHERE user_id = ?");
        $stmt->execute([$userId]);

        // ユーザーを物理削除
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        $pdo->commit();
        
        $response = [
            'status' => 'success',
            'message' => 'ユーザーを削除しました'
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
