<?php
/**
 * フォルダパス取得API - パンくずナビゲーション用
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

    $folderId = $_GET['folder_id'] ?? null;

    if (!$folderId) {
        // ルートからのパスを返す
        $response = [
            'status' => 'success',
            'data' => [
                'path' => [
                    [
                        'id' => null,
                        'name' => 'ルート',
                        'parent_id' => null
                    ]
                ],
                'current' => null
            ]
        ];
        http_response_code(200);
        echo json_encode($response);
        exit();
    }

    $pdo = getDatabaseConnection();

    // 権限チェック（一般ユーザーの場合）
    if (!$isAdmin) {
        $permStmt = $pdo->prepare("
            SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$folderId, $userId]);
        if (!$permStmt->fetch()) {
            throw new Exception('このフォルダへのアクセス権限がありません');
        }
    }

    // フォルダパスを取得（再帰的に親フォルダを辿る）
    $path = [];
    $currentId = $folderId;
    $maxDepth = 50; // 無限ループ防止
    $depth = 0;

    while ($currentId && $depth < $maxDepth) {
        $stmt = $pdo->prepare("
            SELECT id, name, parent_id, created_by, created_at
            FROM folders
            WHERE id = ? AND is_deleted = FALSE
        ");
        $stmt->execute([$currentId]);
        $folder = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$folder) {
            break;
        }

        array_unshift($path, [
            'id' => (string) $folder['id'],
            'name' => $folder['name'],
            'parent_id' => $folder['parent_id'] ? (string) $folder['parent_id'] : null
        ]);

        $currentId = $folder['parent_id'];
        $depth++;
    }

    // ルートを先頭に追加
    array_unshift($path, [
        'id' => null,
        'name' => 'ルート',
        'parent_id' => null
    ]);

    $response = [
        'status' => 'success',
        'data' => [
            'path' => $path,
            'current' => $folderId
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