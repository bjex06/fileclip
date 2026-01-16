<?php
/**
 * 共有リンクからのダウンロードAPI（公開アクセス可能）
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

try {
    // トークン取得
    $token = $_GET['token'] ?? null;
    $password = $_GET['password'] ?? null;

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $token = $input['token'] ?? $token;
        $password = $input['password'] ?? $password;
    }

    if (!$token) {
        throw new Exception('トークンが必要です');
    }

    $pdo = getDatabaseConnection();

    // 共有リンク取得
    $stmt = $pdo->prepare("SELECT * FROM share_links WHERE token = ?");
    $stmt->execute([$token]);
    $shareLink = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$shareLink) {
        throw new Exception('共有リンクが見つかりません');
    }

    // 有効性チェック
    if (!$shareLink['is_active']) {
        throw new Exception('この共有リンクは無効になっています');
    }

    // 有効期限チェック
    if ($shareLink['expires_at'] && strtotime($shareLink['expires_at']) < time()) {
        throw new Exception('この共有リンクは有効期限が切れています');
    }

    // ダウンロード回数制限チェック
    if ($shareLink['max_downloads'] && $shareLink['download_count'] >= $shareLink['max_downloads']) {
        throw new Exception('この共有リンクはダウンロード回数の上限に達しました');
    }

    // パスワードチェック
    if ($shareLink['password_hash']) {
        if (!$password) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'error' => 'パスワードが必要です',
                'requires_password' => true
            ]);
            exit();
        }

        if (!password_verify($password, $shareLink['password_hash'])) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode([
                'status' => 'error',
                'error' => 'パスワードが正しくありません'
            ]);
            exit();
        }
    }

    // ファイルのみダウンロード可能（フォルダは現時点では非対応）
    if ($shareLink['resource_type'] !== 'file') {
        throw new Exception('フォルダのダウンロードは現在サポートされていません');
    }

    // ファイル情報取得
    $stmt = $pdo->prepare("SELECT * FROM files WHERE id = ? AND is_deleted = FALSE");
    $stmt->execute([$shareLink['resource_id']]);
    $file = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$file) {
        throw new Exception('ファイルが見つかりません');
    }

    // ファイルパス
    $filePath = '../../uploads/' . $file['storage_path'];

    if (!file_exists($filePath)) {
        throw new Exception('ファイルが存在しません');
    }

    // ダウンロード回数更新
    $stmt = $pdo->prepare("UPDATE share_links SET download_count = download_count + 1 WHERE id = ?");
    $stmt->execute([$shareLink['id']]);

    // ファイルを送信
    $mimeType = $file['type'] ?: 'application/octet-stream';
    $fileName = $file['original_name'] ?: $file['name'];

    header('Content-Type: ' . $mimeType);
    header('Content-Disposition: attachment; filename="' . rawurlencode($fileName) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: 0');

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
