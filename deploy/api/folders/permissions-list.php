<?php
/**
 * フォルダ権限一覧取得API
 * ユーザー・営業所・部署単位の権限を取得
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
    $payload = authenticateRequest();

    if (!isset($_GET['folder_id'])) {
        throw new Exception('フォルダIDが必要です');
    }

    $folderId = $_GET['folder_id'];
    $pdo = getDatabaseConnection();

    // ユーザー権限
    $userStmt = $pdo->prepare("
        SELECT fp.id, fp.user_id, fp.permission_level, fp.created_at,
               u.name as user_name, u.email as user_email
        FROM folder_permissions fp
        JOIN users u ON fp.user_id = u.id
        WHERE fp.folder_id = ?
        ORDER BY u.name
    ");
    $userStmt->execute([$folderId]);
    $userPermissions = $userStmt->fetchAll(PDO::FETCH_ASSOC);

    // 営業所権限
    $branchStmt = $pdo->prepare("
        SELECT fbp.id, fbp.branch_id, fbp.permission_level, fbp.created_at,
               b.name as branch_name, b.code as branch_code
        FROM folder_branch_permissions fbp
        JOIN branches b ON fbp.branch_id = b.id
        WHERE fbp.folder_id = ?
        ORDER BY b.display_order, b.name
    ");
    $branchStmt->execute([$folderId]);
    $branchPermissions = $branchStmt->fetchAll(PDO::FETCH_ASSOC);

    // 部署権限
    $deptStmt = $pdo->prepare("
        SELECT fdp.id, fdp.department_id, fdp.permission_level, fdp.created_at,
               d.name as department_name, d.code as department_code,
               b.name as branch_name
        FROM folder_department_permissions fdp
        JOIN departments d ON fdp.department_id = d.id
        LEFT JOIN branches b ON d.branch_id = b.id
        WHERE fdp.folder_id = ?
        ORDER BY b.display_order, d.display_order, d.name
    ");
    $deptStmt->execute([$folderId]);
    $deptPermissions = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

    $response = [
        'status' => 'success',
        'data' => [
            'users' => array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'userId' => $p['user_id'],
                    'userName' => $p['user_name'],
                    'userEmail' => $p['user_email'],
                    'permissionLevel' => $p['permission_level'],
                    'createdAt' => $p['created_at']
                ];
            }, $userPermissions),
            'branches' => array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'branchId' => $p['branch_id'],
                    'branchName' => $p['branch_name'],
                    'branchCode' => $p['branch_code'],
                    'permissionLevel' => $p['permission_level'],
                    'createdAt' => $p['created_at']
                ];
            }, $branchPermissions),
            'departments' => array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'departmentId' => $p['department_id'],
                    'departmentName' => $p['department_name'],
                    'departmentCode' => $p['department_code'],
                    'branchName' => $p['branch_name'],
                    'permissionLevel' => $p['permission_level'],
                    'createdAt' => $p['created_at']
                ];
            }, $deptPermissions)
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
