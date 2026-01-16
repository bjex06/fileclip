<?php
/**
 * ファイルバージョン履歴取得API
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
require_once '../../utils/validation.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $userId = $payload['user_id'];
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $fileId = $_GET['file_id'] ?? null;

    if (!$fileId) {
        throw new Exception('ファイルIDが必要です');
    }

    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    $pdo = getDatabaseConnection();

    // ファイル情報取得
    $stmt = $pdo->prepare("
        SELECT f.*, fol.id as folder_id
        FROM files f
        LEFT JOIN folders fol ON f.folder_id = fol.id
        WHERE f.id = ? AND f.is_deleted = FALSE
    ");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // 権限チェック
    if (!$isAdmin) {
        $permStmt = $pdo->prepare("
            SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$file['folder_id'], $userId]);
        if (!$permStmt->fetch()) {
            throw new Exception('このファイルへのアクセス権限がありません');
        }
    }

    // バージョン履歴取得
    $stmt = $pdo->prepare("
        SELECT fv.*, u.name as created_by_name
        FROM file_versions fv
        LEFT JOIN users u ON fv.created_by = u.id
        WHERE fv.file_id = ?
        ORDER BY fv.version_number DESC
    ");
    $stmt->execute([$fileId]);
    $versions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // レスポンス用に整形
    $formattedVersions = array_map(function ($version) {
        return [
            'id' => (string) $version['id'],
            'file_id' => (string) $version['file_id'],
            'version_number' => (int) $version['version_number'],
            'size' => (int) $version['size'],
            'storage_path' => $version['storage_path'],
            'comment' => $version['comment'],
            'created_by' => (string) $version['created_by'],
            'created_by_name' => $version['created_by_name'],
            'created_at' => $version['created_at'],
            'is_current' => (bool) $version['is_current']
        ];
    }, $versions);

    $response = [
        'status' => 'success',
        'data' => [
            'file' => [
                'id' => (string) $file['id'],
                'name' => $file['name'],
                'type' => $file['type'],
                'current_size' => (int) $file['size']
            ],
            'versions' => $formattedVersions,
            'total_versions' => count($formattedVersions)
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