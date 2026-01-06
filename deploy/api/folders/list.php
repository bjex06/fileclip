<?php
/**
 * フォルダ一覧取得API（ソート・フィルター対応）
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

    $userId = $payload['user_id'];
    $isAdmin = $payload['role'] === 'admin';

    $parentId = isset($_GET['parent_id']) ? $_GET['parent_id'] : null;

    // ソート・フィルターパラメータ
    $sortBy = $_GET['sort_by'] ?? 'name';
    $sortOrder = strtoupper($_GET['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
    $searchQuery = $_GET['query'] ?? null;

    // ソートカラム検証
    $validSortColumns = ['name', 'created_at'];
    $sortColumn = in_array($sortBy, $validSortColumns) ? $sortBy : 'name';

    $params = [];
    $conditions = ['f.is_deleted = FALSE'];

    // 親フォルダ条件
    if ($parentId) {
        $conditions[] = 'f.parent_id = ?';
        $params[] = $parentId;
    } else {
        $conditions[] = 'f.parent_id IS NULL';
    }

    // 検索クエリ
    if ($searchQuery) {
        $conditions[] = 'f.name LIKE ?';
        $params[] = '%' . $searchQuery . '%';
    }

    $whereClause = implode(' AND ', $conditions);

    if ($isAdmin) {
        // 管理者は全フォルダを取得
        $stmt = $pdo->prepare("
            SELECT f.*,
                   u.name as creator_name,
                   GROUP_CONCAT(fp.user_id) as permission_user_ids
            FROM folders f
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN folder_permissions fp ON f.id = fp.folder_id
            WHERE $whereClause
            GROUP BY f.id
            ORDER BY f.$sortColumn $sortOrder
        ");
        $stmt->execute($params);
    } else {
        // 一般ユーザーは権限のあるフォルダのみ取得
        $params[] = $userId;
        $stmt = $pdo->prepare("
            SELECT f.*,
                   u.name as creator_name,
                   GROUP_CONCAT(fp2.user_id) as permission_user_ids
            FROM folders f
            INNER JOIN folder_permissions fp ON f.id = fp.folder_id AND fp.user_id = ?
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN folder_permissions fp2 ON f.id = fp2.folder_id
            WHERE $whereClause
            GROUP BY f.id
            ORDER BY f.$sortColumn $sortOrder
        ");
        $stmt->execute(array_merge($params));
    }

    $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // レスポンス用に整形
    $formattedFolders = array_map(function($folder) {
        $permissionUserIds = $folder['permission_user_ids'] 
            ? explode(',', $folder['permission_user_ids']) 
            : [];
        
        return [
            'id' => (string)$folder['id'],
            'name' => $folder['name'],
            'created_by' => (string)$folder['created_by'],
            'creator_name' => $folder['creator_name'],
            'created_at' => $folder['created_at'],
            'folder_permissions' => array_map(function($uid) {
                return ['user_id' => $uid];
            }, array_unique($permissionUserIds))
        ];
    }, $folders);
    
    $response = [
        'status' => 'success',
        'data' => $formattedFolders
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
