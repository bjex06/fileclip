<?php
/**
 * バリデーションユーティリティ関数
 */

/**
 * 必須フィールドの検証
 * @param array $data 検証対象データ
 * @param array $requiredFields 必須フィールド名の配列
 * @return array ['isValid' => bool, 'errors' => array]
 */
function validateRequiredFields($data, $requiredFields)
{
    $errors = [];

    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            $errors[] = "{$field}は必須項目です";
        }
    }

    return [
        'isValid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * メールアドレスの検証
 * @param string $email
 * @return bool
 */
function isValidEmail($email)
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * パスワード強度の検証
 * @param string $password
 * @return array ['isValid' => bool, 'errors' => array]
 */
function validatePassword($password)
{
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
 * ユーザー名の検証
 * @param string $name
 * @return array ['isValid' => bool, 'errors' => array]
 */
function validateUsername($name)
{
    $errors = [];

    $name = trim($name);

    if (strlen($name) < 2) {
        $errors[] = '名前は2文字以上で入力してください';
    }

    if (strlen($name) > 100) {
        $errors[] = '名前は100文字以内で入力してください';
    }

    // 特殊文字のチェック（基本的なサニタイズ）
    if (preg_match('/[<>"\']/', $name)) {
        $errors[] = '名前に使用できない文字が含まれています';
    }

    return [
        'isValid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * フォルダ名の検証
 * @param string $name
 * @return array ['isValid' => bool, 'errors' => array]
 */
function validateFolderName($name)
{
    $errors = [];

    $name = trim($name);

    if (strlen($name) < 1) {
        $errors[] = 'フォルダ名を入力してください';
    }

    if (strlen($name) > 255) {
        $errors[] = 'フォルダ名は255文字以内で入力してください';
    }

    // 禁止文字のチェック
    if (preg_match('/[\\\\\/\:\*\?\"\<\>\|]/', $name)) {
        $errors[] = 'フォルダ名に使用できない文字が含まれています';
    }

    return [
        'isValid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * ファイル名の検証
 * @param string $name
 * @return array ['isValid' => bool, 'errors' => array]
 */
function validateFileName($name)
{
    $errors = [];

    $name = trim($name);

    if (strlen($name) < 1) {
        $errors[] = 'ファイル名を入力してください';
    }

    if (strlen($name) > 255) {
        $errors[] = 'ファイル名は255文字以内で入力してください';
    }

    // 禁止文字のチェック
    if (preg_match('/[\\\\\/\:\*\?\"\<\>\|]/', $name)) {
        $errors[] = 'ファイル名に使用できない文字が含まれています';
    }

    return [
        'isValid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * ファイルタイプの検証
 * @param string $mimeType
 * @param string $extension
 * @return array ['isValid' => bool, 'type' => string, 'error' => string|null]
 */
function validateFileType($mimeType, $extension)
{
    // 許可されるファイルタイプ
    $allowedTypes = [
        // PDF
        'application/pdf' => 'pdf',
        // Word
        'application/msword' => 'word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'word',
        // Excel
        'application/vnd.ms-excel' => 'excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'excel',
        // PowerPoint
        'application/vnd.ms-powerpoint' => 'powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'powerpoint',
        // 画像
        'image/jpeg' => 'image',
        'image/png' => 'image',
        'image/gif' => 'image',
        'image/webp' => 'image',
        // 動画
        'video/mp4' => 'video',
        'video/quicktime' => 'video',
        'video/x-msvideo' => 'video',
        'video/x-ms-wmv' => 'video',
        'video/x-flv' => 'video',
        'video/x-matroska' => 'video',
        // テキスト
        'text/plain' => 'text',
        'text/csv' => 'text',
        // ZIP
        'application/zip' => 'archive',
        'application/x-zip-compressed' => 'archive',
    ];

    // 拡張子による追加チェック
    $allowedExtensions = [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'mp4',
        'mov',
        'avi',
        'wmv',
        'flv',
        'mkv',
        'txt',
        'csv',
        'zip'
    ];

    $extension = strtolower($extension);

    if (!in_array($extension, $allowedExtensions)) {
        return [
            'isValid' => false,
            'type' => null,
            'error' => '許可されていないファイル形式です'
        ];
    }

    // MIMEタイプからファイルタイプを判定
    $fileType = $allowedTypes[$mimeType] ?? null;

    if (!$fileType) {
        // 拡張子からファイルタイプを推定
        $extensionTypes = [
            'pdf' => 'pdf',
            'doc' => 'word',
            'docx' => 'word',
            'xls' => 'excel',
            'xlsx' => 'excel',
            'ppt' => 'powerpoint',
            'pptx' => 'powerpoint',
            'jpg' => 'image',
            'jpeg' => 'image',
            'png' => 'image',
            'gif' => 'image',
            'webp' => 'image',
            'mp4' => 'video',
            'mov' => 'video',
            'avi' => 'video',
            'wmv' => 'video',
            'flv' => 'video',
            'mkv' => 'video',
            'txt' => 'text',
            'csv' => 'text',
            'zip' => 'archive'
        ];

        $fileType = $extensionTypes[$extension] ?? 'other';
    }

    return [
        'isValid' => true,
        'type' => $fileType,
        'error' => null
    ];
}

/**
 * ファイルサイズの検証
 * @param int $size バイト単位のサイズ
 * @param int $maxSize 最大サイズ（バイト）デフォルト50MB
 * @return array ['isValid' => bool, 'error' => string|null]
 */
function validateFileSize($size, $maxSize = 52428800)
{
    if ($size > $maxSize) {
        $maxMB = round($maxSize / 1024 / 1024);
        return [
            'isValid' => false,
            'error' => "ファイルサイズは{$maxMB}MB以下にしてください"
        ];
    }

    return [
        'isValid' => true,
        'error' => null
    ];
}

/**
 * IDの検証（整数）
 * @param mixed $id
 * @return bool
 */
function isValidId($id)
{
    return (is_numeric($id) && intval($id) > 0) || isValidUuid($id);
}

/**
 * UUIDの検証
 * @param string $uuid
 * @return bool
 */
function isValidUuid($uuid)
{
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uuid) === 1;
}

/**
 * 入力データのサニタイズ
 * @param string $data
 * @return string
 */
function sanitizeInput($data)
{
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * SQLインジェクション対策用のエスケープ
 * （PDOのプリペアドステートメントを使用する場合は不要だが、念のため）
 * @param PDO $pdo
 * @param string $data
 * @return string
 */
function escapeForSql($pdo, $data)
{
    return $pdo->quote($data);
}