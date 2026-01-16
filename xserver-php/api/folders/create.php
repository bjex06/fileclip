<?php
/**
 * フォルダ作成API
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

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

    // 管理者のみフォルダ作成可能
    requireAdminRole($payload);

    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid JSON data');
    }

    if (!isset($input['name']) || empty(trim($input['name']))) {
        throw new Exception('フォルダ名は必須です');
    }

    $name = trim($input['name']);

    // フォルダ名検証
    $nameValidation = validateFolderName($name);
    if (!$nameValidation['isValid']) {
        throw new Exception(implode(', ', $nameValidation['errors']));
    }

    $pdo = getDatabaseConnection();

    // 同名フォルダの存在確認
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE name = ?");
    $stmt->execute([$name]);
    if ($stmt->fetch()) {
        throw new Exception('同じ名前のフォルダが既に存在します');
    }

    // トランザクション開始
    $pdo->beginTransaction();

    try {
        // フォルダID生成 (UUID)
        $folderId = sprintf(
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

        // フォルダ作成
        $stmt = $pdo->prepare("
            INSERT INTO folders (id, name, created_by, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$folderId, $name, $payload['user_id']]);

        // 権限ID生成 (UUID)
        $permissionId = sprintf(
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

        // 作成者に権限を付与
        $stmt = $pdo->prepare("
            INSERT INTO folder_permissions (id, folder_id, user_id, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$permissionId, $folderId, $payload['user_id']]);

        // ファイル保存用ディレクトリを作成
        $uploadDir = '../../uploads/' . $folderId;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $pdo->commit();

        $response = [
            'status' => 'success',
            'data' => [
                'id' => (string) $folderId,
                'name' => $name,
                'created_by' => (string) $payload['user_id'],
                'created_at' => date('Y-m-d H:i:s'),
                'folder_permissions' => [
                    ['user_id' => (string) $payload['user_id']]
                ]
            ]
        ];

        http_response_code(201);
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