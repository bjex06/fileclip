<?php
/**
 * 認証ユーティリティ関数
 */

// JWT設定
define('JWT_SECRET', 'your-secret-key-change-this-in-production');
define('JWT_ALGORITHM', 'HS256');

/**
 * JWTトークンを生成
 */
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]);
    $payload = json_encode($payload);
    
    $headerEncoded = base64urlEncode($header);
    $payloadEncoded = base64urlEncode($payload);
    
    $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    $signatureEncoded = base64urlEncode($signature);
    
    return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
}

/**
 * JWTトークンを検証
 */
function verifyJWT($token) {
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return false;
    }
    
    [$headerEncoded, $payloadEncoded, $signatureEncoded] = $parts;
    
    // 署名を検証
    $signature = base64urlDecode($signatureEncoded);
    $expectedSignature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, JWT_SECRET, true);
    
    if (!hash_equals($expectedSignature, $signature)) {
        return false;
    }
    
    // ペイロードをデコード
    $payload = json_decode(base64urlDecode($payloadEncoded), true);
    
    // 有効期限チェック
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

/**
 * Base64 URL エンコード
 */
function base64urlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64 URL デコード
 */
function base64urlDecode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

/**
 * API認証チェック
 */
function authenticateRequest() {
    $headers = getallheaders();
    
    // Authorizationヘッダーからトークンを取得
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Missing or invalid authorization header']);
        exit();
    }
    
    $token = $matches[1];
    $payload = verifyJWT($token);
    
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit();
    }
    
    return $payload;
}

/**
 * 管理者権限チェック
 */
function requireAdminRole($userPayload) {
    if ($userPayload['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Admin privileges required']);
        exit();
    }
}

/**
 * ログイン試行制限チェック
 */
function isLoginAttemptLimited($identifier) {
    $logFile = '../logs/login_attempts.log';
    
    if (!file_exists($logFile)) {
        return false;
    }
    
    $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $recentAttempts = [];
    $timeLimit = time() - (30 * 60); // 30分前
    
    // 最近の試行を取得
    foreach (array_reverse($lines) as $line) {
        if (preg_match('/\[(.*?)\] FAILED - (.*?) from/', $line, $matches)) {
            $timestamp = strtotime($matches[1]);
            $attemptIdentifier = $matches[2];
            
            if ($timestamp < $timeLimit) {
                break;
            }
            
            if ($attemptIdentifier === $identifier) {
                $recentAttempts[] = $timestamp;
            }
        }
    }
    
    return count($recentAttempts) >= 5;
}

/**
 * パスワード強度チェック
 */
function validatePasswordStrength($password) {
    $errors = [];
    
    if (strlen($password) < 8) {
        $errors[] = 'パスワードは8文字以上である必要があります';
    }
    
    if (!preg_match('/[A-Z]/', $password)) {
        $errors[] = '大文字を含む必要があります';
    }
    
    if (!preg_match('/[a-z]/', $password)) {
        $errors[] = '小文字を含む必要があります';
    }
    
    if (!preg_match('/\d/', $password)) {
        $errors[] = '数字を含む必要があります';
    }
    
    if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) {
        $errors[] = '特殊文字を含む必要があります';
    }
    
    return [
        'isValid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * メールアドレス検証
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * セキュアなランダムパスワード生成
 */
function generateSecurePassword($length = 12) {
    $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $lowercase = 'abcdefghijklmnopqrstuvwxyz';
    $numbers = '0123456789';
    $special = '!@#$%^&*';
    
    $password = '';
    
    // 各文字種を最低1文字含む
    $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
    $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
    $password .= $numbers[random_int(0, strlen($numbers) - 1)];
    $password .= $special[random_int(0, strlen($special) - 1)];
    
    // 残りの文字をランダムに追加
    $allChars = $uppercase . $lowercase . $numbers . $special;
    for ($i = 4; $i < $length; $i++) {
        $password .= $allChars[random_int(0, strlen($allChars) - 1)];
    }
    
    // パスワードをシャッフル
    return str_shuffle($password);
}
?>
