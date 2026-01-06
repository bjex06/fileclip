<?php
/**
 * ファイルダウンロードAPI
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
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
    
    // ファイルID取得
    $fileId = isset($_GET['file_id']) ? $_GET['file_id'] : null;
    
    if (!$fileId) {
        throw new Exception('ファイルIDは必須です');
    }
    
    if (!isValidId($fileId)) {
        throw new Exception('無効なファイルIDです');
    }
    
    $pdo = getDatabaseConnection();
    
    // ファイル情報取得
    $stmt = $pdo->prepare("
        SELECT f.*, fo.id as folder_exists
        FROM files f
        LEFT JOIN folders fo ON f.folder_id = fo.id
        WHERE f.id = ?
    ");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }
    
    // 権限チェック（管理者以外）
    if (!$isAdmin) {
        $stmt = $pdo->prepare("
            SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $stmt->execute([$file['folder_id'], $userId]);
        if (!$stmt->fetch()) {
            throw new Exception('このファイルへのアクセス権限がありません');
        }
    }
    
    // ファイルパス
    $filePath = '../../uploads/' . $file['storage_path'];
    
    if (!file_exists($filePath)) {
        throw new Exception('ファイルが存在しません');
    }
    
    // MIMEタイプの設定
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'word' => 'application/msword',
        'excel' => 'application/vnd.ms-excel',
        'powerpoint' => 'application/vnd.ms-powerpoint',
        'image' => 'application/octet-stream',
        'video' => 'application/octet-stream',
        'text' => 'text/plain',
        'archive' => 'application/zip',
        'other' => 'application/octet-stream'
    ];
    
    $contentType = $mimeTypes[$file['type']] ?? 'application/octet-stream';
    
    // ダウンロードログを記録
    $logDir = '../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/downloads.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] User ID: {$userId} downloaded File ID: {$fileId} ({$file['name']})\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // ヘッダー設定
    header('Content-Type: ' . $contentType);
    header('Content-Disposition: attachment; filename="' . rawurlencode($file['name']) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    // ファイル出力
    readfile($filePath);
    exit();
    
} catch (Exception $e) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
