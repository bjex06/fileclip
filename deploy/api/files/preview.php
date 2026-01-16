<?php
/**
 * ファイルプレビューAPI - 画像・動画・音声・PDFのストリーミング
 */
ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
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

    $fileId = $_GET['file_id'] ?? null;

    if (!$fileId) {
        throw new Exception('ファイルIDが必要です');
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

    // プレビュー可能なMIMEタイプかチェック
    $previewableMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'video/mp4',
        'video/webm',
        'video/ogg',
        'audio/mpeg',
        'audio/ogg',
        'audio/wav',
        'audio/webm',
        'application/pdf',
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'application/json',
        'application/xml',
        // Office Files
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'application/msword', // doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/vnd.ms-excel', // xls
        'text/csv' // csv
    ];

    $mimeType = $file['type'] ?: 'application/octet-stream';

    // 簡易タイプ(db由来)を正式なMIMEタイプにマッピング
    $typeMapping = [
        // Office
        'excel' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'word' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'powerpoint' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc' => 'application/msword',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls' => 'application/vnd.ms-excel',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt' => 'application/vnd.ms-powerpoint',
        'csv' => 'text/csv',

        // Image
        'image' => 'image/jpeg', // 簡易的フォールバック
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
        'svg' => 'image/svg+xml',

        // Video/Audio
        'video' => 'video/mp4',
        'mp4' => 'video/mp4',
        'mp3' => 'audio/mpeg',

        // Document
        'pdf' => 'application/pdf',
        'txt' => 'text/plain',
        'text' => 'text/plain'
    ];

    // DB値がそのままMIMEタイプの場合もあるので、小文字にしてチェック
    $lowerType = strtolower($mimeType);
    if (isset($typeMapping[$lowerType])) {
        $mimeType = $typeMapping[$lowerType];
    }

    // MIMEタイプの部分一致チェック
    $isPreviewable = false;
    foreach ($previewableMimeTypes as $allowedType) {
        if ($mimeType === $allowedType || strpos($mimeType, explode('/', $allowedType)[0] . '/') === 0) {
            $isPreviewable = true;
            break;
        }
    }

    if (!$isPreviewable) {
        throw new Exception('このファイル形式はプレビューできません');
    }

    // ファイルパス
    $filePath = '../../uploads/' . $file['storage_path'];

    if (!file_exists($filePath)) {
        throw new Exception('ファイルが存在しません');
    }

    $fileSize = filesize($filePath);

    // Range リクエストに対応（動画・音声のシーク対応）
    $start = 0;
    $end = $fileSize - 1;
    $length = $fileSize;

    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        if (preg_match('/bytes=(\d*)-(\d*)/', $range, $matches)) {
            $start = $matches[1] !== '' ? intval($matches[1]) : 0;
            $end = $matches[2] !== '' ? intval($matches[2]) : $fileSize - 1;

            if ($start > $end || $start >= $fileSize) {
                http_response_code(416); // Range Not Satisfiable
                header("Content-Range: bytes */$fileSize");
                exit();
            }

            $length = $end - $start + 1;
            http_response_code(206); // Partial Content
            header("Content-Range: bytes $start-$end/$fileSize");
        }
    }

    // 不要な出力バッファをクリア（空白などの混入を防ぐ）
    if (ob_get_level()) {
        ob_end_clean();
    }

    // ヘッダー設定
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . $length);
    header('Accept-Ranges: bytes');
    header('Cache-Control: public, max-age=86400'); // 24時間キャッシュ

    // インライン表示（ダウンロードではなくブラウザで開く）
    $filename = $file['original_name'] ?: $file['name'];
    header('Content-Disposition: inline; filename="' . rawurlencode($filename) . '"');

    // ファイル出力
    $fp = fopen($filePath, 'rb');
    if ($fp === false) {
        throw new Exception('ファイルを開けませんでした');
    }

    fseek($fp, $start);

    $bufferSize = 8192; // 8KB chunks
    $remaining = $length;

    while (!feof($fp) && $remaining > 0) {
        $readSize = min($bufferSize, $remaining);
        $buffer = fread($fp, $readSize);
        if ($buffer === false) {
            break;
        }
        echo $buffer;
        $remaining -= strlen($buffer);
        flush();
    }

    fclose($fp);
    exit();

} catch (Exception $e) {
    $logDir = sys_get_temp_dir();
    $logFile = $logDir . '/kohinata3_preview_debug.log';
    if (is_writable($logDir)) {
        $logEntry = date('Y-m-d H:i:s') . " - Preview Error: " . $e->getMessage() . " FileID: " . ($fileId ?? 'null') . "\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);
    }
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}