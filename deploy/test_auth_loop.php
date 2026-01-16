<?php
header('Content-Type: text/plain');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'utils/auth.php';

echo "Testing authenticateRequest logic...\n";

// Mock Environment
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/test_auth_loop.php';

try {
    echo "Calling authenticateRequest()...\n";
    // This should fail with 401 and exit, but we want to see if it logs first
    $user = authenticateRequest();
    echo "Success? " . print_r($user, true);
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage();
}
?>