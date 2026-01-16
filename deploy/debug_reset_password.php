<?php
require_once 'config/database.php';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = $_POST['user_id'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';

    if ($userId && $newPassword) {
        try {
            $pdo = getDatabaseConnection();
            $hash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$hash, $userId]);
            $message = "User ID {$userId} のパスワードを更新しました。";
        } catch (Exception $e) {
            $message = "エラー: " . $e->getMessage();
        }
    } else {
        $message = "IDとパスワードを入力してください。";
    }
}
?>
<!DOCTYPE html>
<html>

<head>
    <title>Debug Password Reset</title>
</head>

<body>
    <h1>パスワードリセットツール (デバッグ用)</h1>
    <?php if ($message): ?>
        <p style="color: red;">
            <?php echo htmlspecialchars($message); ?>
        </p>
    <?php endif; ?>

    <form method="post">
        <div>
            <label>ユーザーID (User ID):</label><br>
            <input type="number" name="user_id" required>
        </div>
        <br>
        <div>
            <label>新しいパスワード (New Password):</label><br>
            <input type="text" name="new_password" required value="Password123">
        </div>
        <br>
        <button type="submit">パスワード変更</button>
    </form>

    <h2>ユーザー一覧 (参考)</h2>
    <iframe src="debug_user_list.php" width="100%" height="400"></iframe>
</body>

</html>