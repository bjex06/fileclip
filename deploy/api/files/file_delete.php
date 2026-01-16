<?php
/**
 * ファイル削除API（ソフトデリート - ゴミ箱へ移動）
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/auth.php';
require_once '../../utils/validation.php';

// DEBUG LOG setup
$logFile = __DIR__ . '/delete_debug.txt';
if (!is_dir(dirname($logFile))) {
    @mkdir(dirname($logFile), 0755, true);
}
function logDebug($msg)
{
    global $logFile;
    error_log(date('[Y-m-d H:i:s] ') . $msg . "\n", 3, $logFile);
}
logDebug("Delete Request Received. Method: " . $_SERVER['REQUEST_METHOD']);


// getallheaders Polyfill for Nginx
if (!function_exists('getallheaders')) {
    function getallheaders()
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}

try {
    logDebug("Starting Auth...");
    // 認証チェック
    $payload = authenticateRequest();
    logDebug("Auth Success. User: " . ($payload['user_id'] ?? 'Unknown'));

    $userId = $payload['user_id'];
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    $rawData = file_get_contents('php://input');
    logDebug("Raw Input: " . $rawData);
    $input = json_decode($rawData, true);

    if (!$input || !isset($input['file_id'])) {
        throw new Exception('ファイルIDが必要です');
    }

    $fileId = $input['file_id'];
    logDebug("File ID parsed: " . $fileId);

    if (!isValidUuid($fileId)) {
        throw new Exception('無効なファイルIDです');
    }

    $pdo = getDatabaseConnection();
    logDebug("DB Connected");

    // ファイル情報取得（削除されていないもの）
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    logDebug("File Found: " . ($file ? 'YES' : 'NO') . ", ID: " . $fileId);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // 削除権限チェック
    if (!$isAdmin && $file['created_by'] != $userId) {
        $stmt = $pdo->prepare("
            SELECT permission_level FROM folder_permissions
            WHERE folder_id = ? AND user_id = ?
        ");
        $stmt->execute([$file['folder_id'], $userId]);
        $permission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$permission || !in_array($permission['permission_level'], ['edit', 'manage'])) {
            throw new Exception('このファイルの削除権限がありません');
        }
    }

    // ソフトデリート（ゴミ箱へ移動）
    $stmt = $pdo->prepare("
        UPDATE files
        SET is_deleted = TRUE, deleted_at = NOW()
        WHERE id = ?
    ");
    $result = $stmt->execute([$fileId]);
    logDebug("Update Result: " . ($result ? 'TRUE' : 'FALSE') . ", RowCount: " . $stmt->rowCount());

    // アクティビティログを記録
    $logId = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, resource_name, ip_address, created_at)
        VALUES (?, ?, 'delete', 'file', ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $logId,
        $userId,
        $fileId,
        $file['name'],
        $_SERVER['REMOTE_ADDR'] ?? null
    ]);

    $response = [
        'status' => 'success',
        'message' => 'ファイルをゴミ箱に移動しました'
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Throwable $e) { // Catch Errors and Exceptions
    logDebug("ERROR: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}

function generateUUID()
{
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0xffff)
    );
}
?>