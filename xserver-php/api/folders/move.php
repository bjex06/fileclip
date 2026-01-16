<?php
/**
 * フォルダ移動API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

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
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['folder_id'])) {
        throw new Exception('フォルダIDが必要です');
    }

    $folderId = $input['folder_id'];
    $targetParentId = $input['target_parent_id'] ?? null; // null = ルートへ移動

    if (!isValidId($folderId)) {
        throw new Exception('無効なフォルダIDです');
    }

    if ($targetParentId !== null && !isValidId($targetParentId)) {
        throw new Exception('無効な移動先フォルダIDです');
    }

    // 自分自身には移動できない
    if ($folderId === $targetParentId) {
        throw new Exception('フォルダを自分自身の中に移動することはできません');
    }

    $pdo = getDatabaseConnection();

    // フォルダ情報取得
    $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$folderId]);
    $folder = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$folder) {
        throw new Exception('フォルダが見つかりません');
    }

    // 現在の親と同じ場所には移動できない
    if ($folder['parent_id'] == $targetParentId) {
        throw new Exception('フォルダは既にこの場所にあります');
    }

    // 権限チェック（移動するフォルダ）
    if (!$isAdmin) {
        $permStmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$folderId, $userId]);
        $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

        if (!$perm || $perm['permission_level'] !== 'manage') {
            throw new Exception('このフォルダを移動する権限がありません');
        }
    }

    // 移動先が子孫フォルダでないかチェック（循環参照防止）
    if ($targetParentId !== null) {
        $currentId = $targetParentId;
        $maxDepth = 50;
        $depth = 0;

        while ($currentId !== null && $depth < $maxDepth) {
            if ($currentId == $folderId) {
                throw new Exception('フォルダを自身の子孫フォルダに移動することはできません');
            }

            $stmt = $pdo->prepare("SELECT parent_id FROM folders WHERE id = ? AND is_deleted = FALSE");
            $stmt->execute([$currentId]);
            $parent = $stmt->fetch(PDO::FETCH_ASSOC);

            $currentId = $parent ? $parent['parent_id'] : null;
            $depth++;
        }

        // 移動先フォルダの存在と権限チェック
        $stmt = $pdo->prepare("SELECT * FROM folders WHERE id = ? AND is_deleted = FALSE");
        $stmt->execute([$targetParentId]);
        $targetFolder = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$targetFolder) {
            throw new Exception('移動先フォルダが見つかりません');
        }

        if (!$isAdmin) {
            $permStmt = $pdo->prepare("
                SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
            ");
            $permStmt->execute([$targetParentId, $userId]);
            $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

            if (!$perm || !in_array($perm['permission_level'], ['edit', 'manage'])) {
                throw new Exception('移動先フォルダへのアクセス権限がありません');
            }
        }
    }

    // フォルダ移動
    $stmt = $pdo->prepare("UPDATE folders SET parent_id = ? WHERE id = ?");
    $stmt->execute([$targetParentId, $folderId]);

    // アクティビティログ
    $logStmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address)
        VALUES (?, 'move', 'folder', ?, ?, ?, ?)
    ");
    $logStmt->execute([
        $userId,
        $folderId,
        $folder['name'],
        json_encode([
            'from_parent_id' => $folder['parent_id'],
            'to_parent_id' => $targetParentId
        ]),
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'フォルダを移動しました',
        'data' => [
            'folder_id' => $folderId,
            'new_parent_id' => $targetParentId
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