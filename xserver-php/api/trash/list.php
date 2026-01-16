<?php
/**
 * ゴミ箱一覧API
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

    $userId = $payload['user_id'];
    // DEBUG LOG setup
    $logFile = '../../logs/debug_trash.log';
    if (!is_dir(dirname($logFile)))
        mkdir(dirname($logFile), 0755, true);

    function logDebug($msg)
    {
        global $logFile;
        error_log(date('[Y-m-d H:i:s] ') . $msg . "\n", 3, $logFile);
    }
    $userRole = $payload['role'] ?? 'user';
    logDebug("Trash List API called. User: $userId, Role: $userRole");

    // super_admin または admin 以外も管理者として扱う (簡易対応)
    $isAdmin = in_array($userRole, ['super_admin', 'admin', 'branch_admin', 'department_admin']);

    $pdo = getDatabaseConnection();

    $items = [];

    // 削除されたフォルダを取得
    if ($isAdmin) {
        // 管理者は全ての削除アイテムを表示
        $stmt = $pdo->prepare("
            SELECT f.id, f.name, 'folder' as type, '' as original_path,
                   f.deleted_at, f.created_by, u.name as deleted_by_name
            FROM folders f
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.is_deleted = TRUE
            ORDER BY f.deleted_at DESC
        ");
        $stmt->execute();
    } else {
        // 一般ユーザーは自分が作成したものか、以前アクセス権があったものを表示すべきだが、
        // 簡易的に自分が作成したもの（ゴミ箱に入れたもの）を表示
        $stmt = $pdo->prepare("
            SELECT f.id, f.name, 'folder' as type, '' as original_path,
                   f.deleted_at, f.created_by, u.name as deleted_by_name
            FROM folders f
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.is_deleted = TRUE AND f.created_by = ?
            ORDER BY f.deleted_at DESC
        ");
        $stmt->execute([$userId]);
    }
    $deletedFolders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($deletedFolders as $folder) {
        $items[] = [
            'id' => $folder['id'],
            'name' => $folder['name'],
            'type' => 'folder',
            'original_path' => $folder['original_path'],
            'deleted_at' => $folder['deleted_at'],
            'deleted_by' => $folder['deleted_by_name']
        ];
    }

    // 削除されたファイルを取得
    if ($isAdmin) {
        $stmt = $pdo->prepare("
            SELECT f.id, f.name, 'file' as type, f.size, f.extension,
                   f.folder_id,
                   CONCAT(COALESCE(fld.path, ''), '/', f.name) as original_path,
                   f.deleted_at, f.created_by, u.name as deleted_by_name
            FROM files f
            LEFT JOIN folders fld ON f.folder_id = fld.id
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.is_deleted = TRUE
            ORDER BY f.deleted_at DESC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT f.id, f.name, 'file' as type, f.size, f.extension,
                   f.folder_id,
                   CONCAT(COALESCE(fld.path, ''), '/', f.name) as original_path,
                   f.deleted_at, f.created_by, u.name as deleted_by_name
            FROM files f
            LEFT JOIN folders fld ON f.folder_id = fld.id
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.is_deleted = TRUE AND f.created_by = ?
            ORDER BY f.deleted_at DESC
        ");
        $stmt->execute([$userId]);
    }
    $deletedFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($deletedFiles as $file) {
        $items[] = [
            'id' => $file['id'],
            'name' => $file['name'],
            'type' => 'file',
            'size' => (int) $file['size'],
            'extension' => $file['extension'],
            'original_path' => $file['original_path'],
            'deleted_at' => $file['deleted_at'],
            'deleted_by' => $file['deleted_by_name']
        ];
    }

    // 削除日時でソート
    usort($items, function ($a, $b) {
        return strtotime($b['deleted_at']) - strtotime($a['deleted_at']);
    });

    $response = [
        'status' => 'success',
        'data' => $items,
        'count' => count($items)
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    if (function_exists('logDebug')) {
        logDebug("Trash API Error: " . $e->getMessage());
        logDebug("Trace: " . $e->getTraceAsString());
    } else {
        error_log("Trash API Error: " . $e->getMessage());
    }
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>