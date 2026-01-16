<?php
/**
 * 部署更新API（管理者専用）
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
        throw new Exception('部署IDが必要です');
    }

    $deptId = $input['id'];

    $pdo = getDatabaseConnection();

    // 部署存在確認
    $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$deptId]);
    $dept = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dept) {
        throw new Exception('部署が見つかりません');
    }

    // 更新フィールドを構築
    $updates = [];
    $params = [];

    if (isset($input['name'])) {
        $name = trim($input['name']);
        if (strlen($name) < 1) {
            throw new Exception('部署名を入力してください');
        }
        $updates[] = 'name = ?';
        $params[] = $name;
    }

    if (array_key_exists('branchId', $input)) {
        $branchId = $input['branchId'];
        if ($branchId) {
            $stmt = $pdo->prepare("SELECT id FROM branches WHERE id = ? AND is_active = 1");
            $stmt->execute([$branchId]);
            if (!$stmt->fetch()) {
                throw new Exception('指定された営業所が見つかりません');
            }
        }
        $updates[] = 'branch_id = ?';
        $params[] = $branchId;
    }

    if (isset($input['code'])) {
        $code = strtoupper(trim($input['code']));
        if ($code) {
            $currentBranchId = isset($input['branchId']) ? $input['branchId'] : $dept['branch_id'];
            $stmt = $pdo->prepare("SELECT id FROM departments WHERE code = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL)) AND id != ?");
            $stmt->execute([$code, $currentBranchId, $currentBranchId, $deptId]);
            if ($stmt->fetch()) {
                throw new Exception('この部署コードは既に使用されています');
            }
        }
        $updates[] = 'code = ?';
        $params[] = $code ?: null;
    }

    if (array_key_exists('parentId', $input)) {
        $parentId = $input['parentId'];
        if ($parentId) {
            // 自分自身を親にはできない
            if ($parentId === $deptId) {
                throw new Exception('自分自身を親部署に設定することはできません');
            }
            $stmt = $pdo->prepare("SELECT id FROM departments WHERE id = ? AND is_active = 1");
            $stmt->execute([$parentId]);
            if (!$stmt->fetch()) {
                throw new Exception('指定された親部署が見つかりません');
            }
        }
        $updates[] = 'parent_id = ?';
        $params[] = $parentId;
    }

    if (isset($input['description'])) {
        $updates[] = 'description = ?';
        $params[] = trim($input['description']) ?: null;
    }

    if (array_key_exists('managerId', $input)) {
        $managerId = $input['managerId'];
        if ($managerId) {
            $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND is_active = 1");
            $stmt->execute([$managerId]);
            if (!$stmt->fetch()) {
                throw new Exception('指定された部署長が見つかりません');
            }
        }
        $updates[] = 'manager_id = ?';
        $params[] = $managerId;
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
    $params[] = $deptId;
    $sql = "UPDATE departments SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // 更新後の部署情報取得
    $stmt = $pdo->prepare("
        SELECT d.*, b.name as branch_name, m.name as manager_name, p.name as parent_name
        FROM departments d
        LEFT JOIN branches b ON d.branch_id = b.id
        LEFT JOIN users m ON d.manager_id = m.id
        LEFT JOIN departments p ON d.parent_id = p.id
        WHERE d.id = ?
    ");
    $stmt->execute([$deptId]);
    $updatedDept = $stmt->fetch(PDO::FETCH_ASSOC);

    $response = [
        'status' => 'success',
        'message' => '部署情報を更新しました',
        'data' => [
            'id' => $updatedDept['id'],
            'branchId' => $updatedDept['branch_id'],
            'branchName' => $updatedDept['branch_name'],
            'name' => $updatedDept['name'],
            'code' => $updatedDept['code'],
            'parentId' => $updatedDept['parent_id'],
            'parentName' => $updatedDept['parent_name'],
            'description' => $updatedDept['description'],
            'managerId' => $updatedDept['manager_id'],
            'managerName' => $updatedDept['manager_name'],
            'displayOrder' => (int)$updatedDept['display_order'],
            'isActive' => (bool)$updatedDept['is_active']
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
