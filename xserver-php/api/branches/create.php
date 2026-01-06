<?php
/**
 * 営業所作成API（管理者専用）
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
        throw new Exception('営業所名は必須です');
    }

    $name = trim($input['name']);
    $code = isset($input['code']) ? strtoupper(trim($input['code'])) : null;
    $address = isset($input['address']) ? trim($input['address']) : null;
    $phone = isset($input['phone']) ? trim($input['phone']) : null;
    $managerName = isset($input['managerName']) ? trim($input['managerName']) : null;
    $displayOrder = isset($input['displayOrder']) ? (int)$input['displayOrder'] : 0;

    if (strlen($name) < 1) {
        throw new Exception('営業所名を入力してください');
    }

    $pdo = getDatabaseConnection();

    // 営業所コード重複チェック
    if ($code) {
        $stmt = $pdo->prepare("SELECT id FROM branches WHERE code = ?");
        $stmt->execute([$code]);
        if ($stmt->fetch()) {
            throw new Exception('この営業所コードは既に使用されています');
        }
    }

    // UUID生成
    $branchId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    // 営業所作成
    $stmt = $pdo->prepare("
        INSERT INTO branches (id, name, code, address, phone, manager_name, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$branchId, $name, $code, $address, $phone, $managerName, $displayOrder]);

    // アクティビティログ
    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address)
        VALUES (UUID(), ?, 'create_folder', 'branch', ?, ?, ?)
    ");
    $logStmt->execute([
        $payload['user_id'],
        $branchId,
        $name,
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => '営業所を作成しました',
        'data' => [
            'id' => $branchId,
            'name' => $name,
            'code' => $code,
            'address' => $address,
            'phone' => $phone,
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
