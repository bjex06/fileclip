<?php
/**
 * ユーザー登録API
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

    // パスワードハッシュ化
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // メールアドレス重複チェック
    $stmt = $pdo->prepare("SELECT id, is_active FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        if ($existingUser['is_active'] == 0) {
            // 削除済みユーザーの場合は復元
            $stmt = $pdo->prepare("
                UPDATE users 
                SET name = ?, password_hash = ?, is_active = 1, updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$name, $passwordHash, $existingUser['id']]);

            $userId = $existingUser['id'];

            // JWTトークン生成
            $tokenData = [
                'user_id' => $userId,
                'email' => $email,
                'role' => 'user', // 元の権限を維持すべきか？一般登録ならuserでリセットが無難
                'exp' => time() + (24 * 60 * 60)
            ];
            $token = generateJWT($tokenData);

            // ウェルカムメール送信
            require_once '../../utils/mail.php';
            sendWelcomeEmail($email, $name, $password);

            $response = [
                'status' => 'success',
                'message' => 'アカウントを復元しました',
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
            exit();

        } else {
            throw new Exception('このメールアドレスは既に使用されています');
        }
    }

    // ユーザー名重複チェック
    $stmt = $pdo->prepare("SELECT id FROM users WHERE name = ?");
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        throw new Exception('このユーザー名は既に使用されています');
    }

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

    // ウェルカムメール送信
    require_once '../../utils/mail.php';
    sendWelcomeEmail($email, $name, $password);

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