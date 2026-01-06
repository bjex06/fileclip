<?php
/**
 * ファイル移動API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    $isAdmin = $payload['role'] === 'admin';

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['file_id']) || !isset($input['target_folder_id'])) {
        throw new Exception('ファイルIDと移動先フォルダIDが必要です');
    }

    $fileId = $input['file_id'];
    $targetFolderId = $input['target_folder_id'];

    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    // target_folder_id が null の場合はルートへ移動（将来的に対応）
    if ($targetFolderId !== null && !isValidId($targetFolderId)) {
        throw new Exception('無効な移動先フォルダIDです');
    }

    $pdo = getDatabaseConnection();

    // ファイル情報取得
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // 現在のフォルダと同じ場所には移動できない
    if ($file['folder_id'] == $targetFolderId) {
        throw new Exception('ファイルは既にこのフォルダにあります');
    }

    // 権限チェック（移動元フォルダ）
    if (!$isAdmin) {
        $permStmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$file['folder_id'], $userId]);
        $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

        if (!$perm || !in_array($perm['permission_level'], ['edit', 'manage'])) {
            throw new Exception('このファイルを移動する権限がありません');
        }
    }

    // 移動先フォルダの存在と権限チェック
    if ($targetFolderId !== null) {
        $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = FALSE");
        $stmt->execute([$targetFolderId]);
        $targetFolder = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetFolder) {
            throw new Exception('移動先フォルダが見つかりません');
        }

        if (!$isAdmin) {
            $permStmt = $pdo->prepare("
                SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
            ");
            $permStmt->execute([$targetFolderId, $userId]);
            $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

            if (!$perm || !in_array($perm['permission_level'], ['edit', 'manage'])) {
                throw new Exception('移動先フォルダへのアクセス権限がありません');
            }
        }
    }

    // ファイル移動
    $stmt = $pdo->prepare("UPDATE files SET folder_id = ? WHERE id = ?");
    $stmt->execute([$targetFolderId, $fileId]);

    // アクティビティログ
    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address)
        VALUES (?, 'move', 'file', ?, ?, ?, ?)
    ");
    $logStmt->execute([
        $userId,
        $fileId,
        $file['name'],
        json_encode([
            'from_folder_id' => $file['folder_id'],
            'to_folder_id' => $targetFolderId
        ]),
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'ファイルを移動しました',
        'data' => [
            'file_id' => $fileId,
            'new_folder_id' => $targetFolderId
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
