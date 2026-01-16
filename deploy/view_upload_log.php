<?php
header('Content-Type: text/plain; charset=utf-8');

$logPaths = [
    'upload_debug.txt',
    './upload_debug.txt'
];

$found = false;
foreach ($logPaths as $path) {
    if (file_exists($path)) {
        echo "Found Log at: $path\n\n";
        readfile($path);
        $found = true;
        break;
    }
}

if (!$found) {
    echo "ログファイルが見つかりません。検索パス: " . implode(', ', $logPaths);
}
?>