<?php
/**
 * 営業所更新API（管理者専用）
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

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

try {
    // 認証チェック
    $payload = authenticateRequest();

    // 管理者権限チェック
    if ($payload['role'] !== 'admin') {
        throw new Exception('管理者権限が必要です');
    }

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

    // 更新フィールドを構築
    $updates = [];
    $params = [];

    if (isset($input['name'])) {
        $name = trim($input['name']);
        if (strlen($name) < 1) {
            throw new Exception('営業所名を入力してください');
        }
        $updates[] = 'name = ?';
        $params[] = $name;
    }

    if (isset($input['code'])) {
        $code = strtoupper(trim($input['code']));
        if ($code) {
            // 重複チェック（自分以外）
            $stmt = $pdo->prepare("SELECT id FROM branches WHERE code = ? AND id != ?");
            $stmt->execute([$code, $branchId]);
            if ($stmt->fetch()) {
                throw new Exception('この営業所コードは既に使用されています');
            }
        }
        $updates[] = 'code = ?';
        $params[] = $code ?: null;
    }

    if (isset($input['address'])) {
        $updates[] = 'address = ?';
        $params[] = trim($input['address']) ?: null;
    }

    if (isset($input['phone'])) {
        $updates[] = 'phone = ?';
        $params[] = trim($input['phone']) ?: null;
    }

    if (isset($input['managerName'])) {
        $updates[] = 'manager_name = ?';
        $params[] = trim($input['managerName']) ?: null;
    }

    if (isset($input['displayOrder'])) {
        $updates[] = 'display_order = ?';
        $params[] = (int)$input['displayOrder'];
    }

    if (isset($input['isActive'])) {
        $updates[] = 'is_active = ?';
        $params[] = $input['isActive'] ? 1 : 0;
    }

    if (empty($updates)) {
        throw new Exception('更新する項目がありません');
    }

    // 更新実行
    $params[] = $branchId;
    $sql = "UPDATE branches SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // 更新後の営業所情報取得
    $stmt = $pdo->prepare("SELECT * FROM branches WHERE id = ?");
    $stmt->execute([$branchId]);
    $updatedBranch = $stmt->fetch(PDO::FETCH_ASSOC);

    $response = [
        'status' => 'success',
        'message' => '営業所情報を更新しました',
        'data' => [
            'id' => $updatedBranch['id'],
            'name' => $updatedBranch['name'],
            'code' => $updatedBranch['code'],
            'address' => $updatedBranch['address'],
            'phone' => $updatedBranch['phone'],
            'managerName' => $updatedBranch['manager_name'],
            'displayOrder' => (int)$updatedBranch['display_order'],
            'isActive' => (bool)$updatedBranch['is_active']
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
