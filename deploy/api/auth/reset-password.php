<?php
/**
 * パスワードリセットAPI
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
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON data');
    }
    
    if (!isset($input['email']) || empty(trim($input['email']))) {
        throw new Exception('メールアドレスは必須です');
    }
    
    $email = strtolower(trim($input['email']));
    
    // メールアドレス検証
    if (!isValidEmail($email)) {
        throw new Exception('有効なメールアドレスを入力してください');
    }
    
    $pdo = getDatabaseConnection();
    
    // ユーザー存在確認
    $stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ? AND is_active = 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        throw new Exception('このメールアドレスに関連付けられたアカウントが見つかりません');
    }
    
    // 一時パスワード生成
    $tempPassword = generateSecurePassword(12);
    
    // パスワードをハッシュ化して更新
    $passwordHash = password_hash($tempPassword, PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$passwordHash, $user['id']]);
    
    // 本番環境ではメール送信を行う
    // sendPasswordResetEmail($email, $user['name'], $tempPassword);
    
    // ログに記録
    $logDir = '../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/password_resets.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] Password reset for {$email} (User ID: {$user['id']})\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    $response = [
        'status' => 'success',
        'message' => '一時パスワードが生成されました',
        'data' => [
            'temp_password' => $tempPassword // 本番環境ではメール送信し、ここには含めない
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
