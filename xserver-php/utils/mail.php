<?php
/**
 * メール送信ユーティリティ
 */

/**
 * ウェルカムメールを送信する
 * 
 * @param string $to 送信先メールアドレス
 * @param string $name ユーザー名
 * @param string $password パスワード
 * @return bool 送信成功ならtrue
 */
function sendWelcomeEmail($to, $name, $password)
{
    // 言語と文字コードの設定
    mb_language("Japanese");
    mb_internal_encoding("UTF-8");

    // システム名を定義（必要に応じて定数化）
    $systemName = "FileClip"; // Defaulting to FileClip based on directory name, will confirm with grep result if different.

    $subject = "【{$systemName}】アカウント作成のお知らせ";

    $message = "{$name} 様\n\n";
    $message .= "{$systemName}へのご登録ありがとうございます。\n";
    $message .= "以下の情報でログインしてください。\n\n";
    $message .= "──────────────────────\n";
    $message .= "■ログインURL\n";
    $message .= "https://kohinata3.xsrv.jp/\n\n";
    $message .= "■メールアドレス\n";
    $message .= "{$to}\n\n";
    $message .= "■パスワード\n";
    $message .= "{$password}\n";
    $message .= "──────────────────────\n\n";
    $message .= "※セキュリティのため、ログイン後にパスワードを変更することをお勧めします。\n";
    $message .= "※お心当たりのない場合は、本メールを破棄してください。\n\n";
    $message .= "--------------------------------------------------\n";
    $message .= "{$systemName} システム\n";
    $message .= "--------------------------------------------------";

    // ヘッダー設定
    $fromName = $systemName;
    $fromEmail = "no-reply@kohinata3.xsrv.jp";

    // mb_encode_mimeheaderでヘッダーをエンコード
    $encodedFromName = mb_encode_mimeheader($fromName, "ISO-2022-JP", "UTF-8");
    $headers = "From: {$encodedFromName} <{$fromEmail}>\n";
    $headers .= "Reply-To: {$fromEmail}\n";
    $headers .= "Content-Type: text/plain; charset=ISO-2022-JP"; // Explicitly match mb_send_mail default

    // 送信実行 (mb_send_mailはmb_language("Japanese")下でISO-2022-JPに変換して送る)
    return mb_send_mail($to, $subject, $message, $headers);
}

/**
 * パスワード変更通知メールを送信する（ユーザー自身による変更）
 */
function sendPasswordChangeEmail($to, $name)
{
    mb_language("Japanese");
    mb_internal_encoding("UTF-8");

    $systemName = "FileClip";
    $subject = "【{$systemName}】パスワード変更のお知らせ";

    $message = "{$name} 様\n\n";
    $message .= "{$systemName}のアカウントのパスワードが変更されました。\n\n";
    $message .= "もしご自身で変更されていない場合は、速やかに管理者にご連絡ください。\n\n";
    $message .= "--------------------------------------------------\n";
    $message .= "{$systemName} システム\n";
    $message .= "--------------------------------------------------";

    $fromName = $systemName;
    $fromEmail = "no-reply@kohinata3.xsrv.jp";
    $encodedFromName = mb_encode_mimeheader($fromName, "ISO-2022-JP", "UTF-8");
    $headers = "From: {$encodedFromName} <{$fromEmail}>\n";
    $headers .= "Reply-To: {$fromEmail}\n";
    $headers .= "Content-Type: text/plain; charset=ISO-2022-JP";

    return mb_send_mail($to, $subject, $message, $headers);
}

/**
 * パスワードリセットメールを送信する
 */
function sendPasswordResetEmail($to, $name, $tempPassword)
{
    mb_language("Japanese");
    mb_internal_encoding("UTF-8");

    $systemName = "FileClip";
    $subject = "【{$systemName}】パスワードリセットのお知らせ";

    $message = "{$name} 様\n\n";
    $message .= "{$systemName}のパスワードリセットを受け付けました。\n";
    $message .= "以下の仮パスワードでログインしてください。\n\n";
    $message .= "──────────────────────\n";
    $message .= "■仮パスワード\n";
    $message .= "{$tempPassword}\n";
    $message .= "──────────────────────\n\n";
    $message .= "※ログイン後、必ずパスワードを変更してください。\n\n";
    $message .= "--------------------------------------------------\n";
    $message .= "{$systemName} システム\n";
    $message .= "--------------------------------------------------";

    $fromName = $systemName;
    $fromEmail = "no-reply@kohinata3.xsrv.jp";
    $encodedFromName = mb_encode_mimeheader($fromName, "ISO-2022-JP", "UTF-8");
    $headers = "From: {$encodedFromName} <{$fromEmail}>\n";
    $headers .= "Reply-To: {$fromEmail}\n";
    $headers .= "Content-Type: text/plain; charset=ISO-2022-JP";

    return mb_send_mail($to, $subject, $message, $headers);
}

/**
 * 管理者によるパスワード変更通知メールを送信する
 */
function sendAdminPasswordUpdateEmail($to, $name, $newPassword)
{
    mb_language("Japanese");
    mb_internal_encoding("UTF-8");

    $systemName = "FileClip";
    $subject = "【{$systemName}】パスワード変更のお知らせ（管理者操作）";

    $message = "{$name} 様\n\n";
    $message .= "管理者により、{$systemName}のアカウントのパスワードが変更されました。\n";
    $message .= "以下の新しいパスワードでログインしてください。\n\n";
    $message .= "──────────────────────\n";
    $message .= "■新しいパスワード\n";
    $message .= "{$newPassword}\n";
    $message .= "──────────────────────\n\n";
    $message .= "※セキュリティのため、ログイン後にパスワードを変更することをお勧めします。\n\n";
    $message .= "--------------------------------------------------\n";
    $message .= "{$systemName} システム\n";
    $message .= "--------------------------------------------------";

    $fromName = $systemName;
    $fromEmail = "no-reply@kohinata3.xsrv.jp";
    $encodedFromName = mb_encode_mimeheader($fromName, "ISO-2022-JP", "UTF-8");
    $headers = "From: {$encodedFromName} <{$fromEmail}>\n";
    $headers .= "Reply-To: {$fromEmail}\n";
    $headers .= "Content-Type: text/plain; charset=ISO-2022-JP";

    return mb_send_mail($to, $subject, $message, $headers);
}
?>