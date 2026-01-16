<?php
header('Content-Type: text/plain; charset=utf-8');

// auth.php で使用しているログファイルパス
// auth.php で使用しているログファイルパス
$logFile = sys_get_temp_dir() . '/kohinata3_debug_list.log';

echo "=== AUTH DEBUG LOG ({$logFile}) ===\n";
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "Log file not found at {$logFile}\n";
    echo "Current Temp Dir: " . sys_get_temp_dir() . "\n";
}

echo "\n\n=== PHP INFO (Limited) ===\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
?>