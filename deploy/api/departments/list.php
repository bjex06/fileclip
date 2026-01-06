<?php
/**
 * 部署一覧取得API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

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

    // フィルタパラメータ
    $branchId = isset($_GET['branch_id']) ? $_GET['branch_id'] : null;
    $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === 'true';

    // 部署一覧を取得
    $sql = "
        SELECT
            d.id,
            d.branch_id,
            d.name,
            d.code,
            d.parent_id,
            d.description,
            d.manager_id,
            d.is_active,
            d.display_order,
            d.created_at,
            b.name as branch_name,
            b.code as branch_code,
            m.name as manager_name,
            p.name as parent_name,
            (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.is_active = 1) as user_count
        FROM departments d
        LEFT JOIN branches b ON d.branch_id = b.id
        LEFT JOIN users m ON d.manager_id = m.id
        LEFT JOIN departments p ON d.parent_id = p.id
        WHERE 1=1
    ";

    $params = [];

    if (!$includeInactive) {
        $sql .= " AND d.is_active = 1";
    }

    if ($branchId) {
        $sql .= " AND d.branch_id = ?";
        $params[] = $branchId;
    }

    $sql .= " ORDER BY b.display_order ASC, d.display_order ASC, d.created_at ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $departments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス用に整形
    $formattedDepartments = array_map(function($dept) {
        return [
            'id' => $dept['id'],
            'branchId' => $dept['branch_id'],
            'branchName' => $dept['branch_name'],
            'branchCode' => $dept['branch_code'],
            'name' => $dept['name'],
            'code' => $dept['code'],
            'parentId' => $dept['parent_id'],
            'parentName' => $dept['parent_name'],
            'description' => $dept['description'],
            'managerId' => $dept['manager_id'],
            'managerName' => $dept['manager_name'],
            'isActive' => (bool)$dept['is_active'],
            'displayOrder' => (int)$dept['display_order'],
            'userCount' => (int)$dept['user_count'],
            'createdAt' => $dept['created_at']
        ];
    }, $departments);

    $response = [
        'status' => 'success',
        'data' => $formattedDepartments
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
