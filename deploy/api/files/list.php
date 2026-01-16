<?php
/**
 * ファイル一覧取得API（ソート・フィルター対応）
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

    // DEBUG LOG setup
    $logFile = '../../logs/debug_list.log';
    if (!is_dir(dirname($logFile)))
        mkdir(dirname($logFile), 0755, true);

    function logDebug($msg)
    {
        global $logFile;
        error_log(date('[Y-m-d H:i:s] ') . $msg . "\n", 3, $logFile);
    }
    logDebug("List API called. GET Params: " . print_r($_GET, true));

    $pdo = getDatabaseConnection();

    $userId = $payload['user_id'];
    $userId = $payload['user_id'];

    // ロールの空白を除去してチェック
    $userRole = isset($payload['role']) ? trim($payload['role']) : '';
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    // $isAdmin = true; // 強制的に全表示（デバッグ/要望対応）
    $folderId = isset($_GET['folder_id']) ? $_GET['folder_id'] : null;

    // ソート・フィルターパラメータ
    $sortBy = $_GET['sort_by'] ?? 'created_at';
    $sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    $fileType = $_GET['file_type'] ?? null;
    $searchQuery = $_GET['query'] ?? null;

    // ソートカラム検証
    $validSortColumns = ['name', 'size', 'created_at', 'type'];
    $sortColumn = in_array($sortBy, $validSortColumns) ? $sortBy : 'created_at';

    $params = [];
    $conditions = ['f.is_deleted = FALSE'];

    // フォルダ条件
    if ($folderId) {
        $conditions[] = 'f.folder_id = ?';
        $params[] = $folderId;
    }

    // 検索クエリ
    if ($searchQuery) {
        $conditions[] = 'f.name LIKE ?';
        $params[] = '%' . $searchQuery . '%';
    }

    // ファイルタイプフィルター
    $fileTypeMapping = [
        'image' => ['image/%'],
        'document' => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats%', 'text/%'],
        'video' => ['video/%'],
        'audio' => ['audio/%'],
        'archive' => ['application/zip', 'application/x-rar%', 'application/x-7z%', 'application/gzip', 'application/x-tar']
    ];

    if ($fileType && isset($fileTypeMapping[$fileType])) {
        $typeConds = [];
        foreach ($fileTypeMapping[$fileType] as $mimePattern) {
            $typeConds[] = 'f.type LIKE ?';
            $params[] = $mimePattern;
        }
        $conditions[] = '(' . implode(' OR ', $typeConds) . ')';
    }

    $whereClause = implode(' AND ', $conditions);

    if ($isAdmin) {
        // 管理者は全ファイルを取得可能
        $stmt = $pdo->prepare("
            SELECT f.*, u.name as creator_name
            FROM files f
            LEFT JOIN users u ON f.created_by = u.id
            WHERE $whereClause

            ORDER BY f.$sortColumn $sortOrder
        ");
        logDebug("Executing Admin Query. Params: " . print_r($params, true));
        $stmt->execute($params);
    } else {
        // 一般ユーザーは権限のあるフォルダのファイルのみ
        if ($folderId) {
            // 権限チェック
            $permStmt = $pdo->prepare("
                SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?
            ");
            $permStmt->execute([$folderId, $userId]);
            if (!$permStmt->fetch()) {
                throw new Exception('このフォルダへのアクセス権限がありません');
            }
        }

        $params[] = $userId;
        $stmt = $pdo->prepare("
            SELECT f.*, u.name as creator_name
            FROM files f
            INNER JOIN folder_permissions fp ON f.folder_id = fp.folder_id AND fp.user_id = ?
            LEFT JOIN users u ON f.created_by = u.id
            WHERE $whereClause
            ORDER BY f.$sortColumn $sortOrder
        ");
        $stmt->execute(array_merge($params));
    }

    $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス用に整形
    $formattedFiles = array_map(function ($file) {
        return [
            'id' => (string) $file['id'],
            'name' => $file['name'],
            'type' => $file['type'],
            'size' => (int) $file['size'],
            'folder_id' => (string) $file['folder_id'],
            'created_by' => (string) $file['created_by'],
            'creator_name' => $file['creator_name'],
            'storage_path' => $file['storage_path'],
            'created_at' => $file['created_at']
        ];
    }, $files);

    $response = [
        'status' => 'success',
        'data' => $formattedFiles
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