<?php
/**
 * Xserver用ファイルマネージャー API
 * 認証エンドポイント - ログイン
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token, X-FileClip-Auth');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// POSTメソッドのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// データベース接続設定
require_once '../../config/database.php';
require_once '../../utils/auth.php';
require_once '../../utils/validation.php';

try {
    // リクエストデータの取得
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON data');
    }

    // 必須フィールドの検証
    $required_fields = ['email_or_name', 'password'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            throw new Exception("Missing required field: {$field}");
        }
    }

    $emailOrName = trim($input['email_or_name']);
    $password = $input['password'];

    // レート制限チェック
    if (isLoginAttemptLimited($emailOrName)) {
        throw new Exception('Too many login attempts. Please try again later.');
    }

    // データベース接続
    $pdo = getDatabaseConnection();

    // ユーザー検索（メールまたは名前）
    $sql = "SELECT id, email, name, password_hash, role, is_active, failed_attempts, last_attempt_at 
            FROM users 
            WHERE (email = :email OR name = :name) 
            AND is_active = 1 
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':email', $emailOrName);
    $stmt->bindValue(':name', $emailOrName);
    $stmt->execute();

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // ログイン試行回数を記録
        recordLoginAttempt($emailOrName, false);
        throw new Exception('Invalid credentials');
    }

    // パスワード検証
    if (!password_verify($password, $user['password_hash'])) {
        // ログイン試行回数を記録
        recordLoginAttempt($emailOrName, false);
        updateFailedAttempts($pdo, $user['id'], true);
        throw new Exception('Invalid credentials');
    }

    // アカウントロック状態確認
    if (isAccountLocked($user)) {
        throw new Exception('Account is temporarily locked due to multiple failed attempts');
    }

    // ログイン成功処理
    recordLoginAttempt($emailOrName, true);
    updateFailedAttempts($pdo, $user['id'], false);
    updateLastLogin($pdo, $user['id']);

    // JWTトークン生成
    $tokenData = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => trim($user['role']), // 空白除去
        'exp' => time() + (24 * 60 * 60) // 24時間後に期限切れ
    ];

    $token = generateJWT($tokenData);

    // レスポンス
    $response = [
        'status' => 'success',
        'data' => [
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => trim($user['role']), // 空白除去
                'is_active' => (bool) $user['is_active']
            ],
            'token' => $token
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

/**
 * ログイン試行回数の記録
 */
function recordLoginAttempt($identifier, $success)
{
    $logDir = '../../logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $file = $logDir . '/login_attempts.log';
    $timestamp = date('Y-m-d H:i:s');
    $status = $success ? 'SUCCESS' : 'FAILED';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    $logEntry = "[{$timestamp}] {$status} - {$identifier} from {$ip}\n";
    file_put_contents($file, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * 失敗試行回数の更新
 */
function updateFailedAttempts($pdo, $userId, $increment)
{
    if ($increment) {
        $sql = "UPDATE users 
                SET failed_attempts = failed_attempts + 1, 
                    last_attempt_at = NOW() 
                WHERE id = :user_id";
    } else {
        $sql = "UPDATE users 
                SET failed_attempts = 0, 
                    last_attempt_at = NULL 
                WHERE id = :user_id";
    }

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
}

/**
 * 最終ログイン時刻の更新
 */
function updateLastLogin($pdo, $userId)
{
    $sql = "UPDATE users SET last_login_at = NOW() WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
}

/**
 * アカウントロック状態の確認
 */
function isAccountLocked($user)
{
    if ($user['failed_attempts'] < 5) {
        return false;
    }

    if (!$user['last_attempt_at']) {
        return false;
    }

    $lockoutTime = 30 * 60; // 30分
    $lastAttempt = strtotime($user['last_attempt_at']);
    $now = time();

    return ($now - $lastAttempt) < $lockoutTime;
}
?>