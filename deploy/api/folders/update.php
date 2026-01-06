<?php
/**
 * フォルダ更新（名前変更）API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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
    
    // 管理者のみフォルダ更新可能
    requireAdminRole($payload);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON data');
    }
    
    if (!isset($input['folder_id']) || !isset($input['name'])) {
        throw new Exception('フォルダIDと新しい名前は必須です');
    }
    
    $folderId = $input['folder_id'];
    $name = trim($input['name']);
    
    if (!isValidId($folderId)) {
        throw new Exception('無効なフォルダIDです');
    }
    
    // フォルダ名検証
    $nameValidation = validateFolderName($name);
    if (!$nameValidation['isValid']) {
        throw new Exception(implode(', ', $nameValidation['errors']));
    }
    
    $pdo = getDatabaseConnection();
    
    // フォルダ存在確認
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    if (!$stmt->fetch()) {
        throw new Exception('フォルダが見つかりません');
    }
    
    // 同名フォルダの存在確認（自分自身は除く）
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE name = ? AND id != ?");
    $stmt->execute([$name, $folderId]);
    if ($stmt->fetch()) {
        throw new Exception('同じ名前のフォルダが既に存在します');
    }
    
    // フォルダ名を更新
    $stmt = $pdo->prepare("UPDATE folders SET name = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$name, $folderId]);
    
    $response = [
        'status' => 'success',
        'message' => 'フォルダ名を更新しました',
        'data' => [
            'id' => (string)$folderId,
            'name' => $name
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
?>
