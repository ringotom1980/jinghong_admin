<?php
/**
 * Path: Public/partials/public_header.php
 * 說明: 公開頁 Header（不載入 sidebar）
 * - 顯示系統名
 * - 未登入：顯示「登入」入口
 * - 已登入：顯示「回儀表板」
 */

declare(strict_types=1);

$base = base_url();
$home = ($base !== '' ? rtrim($base, '/') : '') . '/';

$dash = ($base !== '' ? rtrim($base, '/') : '') . '/dashboard';
$login = ($base !== '' ? rtrim($base, '/') : '') . '/login';

$isAuthed = function_exists('current_user_id') && current_user_id();
?>
<header class="topbar topbar--public">
  <div class="topbar__inner">
    <a class="topbar__brand" href="<?= htmlspecialchars($home, ENT_QUOTES) ?>">
      <img class="topbar__logo" src="<?= asset('assets/img/brand/JH_logo.png') ?>" alt="境宏" width="28" height="28" />
      <span class="topbar__title">境宏工程有限公司管理系統</span>
    </a>

    <div class="topbar__right">
      <?php if ($isAuthed): ?>
        <a class="btn btn--secondary" href="<?= htmlspecialchars($dash, ENT_QUOTES) ?>">
          <i class="fa-solid fa-arrow-left"></i> 回儀表板
        </a>
      <?php else: ?>
        <a class="btn btn--secondary" href="<?= htmlspecialchars($login, ENT_QUOTES) ?>">
          <i class="fa-solid fa-right-to-bracket"></i> 登入
        </a>
      <?php endif; ?>
    </div>
  </div>
</header>
