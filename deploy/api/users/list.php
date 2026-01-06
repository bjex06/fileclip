<?php
/**
 * ユーザー一覧取得API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/auth.php';

try {
    // 認証チェック
    $payload = authenticateRequest();
    
    $pdo = getDatabaseConnection();
    
    // ユーザー一覧を取得
    $stmt = $pdo->prepare("
        SELECT id, email, name, role, is_active, created_at, last_login_at 
        FROM users 
        WHERE is_active = 1 
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // レスポンス用に整形
    $formattedUsers = array_map(function($user) {
        return [
            'id' => (string)$user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'isActive' => (bool)$user['is_active'],
            'createdAt' => $user['created_at'],
            'lastLoginAt' => $user['last_login_at']
        ];
    }, $users);
    
    $response = [
        'status' => 'success',
        'data' => $formattedUsers
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
