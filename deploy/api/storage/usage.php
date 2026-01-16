<?php
/**
 * ストレージ使用量API
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
    $isAdmin = isAdminRole($payload['role']);

    $pdo = getDatabaseConnection();

    // ユーザー情報取得
    $stmt = $pdo->prepare("SELECT storage_quota, storage_used FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('ユーザーが見つかりません');
    }

    // 実際のファイルサイズを計算（削除されていないファイルのみ）
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(size), 0) as total_size
        FROM files
        WHERE created_by = ? AND is_deleted = FALSE
    ");
    $stmt->execute([$userId]);
    $actualUsed = (int) $stmt->fetch(PDO::FETCH_ASSOC)['total_size'];

    // DBの値と実際の値が異なる場合は更新
    if ($actualUsed != $user['storage_used']) {
        $stmt = $pdo->prepare("UPDATE users SET storage_used = ? WHERE id = ?");
        $stmt->execute([$actualUsed, $userId]);
    }

    $quota = (int) $user['storage_quota'];
    $used = $actualUsed;
    $percentage = $quota > 0 ? round(($used / $quota) * 100, 2) : 0;

    // ファイル種類別の内訳
    $stmt = $pdo->prepare("
        SELECT
            CASE
                WHEN type LIKE 'image/%' THEN 'images'
                WHEN type LIKE 'video/%' THEN 'videos'
                WHEN type LIKE 'audio/%' THEN 'audio'
                WHEN type IN ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                              'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              'text/plain', 'text/csv') THEN 'documents'
                ELSE 'others'
            END as category,
            COALESCE(SUM(size), 0) as total_size,
            COUNT(*) as file_count
        FROM files
        WHERE created_by = ? AND is_deleted = FALSE
        GROUP BY category
    ");
    $stmt->execute([$userId]);
    $breakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $breakdownFormatted = [
        'documents' => ['size' => 0, 'count' => 0],
        'images' => ['size' => 0, 'count' => 0],
        'videos' => ['size' => 0, 'count' => 0],
        'audio' => ['size' => 0, 'count' => 0],
        'others' => ['size' => 0, 'count' => 0]
    ];

    foreach ($breakdown as $item) {
        $category = $item['category'];
        if (isset($breakdownFormatted[$category])) {
            $breakdownFormatted[$category] = [
                'size' => (int) $item['total_size'],
                'count' => (int) $item['file_count']
            ];
        }
    }

    $response = [
        'status' => 'success',
        'data' => [
            'used' => $used,
            'quota' => $quota,
            'percentage' => $percentage,
            'available' => max(0, $quota - $used),
            'breakdown' => $breakdownFormatted
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