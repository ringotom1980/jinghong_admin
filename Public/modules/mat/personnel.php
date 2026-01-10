<?php
/**
 * Path: Public/modules/mat/personnel.php
 * 說明: 資料編輯（承辦人異動 /mat/personnel）
 * - 只提供頁面結構與容器
 * - 掛載本頁專屬 CSS / JS（外掛）
 * - 不處理任何資料、不寫業務邏輯
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '資料編輯｜領退管理';
$pageCss   = ['assets/css/mat_personnel.css'];
$pageJs    = ['assets/js/mat_personnel.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page mat-personnel page-enter" role="main">
    <div class="content">

      <header class="page-head">
        <h1>資料編輯</h1>
        <div class="page-sub">台電承辦人異動（輸入後請按更新按鈕）</div>
      </header>

      <section class="mp-grid">

        <div class="card mp-card">
          <div class="card__head mp-head">
            <h2>承辦人異動</h2>
            <div class="mp-head__actions">
              <button type="button" class="btn btn--ghost" id="mpBtnReload">重新載入</button>
            </div>
          </div>

          <div class="card__body">
            <div id="mpList" class="mp-list" aria-live="polite">
              <!-- JS render：每列 班別 / 姓名input / 更新按鈕 -->
            </div>

            <div class="mp-footnote">
              說明：每列更新只影響該班別；班別不可修改。
            </div>
          </div>
        </div>

      </section>

    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>
</html>
