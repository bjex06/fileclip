<?php
/**
 * データベース接続診断ツール（インタラクティブ版）
 */
header('Content-Type: text/html; charset=utf-8');

// デフォルト値（現在の設定）
$host = isset($_POST['host']) ? $_POST['host'] : 'localhost';
$db = isset($_POST['db']) ? $_POST['db'] : 'kohinata3_fileclip';
$user = isset($_POST['user']) ? $_POST['user'] : 'kohinata3_file';
$pass = isset($_POST['pass']) ? $_POST['pass'] : 'fileclip@001';

$message = "";
$status_class = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        $startTime = microtime(true);
        $pdo = new PDO($dsn, $user, $pass, $options);
        $endTime = microtime(true);

        $duration = round(($endTime - $startTime) * 1000, 2);

        $stmt = $pdo->query("SELECT VERSION() as v");
        $ver = $stmt->fetchColumn();

        $message = "✅ <strong>接続成功！</strong> (所要時間: {$duration}ms)<br>Server Version: {$ver}<br><br><strong>正しい設定値:</strong><br>DB_HOST: {$host}<br>DB_USER: {$user}<br>DB_PASS: [隠蔽]";
        $status_class = "success";

    } catch (PDOException $e) {
        $message = "❌ <strong>接続失敗</strong><br>" . htmlspecialchars($e->getMessage());
        $status_class = "error";
    }
}
?>
<!DOCTYPE html>
<html>

<head>
    <title>Xserver DB Connection Tester</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 600px;
            margin: 2rem auto;
            padding: 0 1rem;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
        }

        input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        button {
            background: #333;
            color: #fff;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background: #555;
        }

        .result {
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
        }

        .success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .hint {
            font-size: 0.9em;
            color: #666;
            margin-top: 0.25rem;
        }
    </style>
</head>

<body>
    <h1>データベース接続テスト</h1>

    <?php if ($message): ?>
        <div class="result <?php echo $status_class; ?>">
            <?php echo $message; ?>
        </div>
    <?php endif; ?>

    <form method="POST">
        <div class="form-group">
            <label>MySQLホスト名 (Host)</label>
            <input type="text" name="host" value="<?php echo htmlspecialchars($host); ?>" required>
            <div class="hint">ヒント: Xserverパネルの「MySQL設定」を確認してください。<br>例: mysql12345.xserver.jp (localhostは動きません)</div>
        </div>

        <div class="form-group">
            <label>データベース名 (Database)</label>
            <input type="text" name="db" value="<?php echo htmlspecialchars($db); ?>" required>
        </div>

        <div class="form-group">
            <label>ユーザー名 (User)</label>
            <input type="text" name="user" value="<?php echo htmlspecialchars($user); ?>" required>
        </div>

        <div class="form-group">
            <label>パスワード (Password)</label>
            <input type="text" name="pass" value="<?php echo htmlspecialchars($pass); ?>" required>
        </div>

        <button type="submit">接続テスト</button>
    </form>
</body>

</html>