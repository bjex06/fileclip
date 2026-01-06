<?php
/**
 * 最近使用したファイル一覧API
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

    $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 100) : 20;

    $pdo = getDatabaseConnection();

    // 最近使用したファイル一覧を取得
    $stmt = $pdo->prepare("
        SELECT
            rf.id,
            rf.file_id,
            rf.accessed_at,
            f.name,
            f.type,
            f.extension,
            f.size,
            f.folder_id,
            fld.name as folder_name
        FROM recent_files rf
        INNER JOIN files f ON rf.file_id = f.id AND f.is_deleted = FALSE
        LEFT JOIN folders fld ON f.folder_id = fld.id
        WHERE rf.user_id = ?
        ORDER BY rf.accessed_at DESC
        LIMIT ?
    ");
    $stmt->execute([$userId, $limit]);
    $recentFiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 整形
    $formattedFiles = array_map(function($file) {
        return [
            'id' => $file['id'],
            'file_id' => $file['file_id'],
            'name' => $file['name'],
            'type' => $file['type'],
            'extension' => $file['extension'],
            'size' => (int)$file['size'],
            'folder_id' => $file['folder_id'],
            'folder_name' => $file['folder_name'],
            'accessed_at' => $file['accessed_at']
        ];
    }, $recentFiles);

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
