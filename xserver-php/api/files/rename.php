<?php
/**
 * ファイル名変更API
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
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
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    // JSONデータを取得
    $data = json_decode(file_get_contents('php://input'), true);

    $fileId = $data['file_id'] ?? null;
    $newName = $data['name'] ?? null;

    if (!$fileId) {
        throw new Exception('ファイルIDは必須です');
    }
    if (!$newName) {
        throw new Exception('新しいファイル名は必須です');
    }

    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    // ファイル名バリデーション（簡易）
    if (preg_match('/[\\/:*?"<>|]/', $newName)) {
        throw new Exception('ファイル名に使用できない文字が含まれています');
    }

    $pdo = getDatabaseConnection();

    // ファイル存在確認と権限チェック
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // 権限チェック
    if (!$isAdmin) {
        // 作成者本人か、フォルダに対する権限があるか
        // ここではフォルダ権限を見るのが一般的（または作成者）
        if ($file['created_by'] != $userId) {
            $permStmt = $pdo->prepare("SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?");
            $permStmt->execute([$file['folder_id'], $userId]);
            if (!$permStmt->fetch()) {
                throw new Exception('権限がありません');
            }
        }
    }

    // 更新実行
    $updateStmt = $pdo->prepare("UPDATE files SET name = ?, updated_at = NOW() WHERE id = ?");
    $updateStmt->execute([$newName, $fileId]);

    echo json_encode([
        'status' => 'success',
        'message' => 'ファイル名を変更しました',
        'data' => [
            'id' => $fileId,
            'name' => $newName
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>