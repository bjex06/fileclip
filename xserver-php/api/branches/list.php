<?php
/**
 * 営業所一覧取得API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/auth.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $pdo = getDatabaseConnection();

    // 営業所一覧を取得
    $stmt = $pdo->prepare("
        SELECT
            b.id,
            b.name,
            b.code,
            b.address,
            b.phone,
            b.manager_name,
            b.is_active,
            b.display_order,
            b.created_at,
            (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.is_active = 1) as user_count,
            (SELECT COUNT(*) FROM departments d WHERE d.branch_id = b.id AND d.is_active = 1) as department_count
        FROM branches b
        ORDER BY b.display_order ASC, b.created_at ASC
    ");
    $stmt->execute();
    $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス用に整形
    $formattedBranches = array_map(function($branch) {
        return [
            'id' => $branch['id'],
            'name' => $branch['name'],
            'code' => $branch['code'],
            'address' => $branch['address'],
            'phone' => $branch['phone'],
            'managerName' => $branch['manager_name'],
            'isActive' => (bool)$branch['is_active'],
            'displayOrder' => (int)$branch['display_order'],
            'userCount' => (int)$branch['user_count'],
            'departmentCount' => (int)$branch['department_count'],
            'createdAt' => $branch['created_at']
        ];
    }, $branches);

    $response = [
        'status' => 'success',
        'data' => $formattedBranches
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
