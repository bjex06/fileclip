<?php
/**
 * ユーザー作成API（管理者専用）
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

    // 管理者権限チェック（super_admin, branch_admin, department_admin のみ）
    $adminRoles = ['super_admin', 'branch_admin', 'department_admin', 'admin']; // 後方互換性のため 'admin' も含める
    if (!in_array($payload['role'], $adminRoles)) {
        throw new Exception('管理者権限が必要です');
    }

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

    // 有効な権限一覧
    $validRoles = ['super_admin', 'branch_admin', 'department_admin', 'user'];
    $role = isset($input['role']) && in_array($input['role'], $validRoles) ? $input['role'] : 'user';

    // 権限階層チェック: 自分より上位の権限は付与できない
    $roleHierarchy = ['super_admin' => 4, 'branch_admin' => 3, 'department_admin' => 2, 'user' => 1, 'admin' => 4];
    $creatorLevel = $roleHierarchy[$payload['role']] ?? 0;
    $newUserLevel = $roleHierarchy[$role] ?? 0;

    if ($newUserLevel > $creatorLevel) {
        throw new Exception('自分より上位の権限を持つユーザーは作成できません');
    }
    $branchId = isset($input['branch_id']) && !empty($input['branch_id']) ? $input['branch_id'] : null;
    $departmentId = isset($input['department_id']) && !empty($input['department_id']) ? $input['department_id'] : null;
    $position = isset($input['position']) ? trim($input['position']) : null;
    $employeeCode = isset($input['employee_code']) ? trim($input['employee_code']) : null;

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

    // 営業所存在チェック
    if ($branchId) {
        $stmt = $pdo->prepare("SELECT id FROM branches WHERE id = ? AND is_active = 1");
        $stmt->execute([$branchId]);
        if (!$stmt->fetch()) {
            throw new Exception('指定された営業所が見つかりません');
        }
    }

    // 部署存在チェック
    if ($departmentId) {
        $stmt = $pdo->prepare("SELECT id FROM departments WHERE id = ? AND is_active = 1");
        $stmt->execute([$departmentId]);
        if (!$stmt->fetch()) {
            throw new Exception('指定された部署が見つかりません');
        }
    }

    // ユーザー作成（AUTO_INCREMENT使用）
    $stmt = $pdo->prepare("
        INSERT INTO users (email, name, password_hash, role, branch_id, department_id, position, employee_code, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
    ");
    $stmt->execute([$email, $name, $passwordHash, $role, $branchId, $departmentId, $position, $employeeCode]);
    $userId = $pdo->lastInsertId();

    // アクティビティログ
    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, ip_address)
        VALUES (?, 'create_user', 'user', ?, ?, ?)
    ");
    $logStmt->execute([
        $payload['user_id'],
        $userId,
        $name,
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'ユーザーを作成しました',
        'data' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
            'role' => $role,
            'branchId' => $branchId,
            'departmentId' => $departmentId,
            'position' => $position,
            'employeeCode' => $employeeCode,
            'isActive' => true
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
