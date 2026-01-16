<?php
/**
 * パスワード変更API
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
require_once '../../utils/validation.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON data');
    }

    // 必須フィールド検証
    $validation = validateRequiredFields($input, ['current_password', 'new_password']);
    if (!$validation['isValid']) {
        throw new Exception(implode(', ', $validation['errors']));
    }

    $currentPassword = $input['current_password'];
    $newPassword = $input['new_password'];

    // 新しいパスワードの強度検証
    $passwordValidation = validatePassword($newPassword);
    if (!$passwordValidation['isValid']) {
        throw new Exception(implode(', ', $passwordValidation['errors']));
    }

    $pdo = getDatabaseConnection();

    // 現在のパスワードを取得
    $stmt = $pdo->prepare("SELECT password_hash, email, name FROM users WHERE id = ? AND is_active = 1");
    $stmt->execute([$payload['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('ユーザーが見つかりません');
    }

    // 現在のパスワード検証
    if (!password_verify($currentPassword, $user['password_hash'])) {
        throw new Exception('現在のパスワードが正しくありません');
    }

    // 同じパスワードかチェック
    if (password_verify($newPassword, $user['password_hash'])) {
        throw new Exception('新しいパスワードは現在のパスワードと異なる必要があります');
    }

    // 新しいパスワードをハッシュ化して更新
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);


    $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$newPasswordHash, $payload['user_id']]);

    // メール送信
    require_once '../../utils/mail.php';
    sendPasswordChangeEmail($user['email'], $user['name']);

    $response = [
        'status' => 'success',
        'message' => 'パスワードが変更されました'
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