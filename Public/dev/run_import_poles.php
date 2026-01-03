<?php
/**
 * Path: Public/dev/run_import_poles.php
 * 說明: 【僅測試用】透過瀏覽器手動執行 import_poles.php
 * ⚠️ 用完請刪除，避免被外部觸發
 */

declare(strict_types=1);

// 基本防呆（避免被隨便掃）
if (php_sapi_name() === 'cli') {
    echo "This file is for WEB testing only.\n";
    exit;
}

// 強制顯示錯誤（只限測試）
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// 設定正確專案根目錄
$root = dirname(__DIR__, 2);

// 確認檔案存在
$importScript = $root . '/scripts/import_poles.php';
if (!is_file($importScript)) {
    http_response_code(500);
    echo "❌ import_poles.php not found\n";
    echo $importScript;
    exit;
}

// 執行前提示
echo "<pre>";
echo "=== RUN import_poles.php (WEB TEST) ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n\n";

// 直接執行原本 CLI 腳本
require $importScript;

echo "\n=== END ===\n";
echo "</pre>";
