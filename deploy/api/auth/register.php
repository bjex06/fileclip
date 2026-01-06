<?php
/**
 * ユーザー登録API
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
    
    // 必須フィールド検証
    $validation = validateRequiredFields($input, ['email', 'password', 'name']);
    if (!$validation['isValid']) {
        throw new Exception(implode(', ', $validation['errors']));
    }
    
    $email = strtolower(trim($input['email']));
    $password = $input['password'];
    $name = trim($input['name']);
    
    // メールアドレス検証
    if (!isValidEmail($email)) {
        throw new Exception('有効なメールアドレスを入力してください');
    }
    
    // パスワード強度検証
    $passwordValidation = validatePassword($password);
    if (!$passwordValidation['isValid']) {
        throw new Exception(implode(', ', $passwordValidation['errors']));
    }
    
    // ユーザー名検証
    $nameValidation = validateUsername($name);
    if (!$nameValidation['isValid']) {
        throw new Exception(implode(', ', $nameValidation['errors']));
    }
    
    $pdo = getDatabaseConnection();
    
    // メールアドレス重複チェック
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        throw new Exception('このメールアドレスは既に使用されています');
    }
    
    // ユーザー名重複チェック
    $stmt = $pdo->prepare("SELECT id FROM users WHERE name = ?");
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        throw new Exception('このユーザー名は既に使用されています');
    }
    
    // パスワードハッシュ化
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    // ユーザー作成
    $stmt = $pdo->prepare("
        INSERT INTO users (email, name, password_hash, role, is_active, created_at) 
        VALUES (?, ?, ?, 'user', 1, NOW())
    ");
    $stmt->execute([$email, $name, $passwordHash]);
    
    $userId = $pdo->lastInsertId();
    
    // JWTトークン生成
    $tokenData = [
        'user_id' => $userId,
        'email' => $email,
        'role' => 'user',
        'exp' => time() + (24 * 60 * 60)
    ];
    $token = generateJWT($tokenData);
    
    $response = [
        'status' => 'success',
        'data' => [
            'user' => [
                'id' => $userId,
                'email' => $email,
                'name' => $name,
                'role' => 'user'
            ],
            'token' => $token
        ]
    ];
    
    http_response_code(201);
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
