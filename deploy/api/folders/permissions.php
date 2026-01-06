<?php
/**
 * フォルダ権限管理API
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
    
    // 管理者のみ権限管理可能
    requireAdminRole($payload);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON data');
    }
    
    // 必須パラメータ確認
    if (!isset($input['folder_id']) || !isset($input['user_id']) || !isset($input['action'])) {
        throw new Exception('folder_id, user_id, action は必須です');
    }
    
    $folderId = $input['folder_id'];
    $userId = $input['user_id'];
    $action = $input['action']; // 'grant' or 'revoke'
    
    if (!isValidId($folderId)) {
        throw new Exception('無効なフォルダIDです');
    }
    
    if (!isValidId($userId)) {
        throw new Exception('無効なユーザーIDです');
    }
    
    if (!in_array($action, ['grant', 'revoke'])) {
        throw new Exception('action は grant または revoke である必要があります');
    }
    
    $pdo = getDatabaseConnection();
    
    // フォルダ存在確認
    $stmt = $pdo->prepare("SELECT id, name FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$folder) {
        throw new Exception('フォルダが見つかりません');
    }
    
    // ユーザー存在確認
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ? AND is_active = 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('ユーザーが見つかりません');
    }
    
    // 現在の権限状態を確認
    $stmt = $pdo->prepare("SELECT id FROM folder_permissions WHERE folder_id = ? AND user_id = ?");
    $stmt->execute([$folderId, $userId]);
    $existingPermission = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($action === 'grant') {
        if ($existingPermission) {
            throw new Exception('このユーザーには既に権限が付与されています');
        }
        
        // 権限を付与
        $stmt = $pdo->prepare("
            INSERT INTO folder_permissions (folder_id, user_id, created_at) 
            VALUES (?, ?, NOW())
        ");
        $stmt->execute([$folderId, $userId]);
        
        $message = "「{$folder['name']}」フォルダへのアクセス権限を{$user['name']}さんに付与しました";
        
        // メール通知（本番環境で実装）
        // sendPermissionNotification($user['email'], $user['name'], $folder['name'], 'granted');
        
    } else { // revoke
        if (!$existingPermission) {
            throw new Exception('このユーザーには権限が付与されていません');
        }
        
        // 権限を削除
        $stmt = $pdo->prepare("DELETE FROM folder_permissions WHERE folder_id = ? AND user_id = ?");
        $stmt->execute([$folderId, $userId]);
        
        $message = "「{$folder['name']}」フォルダへのアクセス権限を{$user['name']}さんから削除しました";
    }
    
    // 更新後の権限リストを取得
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email 
        FROM folder_permissions fp
        INNER JOIN users u ON fp.user_id = u.id
        WHERE fp.folder_id = ?
    ");
    $stmt->execute([$folderId]);
    $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $response = [
        'status' => 'success',
        'message' => $message,
        'data' => [
            'folder_id' => (string)$folderId,
            'permissions' => array_map(function($p) {
                return [
                    'user_id' => (string)$p['id'],
                    'user_name' => $p['name'],
                    'user_email' => $p['email']
                ];
            }, $permissions)
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
