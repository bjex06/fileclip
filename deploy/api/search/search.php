<?php
/**
 * 検索API - ファイルとフォルダを検索
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token, X-Auth-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

require_once '../../config/database.php';
require_once '../../utils/auth.php';

try {
    // 認証チェック
    $payload = authenticateRequest();

    $userId = $payload['user_id'];
    // super_admin または admin を管理者として扱う
    $userRole = $payload['role'];
    $isAdmin = ($userRole === 'super_admin' || $userRole === 'admin');

    // パラメータ取得
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
    } else {
        $input = $_GET;
    }

    $query = $input['query'] ?? '';
    $type = $input['type'] ?? 'all'; // all, files, folders
    $fileType = $input['file_type'] ?? null; // image, document, video, audio, etc.
    $extensions = isset($input['extensions']) ? (is_array($input['extensions']) ? $input['extensions'] : explode(',', $input['extensions'])) : [];
    $minSize = isset($input['min_size']) ? (int) $input['min_size'] : null;
    $maxSize = isset($input['max_size']) ? (int) $input['max_size'] : null;
    $dateFrom = $input['date_from'] ?? null;
    $dateTo = $input['date_to'] ?? null;
    $folderId = $input['folder_id'] ?? null;
    $sortBy = $input['sort_by'] ?? 'created_at'; // name, size, created_at, type
    $sortOrder = strtoupper($input['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
    $limit = min((int) ($input['limit'] ?? 50), 100);
    $offset = (int) ($input['offset'] ?? 0);

    $pdo = getDatabaseConnection();
    $results = [
        'files' => [],
        'folders' => []
    ];

    // ファイルタイプのMIMEマッピング
    $fileTypeMapping = [
        'image' => ['image/%'],
        'document' => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats%', 'text/%'],
        'video' => ['video/%'],
        'audio' => ['audio/%'],
        'archive' => ['application/zip', 'application/x-rar%', 'application/x-7z%', 'application/gzip', 'application/x-tar']
    ];

    // ファイル検索
    if ($type === 'all' || $type === 'files') {
        $fileParams = [];
        $fileConditions = ['f.is_deleted = FALSE'];

        // クエリ検索
        if ($query) {
            $fileConditions[] = 'f.name LIKE ?';
            $fileParams[] = '%' . $query . '%';
        }

        // フォルダ指定
        if ($folderId) {
            $fileConditions[] = 'f.folder_id = ?';
            $fileParams[] = $folderId;
        }

        // ファイルタイプフィルター
        if ($fileType && isset($fileTypeMapping[$fileType])) {
            $typeConds = [];
            foreach ($fileTypeMapping[$fileType] as $mimePattern) {
                $typeConds[] = 'f.type LIKE ?';
                $fileParams[] = $mimePattern;
            }
            $fileConditions[] = '(' . implode(' OR ', $typeConds) . ')';
        }

        // 拡張子フィルター
        if (!empty($extensions)) {
            $extConds = [];
            foreach ($extensions as $ext) {
                $extConds[] = 'f.name LIKE ?';
                $fileParams[] = '%.' . ltrim($ext, '.');
            }
            $fileConditions[] = '(' . implode(' OR ', $extConds) . ')';
        }

        // サイズフィルター
        if ($minSize !== null) {
            $fileConditions[] = 'f.size >= ?';
            $fileParams[] = $minSize;
        }
        if ($maxSize !== null) {
            $fileConditions[] = 'f.size <= ?';
            $fileParams[] = $maxSize;
        }

        // 日付フィルター
        if ($dateFrom) {
            $fileConditions[] = 'f.created_at >= ?';
            $fileParams[] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $fileConditions[] = 'f.created_at <= ?';
            $fileParams[] = $dateTo . ' 23:59:59';
        }

        // 権限チェック
        if (!$isAdmin) {
            $permissionJoin = 'INNER JOIN folder_permissions fp ON f.folder_id = fp.folder_id AND fp.user_id = ?';
            $fileParams[] = $userId;
        } else {
            $permissionJoin = '';
        }

        // ソートカラム検証
        $validSortColumns = ['name', 'size', 'created_at', 'type'];
        $sortColumn = in_array($sortBy, $validSortColumns) ? $sortBy : 'created_at';

        $fileSql = "
            SELECT f.*, u.name as creator_name,
                   fol.name as folder_name
            FROM files f
            $permissionJoin
            LEFT JOIN users u ON f.created_by = u.id
            LEFT JOIN folders fol ON f.folder_id = fol.id
            WHERE " . implode(' AND ', $fileConditions) . "
            ORDER BY f.$sortColumn $sortOrder
            LIMIT $limit OFFSET $offset
        ";

        $stmt = $pdo->prepare($fileSql);
        $stmt->execute($fileParams);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $results['files'] = array_map(function ($file) {
            return [
                'id' => (string) $file['id'],
                'name' => $file['name'],
                'type' => $file['type'],
                'size' => (int) $file['size'],
                'folder_id' => (string) $file['folder_id'],
                'folder_name' => $file['folder_name'],
                'created_by' => (string) $file['created_by'],
                'creator_name' => $file['creator_name'],
                'created_at' => $file['created_at'],
                'resource_type' => 'file'
            ];
        }, $files);
    }

    // フォルダ検索
    if ($type === 'all' || $type === 'folders') {
        $folderParams = [];
        $folderConditions = ['fol.is_deleted = FALSE'];

        // クエリ検索
        if ($query) {
            $folderConditions[] = 'fol.name LIKE ?';
            $folderParams[] = '%' . $query . '%';
        }

        // 親フォルダ指定
        if ($folderId) {
            $folderConditions[] = 'fol.parent_id = ?';
            $folderParams[] = $folderId;
        }

        // 日付フィルター
        if ($dateFrom) {
            $folderConditions[] = 'fol.created_at >= ?';
            $folderParams[] = $dateFrom . ' 00:00:00';
        }
        if ($dateTo) {
            $folderConditions[] = 'fol.created_at <= ?';
            $folderParams[] = $dateTo . ' 23:59:59';
        }

        // 権限チェック
        if (!$isAdmin) {
            $permissionJoin = 'INNER JOIN folder_permissions fp ON fol.id = fp.folder_id AND fp.user_id = ?';
            $folderParams[] = $userId;
        } else {
            $permissionJoin = '';
        }

        // ソートカラム検証（フォルダにはsizeがない）
        $validFolderSortColumns = ['name', 'created_at'];
        $folderSortColumn = in_array($sortBy, $validFolderSortColumns) ? $sortBy : 'created_at';

        $folderSql = "
            SELECT fol.*, u.name as creator_name,
                   pfol.name as parent_name
            FROM folders fol
            $permissionJoin
            LEFT JOIN users u ON fol.created_by = u.id
            LEFT JOIN folders pfol ON fol.parent_id = pfol.id
            WHERE " . implode(' AND ', $folderConditions) . "
            ORDER BY fol.$folderSortColumn $sortOrder
            LIMIT $limit OFFSET $offset
        ";

        $stmt = $pdo->prepare($folderSql);
        $stmt->execute($folderParams);
        $folders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $results['folders'] = array_map(function ($folder) {
            return [
                'id' => (string) $folder['id'],
                'name' => $folder['name'],
                'parent_id' => $folder['parent_id'] ? (string) $folder['parent_id'] : null,
                'parent_name' => $folder['parent_name'],
                'created_by' => (string) $folder['created_by'],
                'creator_name' => $folder['creator_name'],
                'created_at' => $folder['created_at'],
                'resource_type' => 'folder'
            ];
        }, $folders);
    }

    // 総件数を取得
    $totalFiles = 0;
    $totalFolders = 0;

    if ($type === 'all' || $type === 'files') {
        // ファイル総件数
        $countParams = [];
        $countConditions = ['f.is_deleted = FALSE'];

        if ($query) {
            $countConditions[] = 'f.name LIKE ?';
            $countParams[] = '%' . $query . '%';
        }

        if (!$isAdmin) {
            $countJoin = 'INNER JOIN folder_permissions fp ON f.folder_id = fp.folder_id AND fp.user_id = ?';
            $countParams[] = $userId;
        } else {
            $countJoin = '';
        }

        $countSql = "SELECT COUNT(*) FROM files f $countJoin WHERE " . implode(' AND ', $countConditions);
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($countParams);
        $totalFiles = (int) $stmt->fetchColumn();
    }

    if ($type === 'all' || $type === 'folders') {
        // フォルダ総件数
        $countParams = [];
        $countConditions = ['fol.is_deleted = FALSE'];

        if ($query) {
            $countConditions[] = 'fol.name LIKE ?';
            $countParams[] = '%' . $query . '%';
        }

        if (!$isAdmin) {
            $countJoin = 'INNER JOIN folder_permissions fp ON fol.id = fp.folder_id AND fp.user_id = ?';
            $countParams[] = $userId;
        } else {
            $countJoin = '';
        }

        $countSql = "SELECT COUNT(*) FROM folders fol $countJoin WHERE " . implode(' AND ', $countConditions);
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($countParams);
        $totalFolders = (int) $stmt->fetchColumn();
    }

    $response = [
        'status' => 'success',
        'data' => $results,
        'meta' => [
            'total_files' => $totalFiles,
            'total_folders' => $totalFolders,
            'total' => $totalFiles + $totalFolders,
            'limit' => $limit,
            'offset' => $offset,
            'query' => $query,
            'filters' => [
                'type' => $type,
                'file_type' => $fileType,
                'extensions' => $extensions,
                'min_size' => $minSize,
                'max_size' => $maxSize,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'folder_id' => $folderId
            ],
            'sort' => [
                'by' => $sortBy,
                'order' => $sortOrder
            ]
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