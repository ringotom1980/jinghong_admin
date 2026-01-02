<?php
declare(strict_types=1);

$pageTitle = '儀表板｜境宏';
$pageCss = ['assets/css/dashboard.css'];
$pageJs  = ['assets/js/nav.js','assets/js/dashboard.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>
<body>

<?php require __DIR__ . '/partials/header.php'; ?>
<?php require __DIR__ . '/partials/sidebar.php'; ?>

<main class="page">
  <div class="page-head">
    <h1>儀表板</h1>
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

<script src="<?= '/jinghong_admin/assets/js/api.js' ?>"></script>
<script src="<?= '/jinghong_admin/assets/js/ui_toast.js' ?>"></script>
<script src="<?= '/jinghong_admin/assets/js/ui_modal.js' ?>"></script>
<?php foreach ($pageJs as $js): ?>
  <script src="<?= '/jinghong_admin/' . ltrim($js, '/') ?>"></script>
<?php endforeach; ?>
</body>
</html>
