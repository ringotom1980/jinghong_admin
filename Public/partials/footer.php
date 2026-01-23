<?php
/**
 * Path: Public/partials/footer.php
 * 說明: 全站 Footer（版號、版權/單位資訊）
 * - 版本號來源：專案根目錄 /version.txt
 * - 若檔案不存在或為空，顯示 v0.0.0
 */

declare(strict_types=1);

// 專案根目錄（Public/partials → 專案根）
$versionFile = dirname(__DIR__, 2) . '/version.txt';

$version = 'v0.0.0';
if (is_file($versionFile)) {
    $v = trim((string)@file_get_contents($versionFile));
    if ($v !== '') {
        $version = $v;
    }
}
?>
<footer class="footer" role="contentinfo">
  <div class="footer__left">
    <span class="footer__ver"><?= htmlspecialchars($version, ENT_QUOTES) ?></span>
  </div>
  <div class="footer__right">
    <span>© <?= date('Y') ?> 境宏工程有限公司｜Jinghong Engineering Co., Ltd.</span>
  </div>
</footer>
