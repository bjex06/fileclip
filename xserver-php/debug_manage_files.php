<?php
require_once 'config/database.php';
require_once 'utils/auth.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_id'])) {
    $fileId = $_POST['delete_id'];
    try {
        $pdo = getDatabaseConnection();

        // 元のファイルパスを取得
        $stmt = $pdo->prepare("SELECT storage_path FROM files WHERE id = ?");
        $stmt->execute([$fileId]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);

        // DBから削除
        $delStmt = $pdo->prepare("DELETE FROM files WHERE id = ?");
        $delStmt->execute([$fileId]);

        // 物理削除
        if ($file && $file['storage_path']) {
            $path = 'uploads/' . $file['storage_path'];
            if (file_exists($path)) {
                if (unlink($path)) {
                    $message = "ID: $fileId (DB削除 + ファイル削除成功)";
                } else {
                    $message = "ID: $fileId (DB削除成功, ファイル削除失敗)";
                }
            } else {
                $message = "ID: $fileId (DB削除成功, ファイル元々なし)";
            }
        } else {
            $message = "ID: $fileId (DB削除成功)";
        }

    } catch (Exception $e) {
        $message = "エラー: " . $e->getMessage();
    }
}

// ファイル一覧取得
try {
    $pdo = getDatabaseConnection();
    $sql = "
        SELECT f.id, f.name, f.type, f.size, f.created_at, fol.name as folder_name, f.storage_path
        FROM files f
        LEFT JOIN folders fol ON f.folder_id = fol.id
        ORDER BY f.created_at DESC
        LIMIT 100
    ";
    $files = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    die("DB Error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <title>ファイル管理ツール (デバッグ用)</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }

        td,
        th {
            border: 1px solid #ccc;
            padding: 6px;
            font-size: 12px;
        }

        .error {
            color: red;
            font-weight: bold;
        }

        .success {
            color: green;
        }

        body {
            font-family: sans-serif;
        }
    </style>
</head>

<body>
    <h1>ファイル管理ツール (デバッグ用)</h1>
    <?php if ($message): ?>
        <p style="font-weight:bold; color: blue; background: #eef; padding: 10px;"><?php echo htmlspecialchars($message); ?>
        </p>
    <?php endif; ?>

    <p>プレビューできない破損ファイルや、削除できないファイルを強制的に削除できます。</p>

    <table>
        <tr style="background: #eee;">
            <th>ID</th>
            <th>ファイル名</th>
            <th>フォルダ</th>
            <th>形式</th>
            <th>DBサイズ</th>
            <th>実サイズ</th>
            <th>状態</th>
            <th>操作</th>
        </tr>
        <?php foreach ($files as $file): ?>
            <?php
            $realPath = 'uploads/' . $file['storage_path'];
            $exists = file_exists($realPath);
            $realSize = $exists ? filesize($realPath) : -1;

            $status = '';
            $rowStyle = '';

            if (!$exists) {
                $status = '消失 (実体なし)';
                $rowStyle = 'background-color: #ffcccc;'; // Redish
            } elseif ($realSize != $file['size']) {
                $status = 'サイズ不一致';
                $rowStyle = 'background-color: #ffeebb;'; // Yellowish
            } elseif ($realSize < 100) {
                $status = '破損の可能性 (容量過小)';
                $rowStyle = 'background-color: #fff8e1;';
            } else {
                $status = '正常';
            }
            ?>
            <tr style="<?php echo $rowStyle; ?>">
                <td><?php echo htmlspecialchars($file['id']); ?></td>
                <td><?php echo htmlspecialchars($file['name']); ?></td>
                <td><?php echo htmlspecialchars($file['folder_name'] ?? 'ルート/不明'); ?></td>
                <td><?php echo htmlspecialchars($file['type']); ?></td>
                <td><?php echo number_format($file['size']); ?></td>
                <td><?php echo $exists ? number_format($realSize) : 'なし'; ?></td>
                <td class="<?php echo ($status === '正常') ? 'success' : 'error'; ?>"><?php echo $status; ?></td>
                <td>
                    <a href="api/files/download.php?file_id=<?php echo htmlspecialchars($file['id']); ?>&token=<?php echo 'debug_token_bypass'; // Note: download.php requires valid token usually. We might need a valid token or temporarily bypass auth in download.php for debug. ?? No, let's just use the file_id and assume the user has a session or we need to generate a token. wait. auth.php checks headers or GET token.
                           // authenticating request in download.php is strict.
                           // For debug tool, we can't easily generate a valid jwt without secret.
                           // BUT, the user is logged in to the app? No, this tool is standalone.
                           // Let's rely on the fact that if they are using the tool, they might not have the token param.
                           // Actually, let's just print the link and tell them it might fail if not authenticated?
                           // Better: The User session is in the browser. But this php tool is separate.
                           // Let's Try: Just link to download.php. If it returns 401, we know it's auth.
                           // Actually, I can allow a special debug bypass in auth.php or download.php? No, security risk.
                           // Let's just add the link. If it fails with 400/401, we see it.
                           echo htmlspecialchars($file['id']); ?>" target="_blank">Download</a>
                </td>
                <td style="text-align: center;">
                    <form method="post" onsubmit="return confirm('【警告】\n本当にこのファイルを強制削除してもよろしいですか？\n復元はできません。');">
                        <input type="hidden" name="delete_id" value="<?php echo htmlspecialchars($file['id']); ?>">
                        <button type="submit"
                            style="color:white; background-color:#d32f2f; border:none; padding:5px 10px; cursor:pointer; border-radius: 4px;">強制削除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
    </table>
</body>

</html>