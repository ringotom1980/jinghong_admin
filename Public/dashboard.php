<?php
/**
 * Path: Public/dashboard.php
 * 說明: 儀錶板（KPI 佔位版，後續接 /api/dashboard/kpi 聚合）
 * - CSS/JS 皆為外掛（不內嵌）
 * - 依全站 Layout：載入 header + sidebar + footer
 * - JS 載入定版：統一由 partials/scripts.php 管理（不再散落 <script>）
 */

declare(strict_types=1);

$pageTitle = '儀錶板｜境宏工程有縣公司';
$pageCss   = ['assets/css/dashboard.css'];

// ✅ 只放「本頁專屬」；nav.js 已由 scripts.php 全站載入
$pageJs    = ['assets/js/dashboard.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body>

<?php require __DIR__ . '/partials/header.php'; ?>
<?php require __DIR__ . '/partials/sidebar.php'; ?>

<main class="page page-enter">
  <div class="page-head">
    <h1>儀錶板</h1>
    <div class="page-sub">KPI 概覽（目前為佔位，下一步接 API）</div>
  </div>

  <section class="kpi-grid">
    <div class="kpi-card"><div class="kpi-k">材料</div><div class="kpi-v">—</div><div class="kpi-s">最新上傳</div></div>
    <div class="kpi-card"><div class="kpi-k">材料</div><div class="kpi-v">—</div><div class="kpi-s">最新對帳</div></div>
    <div class="kpi-card"><div class="kpi-k">材料</div><div class="kpi-v">—</div><div class="kpi-s">最新領退</div></div>

    <div class="kpi-card"><div class="kpi-k">車輛</div><div class="kpi-v">—</div><div class="kpi-s">類型數量</div></div>
    <div class="kpi-card"><div class="kpi-k">車輛</div><div class="kpi-v">—</div><div class="kpi-s">檢驗到期</div></div>
    <div class="kpi-card"><div class="kpi-k">車輛</div><div class="kpi-v">—</div><div class="kpi-s">近三月維修</div></div>

    <div class="kpi-card"><div class="kpi-k">工具</div><div class="kpi-v">—</div><div class="kpi-s">廠商排行</div></div>
    <div class="kpi-card"><div class="kpi-k">工具</div><div class="kpi-v">—</div><div class="kpi-s">保養金額</div></div>
    <div class="kpi-card"><div class="kpi-k">工具</div><div class="kpi-v">—</div><div class="kpi-s">維修金額</div></div>
  </section>
</main>

<?php require __DIR__ . '/partials/footer.php'; ?>
<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
