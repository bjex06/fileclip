<?php
/**
 * 共有リンク一覧API
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
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $pdo = getDatabaseConnection();

    // 共有リンク一覧取得
    if ($isAdmin) {
        $stmt = $pdo->prepare("
            SELECT sl.*,
                   CASE
                       WHEN sl.resource_type = 'file' THEN (SELECT name FROM files WHERE id = sl.resource_id)
                       ELSE (SELECT name FROM folders WHERE id = sl.resource_id)
                   END as resource_name,
                   u.name as creator_name
            FROM share_links sl
            LEFT JOIN users u ON sl.created_by = u.id
            ORDER BY sl.created_at DESC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("
            SELECT sl.*,
                   CASE
                       WHEN sl.resource_type = 'file' THEN (SELECT name FROM files WHERE id = sl.resource_id)
                       ELSE (SELECT name FROM folders WHERE id = sl.resource_id)
                   END as resource_name
            FROM share_links sl
            WHERE sl.created_by = ?
            ORDER BY sl.created_at DESC
        ");
        $stmt->execute([$userId]);
    }

    $shareLinks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス用に整形
    $formattedLinks = array_map(function ($link) {
        return [
            'id' => $link['id'],
            'token' => $link['token'],
            'resource_type' => $link['resource_type'],
            'resource_id' => $link['resource_id'],
            'resource_name' => $link['resource_name'],
            'creator_name' => $link['creator_name'] ?? null,
            'has_password' => !empty($link['password_hash']),
            'expires_at' => $link['expires_at'],
            'download_count' => (int) $link['download_count'],
            'max_downloads' => $link['max_downloads'] ? (int) $link['max_downloads'] : null,
            'is_active' => (bool) $link['is_active'],
            'is_expired' => $link['expires_at'] && strtotime($link['expires_at']) < time(),
            'created_at' => $link['created_at']
        ];
    }, $shareLinks);

    $response = [
        'status' => 'success',
        'data' => $formattedLinks
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