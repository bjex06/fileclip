<?php
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

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/auth.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON data');
    }

    if (!isset($input['email_or_name']) || !isset($input['password'])) {
        throw new Exception('Missing required fields');
    }

    $emailOrName = trim($input['email_or_name']);
    $password = $input['password'];

    $pdo = getDatabaseConnection();

    $sql = "SELECT id, email, name, password_hash, role, is_active FROM users WHERE (email = ? OR name = ?) AND is_active = 1 LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$emailOrName, $emailOrName]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception('Invalid credentials');
    }

    if (!password_verify($password, $user['password_hash'])) {
        throw new Exception('Invalid credentials');
    }

    $tokenData = [
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'exp' => time() + (24 * 60 * 60)
    ];

    $token = generateJWT($tokenData);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'user' => [
                'id' => (string)$user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role']
            ],
            'token' => $token
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'error' => $e->getMessage()]);
}
?>
