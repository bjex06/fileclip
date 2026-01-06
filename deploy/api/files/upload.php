<?php
/**
 * ファイルアップロードAPI
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
    
    // フォルダID取得
    $folderId = isset($_POST['folder_id']) ? $_POST['folder_id'] : null;
    
    if (!$folderId) {
        throw new Exception('フォルダIDは必須です');
    }
    
    if (!isValidId($folderId)) {
        throw new Exception('無効なフォルダIDです');
    }
    
    $pdo = getDatabaseConnection();
    
    // フォルダ存在確認
    $stmt = $pdo->prepare("SELECT id FROM folders WHERE id = ?");
    $stmt->execute([$folderId]);
    if (!$stmt->fetch()) {
        throw new Exception('フォルダが見つかりません');
    }
    
    // 権限チェック（管理者以外）
    if (!$isAdmin) {
        $stmt = $pdo->prepare("
            SELECT 1 FROM folder_permissions WHERE folder_id = ? AND user_id = ?
        ");
        $stmt->execute([$folderId, $userId]);
        if (!$stmt->fetch()) {
            throw new Exception('このフォルダへのアップロード権限がありません');
        }
    }
    
    // ファイルアップロード処理
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'ファイルサイズがサーバーの制限を超えています',
            UPLOAD_ERR_FORM_SIZE => 'ファイルサイズがフォームの制限を超えています',
            UPLOAD_ERR_PARTIAL => 'ファイルが部分的にしかアップロードされませんでした',
            UPLOAD_ERR_NO_FILE => 'ファイルがアップロードされていません',
            UPLOAD_ERR_NO_TMP_DIR => '一時フォルダが見つかりません',
            UPLOAD_ERR_CANT_WRITE => 'ファイルの書き込みに失敗しました',
            UPLOAD_ERR_EXTENSION => '拡張機能によりアップロードが中止されました',
        ];
        
        $errorCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        $errorMessage = $errorMessages[$errorCode] ?? 'ファイルのアップロードに失敗しました';
        
        throw new Exception($errorMessage);
    }
    
    $file = $_FILES['file'];
    $originalName = $file['name'];
    $tmpPath = $file['tmp_name'];
    $fileSize = $file['size'];
    $mimeType = $file['type'];
    
    // ファイル名検証
    $nameValidation = validateFileName($originalName);
    if (!$nameValidation['isValid']) {
        throw new Exception(implode(', ', $nameValidation['errors']));
    }
    
    // 拡張子取得
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    
    // ファイルタイプ検証
    $typeValidation = validateFileType($mimeType, $extension);
    if (!$typeValidation['isValid']) {
        throw new Exception($typeValidation['error']);
    }
    
    // ファイルサイズ検証（50MB制限）
    $sizeValidation = validateFileSize($fileSize);
    if (!$sizeValidation['isValid']) {
        throw new Exception($sizeValidation['error']);
    }
    
    // アップロードディレクトリ
    $uploadDir = '../../uploads/' . $folderId;
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // ユニークなファイル名を生成
    $storageName = time() . '_' . uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
    $storagePath = $folderId . '/' . $storageName;
    $fullPath = $uploadDir . '/' . $storageName;
    
    // ファイルを移動
    if (!move_uploaded_file($tmpPath, $fullPath)) {
        throw new Exception('ファイルの保存に失敗しました');
    }
    
    // データベースに登録
    $stmt = $pdo->prepare("
        INSERT INTO files (name, type, size, folder_id, created_by, storage_path, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $originalName,
        $typeValidation['type'],
        $fileSize,
        $folderId,
        $userId,
        $storagePath
    ]);
    
    $fileId = $pdo->lastInsertId();
    
    $response = [
        'status' => 'success',
        'message' => 'ファイルをアップロードしました',
        'data' => [
            'id' => (string)$fileId,
            'name' => $originalName,
            'type' => $typeValidation['type'],
            'size' => $fileSize,
            'folder_id' => (string)$folderId,
            'created_by' => (string)$userId,
            'storage_path' => $storagePath,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];
    
    http_response_code(201);
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
