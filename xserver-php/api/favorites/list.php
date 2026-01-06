<?php
/**
 * お気に入り一覧API
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

    $pdo = getDatabaseConnection();

    // お気に入り一覧を取得（ファイルとフォルダの情報も結合）
    $stmt = $pdo->prepare("
        SELECT
            fav.id,
            fav.resource_type,
            fav.resource_id,
            fav.created_at,
            CASE
                WHEN fav.resource_type = 'file' THEN f.name
                ELSE fld.name
            END as resource_name,
            CASE
                WHEN fav.resource_type = 'file' THEN f.size
                ELSE NULL
            END as file_size,
            CASE
                WHEN fav.resource_type = 'file' THEN f.type
                ELSE NULL
            END as file_type,
            CASE
                WHEN fav.resource_type = 'file' THEN f.extension
                ELSE NULL
            END as file_extension,
            CASE
                WHEN fav.resource_type = 'file' THEN f.folder_id
                ELSE fld.parent_id
            END as parent_id
        FROM favorites fav
        LEFT JOIN files f ON fav.resource_type = 'file' AND fav.resource_id = f.id AND f.is_deleted = FALSE
        LEFT JOIN folders fld ON fav.resource_type = 'folder' AND fav.resource_id = fld.id AND fld.is_deleted = FALSE
        WHERE fav.user_id = ?
        ORDER BY fav.created_at DESC
    ");
    $stmt->execute([$userId]);
    $favorites = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // NULLのリソース（削除済み）を除外
    $favorites = array_filter($favorites, function($fav) {
        return $fav['resource_name'] !== null;
    });

    // 整形
    $formattedFavorites = array_map(function($fav) {
        return [
            'id' => $fav['id'],
            'resource_type' => $fav['resource_type'],
            'resource_id' => $fav['resource_id'],
            'resource_name' => $fav['resource_name'],
            'file_size' => $fav['file_size'] ? (int)$fav['file_size'] : null,
            'file_type' => $fav['file_type'],
            'file_extension' => $fav['file_extension'],
            'parent_id' => $fav['parent_id'],
            'created_at' => $fav['created_at']
        ];
    }, array_values($favorites));

    $response = [
        'status' => 'success',
        'data' => $formattedFavorites
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
