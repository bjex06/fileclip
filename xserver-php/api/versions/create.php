<?php
/**
 * ファイルバージョン作成API（新しいバージョンをアップロード）
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

    // ファイルアップロードチェック
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('ファイルのアップロードに失敗しました');
    }

    $fileId = $_POST['file_id'] ?? null;
    $comment = $_POST['comment'] ?? '';

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
            SELECT permission_level FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $permStmt->execute([$file['folder_id'], $userId]);
        $perm = $permStmt->fetch(PDO::FETCH_ASSOC);

        if (!$perm || !in_array($perm['permission_level'], ['edit', 'manage'])) {
            throw new Exception('このファイルを編集する権限がありません');
        }
    }

    // 最新のバージョン番号を取得
    $stmt = $pdo->prepare("SELECT MAX(version_number) as max_version FROM file_versions WHERE file_id = ?");
    $stmt->execute([$fileId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $newVersionNumber = ($result['max_version'] ?? 0) + 1;

    // 現在のファイルをバージョンとして保存（初回のみ）
    if ($newVersionNumber === 1) {
        // 現在のファイルをバージョン1として保存
        $stmt = $pdo->prepare("
            INSERT INTO file_versions (file_id, version_number, size, storage_path, created_by, is_current)
            VALUES (?, 1, ?, ?, ?, FALSE)
        ");
        $stmt->execute([
            $fileId,
            $file['size'],
            $file['storage_path'],
            $file['created_by']
        ]);
        $newVersionNumber = 2;
    }

    // 新しいファイルを保存
    $uploadedFile = $_FILES['file'];
    $extension = pathinfo($uploadedFile['name'], PATHINFO_EXTENSION);
    $storagePath = 'versions/' . $fileId . '_v' . $newVersionNumber . '_' . time() . '.' . $extension;
    $uploadDir = '../../uploads/versions/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if (!move_uploaded_file($uploadedFile['tmp_name'], $uploadDir . basename($storagePath))) {
        throw new Exception('ファイルの保存に失敗しました');
    }

    $pdo->beginTransaction();

    try {
        // 既存のバージョンのis_currentをFALSEに
        $stmt = $pdo->prepare("UPDATE file_versions SET is_current = FALSE WHERE file_id = ?");
        $stmt->execute([$fileId]);

        // 新しいバージョンを追加
        $stmt = $pdo->prepare("
            INSERT INTO file_versions (file_id, version_number, size, storage_path, comment, created_by, is_current)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
        ");
        $stmt->execute([
            $fileId,
            $newVersionNumber,
            $uploadedFile['size'],
            $storagePath,
            $comment,
            $userId
        ]);
        $versionId = $pdo->lastInsertId();

        // ファイル本体を更新
        $stmt = $pdo->prepare("
            UPDATE files SET size = ?, storage_path = ? WHERE id = ?
        ");
        $stmt->execute([
            $uploadedFile['size'],
            $storagePath,
            $fileId
        ]);

        // アクティビティログ
        $logStmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, resource_type, resource_id, resource_name, details, ip_address)
            VALUES (?, 'version_create', 'file', ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $userId,
            $fileId,
            $file['name'],
            json_encode([
                'version_number' => $newVersionNumber,
                'comment' => $comment
            ]),
            $_SERVER['REMOTE_ADDR'] ?? null
        ]);

        $pdo->commit();

        $response = [
            'status' => 'success',
            'message' => 'バージョン ' . $newVersionNumber . ' を作成しました',
            'data' => [
                'version_id' => (string)$versionId,
                'version_number' => $newVersionNumber,
                'size' => (int)$uploadedFile['size']
            ]
        ];

        http_response_code(201);
        echo json_encode($response);

    } catch (Exception $e) {
        $pdo->rollBack();
        // アップロードしたファイルを削除
        if (file_exists($uploadDir . basename($storagePath))) {
            unlink($uploadDir . basename($storagePath));
        }
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
