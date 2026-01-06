<?php
/**
 * 部署作成API（管理者専用）
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

try {
    // 認証チェック
    $payload = authenticateRequest();

    // 管理者権限チェック
    if ($payload['role'] !== 'admin') {
        throw new Exception('管理者権限が必要です');
    }

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['name'])) {
        throw new Exception('部署名は必須です');
    }

    $name = trim($input['name']);
    $branchId = isset($input['branchId']) ? $input['branchId'] : null;
    $code = isset($input['code']) ? strtoupper(trim($input['code'])) : null;
    $parentId = isset($input['parentId']) ? $input['parentId'] : null;
    $description = isset($input['description']) ? trim($input['description']) : null;
    $managerId = isset($input['managerId']) ? $input['managerId'] : null;
    $displayOrder = isset($input['displayOrder']) ? (int)$input['displayOrder'] : 0;

    if (strlen($name) < 1) {
        throw new Exception('部署名を入力してください');
    }

    $pdo = getDatabaseConnection();

    // 営業所存在確認
    if ($branchId) {
        $stmt = $pdo->prepare("SELECT id FROM branches WHERE id = ? AND is_active = 1");
        $stmt->execute([$branchId]);
        if (!$stmt->fetch()) {
            throw new Exception('指定された営業所が見つかりません');
        }
    }

    // 親部署存在確認
    if ($parentId) {
        $stmt = $pdo->prepare("SELECT id FROM departments WHERE id = ? AND is_active = 1");
        $stmt->execute([$parentId]);
        if (!$stmt->fetch()) {
            throw new Exception('指定された親部署が見つかりません');
        }
    }

    // 部署長存在確認
    if ($managerId) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND is_active = 1");
        $stmt->execute([$managerId]);
        if (!$stmt->fetch()) {
            throw new Exception('指定された部署長が見つかりません');
        }
    }

    // 部署コード重複チェック（同一営業所内）
    if ($code) {
        $stmt = $pdo->prepare("SELECT id FROM departments WHERE code = ? AND (branch_id = ? OR (branch_id IS NULL AND ? IS NULL))");
        $stmt->execute([$code, $branchId, $branchId]);
        if ($stmt->fetch()) {
            throw new Exception('この部署コードは既に使用されています');
        }
    }

    // UUID生成
    $deptId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    // 部署作成
    $stmt = $pdo->prepare("
        INSERT INTO departments (id, branch_id, name, code, parent_id, description, manager_id, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$deptId, $branchId, $name, $code, $parentId, $description, $managerId, $displayOrder]);

    // 追加情報を取得
    $branchName = null;
    $managerName = null;
    $parentName = null;

    if ($branchId) {
        $stmt = $pdo->prepare("SELECT name FROM branches WHERE id = ?");
        $stmt->execute([$branchId]);
        $branch = $stmt->fetch(PDO::FETCH_ASSOC);
        $branchName = $branch ? $branch['name'] : null;
    }

    if ($managerId) {
        $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
        $stmt->execute([$managerId]);
        $manager = $stmt->fetch(PDO::FETCH_ASSOC);
        $managerName = $manager ? $manager['name'] : null;
    }

    if ($parentId) {
        $stmt = $pdo->prepare("SELECT name FROM departments WHERE id = ?");
        $stmt->execute([$parentId]);
        $parent = $stmt->fetch(PDO::FETCH_ASSOC);
        $parentName = $parent ? $parent['name'] : null;
    }

    $response = [
        'status' => 'success',
        'message' => '部署を作成しました',
        'data' => [
            'id' => $deptId,
            'branchId' => $branchId,
            'branchName' => $branchName,
            'name' => $name,
            'code' => $code,
            'parentId' => $parentId,
            'parentName' => $parentName,
            'description' => $description,
            'managerId' => $managerId,
            'managerName' => $managerName,
            'displayOrder' => $displayOrder,
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
