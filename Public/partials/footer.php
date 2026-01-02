<?php
/**
 * Path: Public/partials/footer.php
 * 說明: 全站 Footer（版號、版權/單位資訊）
 */

declare(strict_types=1);

$version = $version ?? 'v0.1.0';
?>
<footer class="footer" role="contentinfo">
  <div class="footer__left">
    <span class="footer__ver"><?= htmlspecialchars((string)$version, ENT_QUOTES) ?></span>
  </div>
  <div class="footer__right">
    <span>© <?= date('Y') ?> 境宏工程有限公司｜管理系統</span>
  </div>
</footer>
