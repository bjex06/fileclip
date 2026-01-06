<?php
/**
 * アクティビティログ一覧API
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
    $userId = $payload['user_id'];
    $isAdmin = $payload['role'] === 'admin';

    $pdo = getDatabaseConnection();

    // パラメータ
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $perPage = isset($_GET['per_page']) ? min(100, max(1, (int)$_GET['per_page'])) : 20;
    $offset = ($page - 1) * $perPage;

    $filterAction = $_GET['action'] ?? null;
    $filterResourceType = $_GET['resource_type'] ?? null;
    $filterUserId = $_GET['user_id'] ?? null;

    // クエリ構築
    $whereConditions = [];
    $params = [];

    // 管理者以外は自分のログのみ
    if (!$isAdmin) {
        $whereConditions[] = 'al.user_id = ?';
        $params[] = $userId;
    } elseif ($filterUserId) {
        $whereConditions[] = 'al.user_id = ?';
        $params[] = $filterUserId;
    }

    if ($filterAction) {
        $whereConditions[] = 'al.action = ?';
        $params[] = $filterAction;
    }

    if ($filterResourceType) {
        $whereConditions[] = 'al.resource_type = ?';
        $params[] = $filterResourceType;
    }

    $whereClause = count($whereConditions) > 0 ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

    // 総件数取得
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM activity_logs al $whereClause");
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetchColumn();

    // ログ取得
    $params[] = $perPage;
    $params[] = $offset;

    $stmt = $pdo->prepare("
        SELECT
            al.*,
            u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        $whereClause
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 整形
    $formattedLogs = array_map(function($log) {
        return [
            'id' => $log['id'],
            'user_id' => $log['user_id'],
            'user_name' => $log['user_name'],
            'action' => $log['action'],
            'resource_type' => $log['resource_type'],
            'resource_id' => $log['resource_id'],
            'resource_name' => $log['resource_name'],
            'details' => $log['details'] ? json_decode($log['details'], true) : null,
            'ip_address' => $log['ip_address'],
            'created_at' => $log['created_at']
        ];
    }, $logs);

    $response = [
        'status' => 'success',
        'data' => $formattedLogs,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $totalCount,
            'total_pages' => ceil($totalCount / $perPage)
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
