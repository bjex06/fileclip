<?php
/**
 * ファイルバージョン復元API
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

    if (!$input || !isset($input['version_id'])) {
        throw new Exception('バージョンIDが必要です');
    }

    $versionId = $input['version_id'];

    if (!isValidId($versionId)) {
        throw new Exception('無効なバージョンIDです');
    }

    $pdo = getDatabaseConnection();

    // バージョン情報取得
    $stmt = $pdo->prepare("
        SELECT fv.*, f.name as file_name, f.folder_id
        FROM file_versions fv
        JOIN files f ON fv.file_id = f.id
        WHERE fv.id = ?
    ");
    $stmt->execute([$versionId]);
    $version = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$version) {
        throw new Exception('バージョンが見つかりません');
    }

    // 権限チェック
    if (!$isAdmin) {
        $permStmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$version['folder_id'], $userId]);
        $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

        if (!$perm || !in_array($perm['permission_level'], ['edit', 'manage'])) {
            throw new Exception('このファイルを編集する権限がありません');
        }
    }

    // バージョンファイルの存在確認
    $versionFilePath = '../../uploads/' . $version['storage_path'];
    if (!file_exists($versionFilePath)) {
        throw new Exception('バージョンファイルが見つかりません');
    }

    $pdo->beginTransaction();

    try {
        // 既存のis_currentをFALSEに
        $stmt = $pdo->prepare("UPDATE file_versions SET is_current = FALSE WHERE file_id = ?");
        $stmt->execute([$version['file_id']]);

        // 指定したバージョンをis_currentに
        $stmt = $pdo->prepare("UPDATE file_versions SET is_current = TRUE WHERE id = ?");
        $stmt->execute([$versionId]);

        // ファイル本体を更新
        $stmt = $pdo->prepare("
            UPDATE files SET size = ?, storage_path = ? WHERE id = ?
        ");
        $stmt->execute([
            $version['size'],
            $version['storage_path'],
            $version['file_id']
        ]);

        // アクティビティログ
        $logStmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address)
            VALUES (?, 'version_restore', 'file', ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $userId,
            $version['file_id'],
            $version['file_name'],
            json_encode([
                'restored_version' => $version['version_number']
            ]),
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => 'バージョン ' . $version['version_number'] . ' に復元しました',
            'data' => [
                'file_id' => (string)$version['file_id'],
                'restored_version' => (int)$version['version_number']
            ]
        ];

        http_response_code(200);
        echo json_encode($response);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
