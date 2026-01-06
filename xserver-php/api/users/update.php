<?php
/**
 * ユーザー更新API（管理者専用）
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    if ($payload['role'] !== 'admin') {
        throw new Exception('管理者権限が必要です');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['user_id'])) {
        throw new Exception('ユーザーIDが必要です');
    }

    $userId = $input['user_id'];

    $pdo = getDatabaseConnection();

    // ユーザー存在確認
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('ユーザーが見つかりません');
    }

    // 更新フィールドを構築
    $updates = [];
    $params = [];

    // 名前更新
    if (isset($input['name'])) {
        $name = trim($input['name']);
        $nameValidation = validateUsername($name);
        if (!$nameValidation['isValid']) {
            throw new Exception(implode(', ', $nameValidation['errors']));
        }

        // 重複チェック（自分以外）
        $stmt = $pdo->prepare("SELECT id FROM users WHERE name = ? AND id != ?");
        $stmt->execute([$name, $userId]);
        if ($stmt->fetch()) {
            throw new Exception('このユーザー名は既に使用されています');
        }

        $updates[] = 'name = ?';
        $params[] = $name;
    }

    // メール更新
    if (isset($input['email'])) {
        $email = strtolower(trim($input['email']));
        if (!isValidEmail($email)) {
            throw new Exception('有効なメールアドレスを入力してください');
        }

        // 重複チェック（自分以外）
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $userId]);
        if ($stmt->fetch()) {
            throw new Exception('このメールアドレスは既に使用されています');
        }

        $updates[] = 'email = ?';
        $params[] = $email;
    }

    // ロール更新
    if (isset($input['role']) && in_array($input['role'], ['admin', 'user'])) {
        $updates[] = 'role = ?';
        $params[] = $input['role'];
    }

    // 部署更新
    if (isset($input['department'])) {
        $updates[] = 'department = ?';
        $params[] = trim($input['department']) ?: null;
    }

    // アクティブ状態更新
    if (isset($input['is_active'])) {
        $updates[] = 'is_active = ?';
        $params[] = $input['is_active'] ? 1 : 0;
    }

    // パスワード更新
    if (isset($input['password']) && !empty($input['password'])) {
        $passwordValidation = validatePassword($input['password']);
        if (!$passwordValidation['isValid']) {
            throw new Exception(implode(', ', $passwordValidation['errors']));
        }
        $updates[] = 'password_hash = ?';
        $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
    }

    if (empty($updates)) {
        throw new Exception('更新する項目がありません');
    }

    // 更新実行
    $params[] = $userId;
    $sql = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // 更新後のユーザー情報取得
    $stmt = $pdo->prepare("SELECT id, email, name, role, department, is_active, created_at FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);

    // アクティビティログ
    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address)
        VALUES (?, 'update_user', 'user', ?, ?, ?, ?)
    ");
    $logStmt->execute([
        $payload['user_id'],
        $userId,
        $updatedUser['name'],
        json_encode(['updated_fields' => array_keys($input)]),
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'ユーザー情報を更新しました',
        'data' => [
            'id' => $updatedUser['id'],
            'email' => $updatedUser['email'],
            'name' => $updatedUser['name'],
            'role' => $updatedUser['role'],
            'department' => $updatedUser['department'],
            'isActive' => (bool)$updatedUser['is_active']
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
