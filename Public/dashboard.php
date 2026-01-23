<?php

/**
 * Path: Public/dashboard.php
 * 說明: 導覽板（v1.0 骨架可運行版：先用假資料渲染；後續接 /api/dashboard/kpi）
 * - CSS/JS 皆為外掛（不內嵌）
 * - 依全站 Layout：載入 header + sidebar + footer
 */

declare(strict_types=1);
require_once __DIR__ . '/../app/bootstrap.php';
require_login();

$pageTitle = '導覽板｜境宏工程有限公司';
$pageCss   = ['assets/css/dashboard.css'];
$pageJs    = ['assets/js/dashboard.js'];
?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/partials/head.php'; ?>

<body>

  <?php require __DIR__ . '/partials/header.php'; ?>
  <?php require __DIR__ . '/partials/sidebar.php'; ?>

  <main class="page page-enter dashboard" role="main">
    <div class="page-head">
      <h1>導覽板</h1>
      <div class="page-sub">近期作業監控</div>
    </div>

    <!-- ========== Section: Materials (領退管理) ========== -->
    <section class="dash-section" id="dash-mat" aria-label="領退管理">
      <div class="dash-section__head">
        <h2 class="dash-section__title">領退管理</h2>
        <div class="dash-section__meta">近期膠囊：<span id="dashAsOfDate">—</span></div>
      </div>

      <div class="dash-grid dash-grid--mat">
        <!-- 1-1 -->
        <article class="db-card" data-jump="mat_stats" data-section="capsule">
          <div class="db-card-head">
            <div class="db-card-title">近期領退作業狀態</div>
            <div class="db-card-meta">點日期→統計；點燈號→對應頁</div>
          </div>

          <div class="db-row">
            <div class="db-row-k">領退時間</div>
            <div class="db-row-k" id="matNextDateText">—</div>
          </div>

          <div class="dash-lights" role="group" aria-label="作業狀態燈號">
            <button type="button" class="db-card db-card--sm dash-light" data-action="go_issue" data-type="LWK">
              <span class="dash-light__dot" data-light="LWK" aria-hidden="true"></span>
              <span class="dash-light__label">領料資料</span>
            </button>

            <button type="button" class="db-card db-card--sm dash-light" data-action="go_issue" data-type="T">
              <span class="dash-light__dot" data-light="T" aria-hidden="true"></span>
              <span class="dash-light__label">退料資料</span>
            </button>

            <button type="button" class="db-card db-card--sm dash-light" data-action="go_issue" data-type="S">
              <span class="dash-light__dot" data-light="S" aria-hidden="true"></span>
              <span class="dash-light__label">用餘資料</span>
            </button>

            <button type="button" class="db-card db-card--sm dash-light" data-action="go_edit_b">
              <span class="dash-light__dot" data-light="RECON" aria-hidden="true"></span>
              <span class="dash-light__label">對帳資料</span>
            </button>
          </div>
        </article>

        <!-- 1-2 -->
        <article class="db-card" data-jump="mat_stats" data-section="A">
          <div class="db-card-head">
            <div class="db-card-title">近期 A 班領料</div>
            <div class="db-card-meta">點卡片→統計 A 班</div>
          </div>
          <div class="dash-list" id="matAList">
            <div class="db-empty">—</div>
          </div>
        </article>

        <!-- 1-3 -->
        <article class="db-card" data-jump="mat_edit_b" data-section="D">
          <div class="db-card-head">
            <div class="db-card-title">近期 D 班退料</div>
            <div class="db-card-meta">點卡片→輸入對帳資料</div>
          </div>
          <div class="dash-list" id="matDNegList">
            <div class="db-empty">—</div>
          </div>
        </article>

        <!-- 1-4 -->
        <article class="db-card" data-jump="mat_stats" data-section="F">
          <div class="db-card-head">
            <div class="db-card-title">近期 F 班變壓器領退</div>
            <div class="db-card-meta">點卡片→統計 F 班</div>
          </div>

          <div class="dash-tx2" aria-label="變壓器領退（新/舊、桿上/亭置、合計）">

            <!-- 領料 -->
            <div>
              <div class="db-h3">領料</div>

              <div class="dash-tx2__grid">
                <div></div>
                <div class="db-sub" style="text-align:center;">新</div>
                <div class="db-sub" style="text-align:center;">舊</div>

                <div class="db-sub">桿上型</div>
                <div class="db-row">
                  <div class="db-row-v" id="fIssuePoleNew">—</div>
                </div>
                <div class="db-row">
                  <div class="db-row-v" id="fIssuePoleOld">—</div>
                </div>

                <div class="db-sub">亭置式</div>
                <div class="db-row">
                  <div class="db-row-v" id="fIssuePadNew">—</div>
                </div>
                <div class="db-row">
                  <div class="db-row-v" id="fIssuePadOld">—</div>
                </div>

                <div class="db-sub">合計</div>
                <div class="db-row" style="grid-column: 2 / span 2;">
                  <div class="db-row-v" id="fIssueTotal">—</div>
                </div>
              </div>
            </div>

            <!-- 退料 -->
            <div>
              <div class="db-h3">退料</div>

              <div class="dash-tx2__grid">
                <div></div>
                <div class="db-sub" style="text-align:center;">新</div>
                <div class="db-sub" style="text-align:center;">舊</div>

                <div class="db-sub">桿上型</div>
                <div class="db-row">
                  <div class="db-row-v" id="fReturnPoleNew">—</div>
                </div>
                <div class="db-row">
                  <div class="db-row-v" id="fReturnPoleOld">—</div>
                </div>

                <div class="db-sub">亭置式</div>
                <div class="db-row">
                  <div class="db-row-v" id="fReturnPadNew">—</div>
                </div>
                <div class="db-row">
                  <div class="db-row-v" id="fReturnPadOld">—</div>
                </div>

                <div class="db-sub">合計</div>
                <div class="db-row" style="grid-column: 2 / span 2;">
                  <div class="db-row-v" id="fReturnTotal">—</div>
                </div>
              </div>
            </div>

          </div>
        </article>

      </div>
    </section>

    <!-- ========== Section: Vehicles (車輛管理) ========== -->
    <section class="dash-section" id="dash-vehicle" aria-label="車輛管理">
      <div class="dash-section__head">
        <h2 class="dash-section__title">車輛管理</h2>
        <div class="dash-section__meta">逾期/到期提醒 + 近半年維修</div>
      </div>

      <div class="dash-grid dash-grid--vehicle">
        <!-- 2-1 -->
        <article class="db-card" data-jump="car_base" data-section="overdue">
          <div class="db-card-head">
            <div class="db-card-title">已逾期車輛</div>
            <div class="db-card-meta">點卡片→車輛基本資料</div>
          </div>
          <div class="dash-list" id="carOverdueList">
            <div class="db-empty">—</div>
          </div>
        </article>

        <!-- 2-2 -->
        <article class="db-card" data-jump="car_base" data-section="due_soon">
          <div class="db-card-head">
            <div class="db-card-title">即將到期車輛（30 天內）</div>
            <div class="db-card-meta">點卡片→車輛基本資料</div>
          </div>
          <div class="dash-list" id="carDueSoonList">
            <div class="db-empty">—</div>
          </div>
        </article>

        <!-- 2-3 -->
        <article class="db-card" data-jump="car_stats" data-section="repair_6m">
          <div class="db-card-head">
            <div class="db-card-title">近半年維修金額｜<span id="carRepairPeriod">—</span></div>
            <div class="db-card-meta">點卡片→維修統計</div>

          </div>

          <div class="dash-kv">
            <div class="db-row">
              <div class="db-row-k">公司負擔</div>
              <div class="db-row-k" id="carRepairCompany">—</div>
            </div>
            <div class="db-row">
              <div class="db-row-k">工班負擔</div>
              <div class="db-row-k" id="carRepairTeam">—</div>
            </div>
            <div class="db-row">
              <div class="db-row-k">合計</div>
              <div class="db-row-k" id="carRepairTotal">—</div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ========== Section: Tools (工具管理)以後再來做 ========== -->
    <!-- <section class="dash-section" id="dash-tools" aria-label="工具管理">
      <div class="dash-section__head">
        <h2 class="dash-section__title">工具管理</h2>
        <div class="dash-section__meta">近 6 個月維修金額（公司/工班/合計）</div>
      </div>

      <div class="dash-grid dash-grid--tools">
        <article class="db-card" data-jump="equ_stats" data-section="repair_6m">
          <div class="db-card-head">
            <div class="db-card-title">半年維修金額折線（佔位）</div>
            <div class="db-card-meta">點卡片→工具統計</div>
          </div>

          <div class="dash-chart-placeholder" aria-label="折線圖佔位">
            <div class="db-muted">
              這裡將放「三條折線」：公司 / 工班 / 合計（先用佔位骨架跑流程）
            </div>
          </div>
        </article>
      </div>
    </section> -->

  </main>

  <?php require __DIR__ . '/partials/footer.php'; ?>
  <?php require __DIR__ . '/partials/scripts.php'; ?>
</body>

</html>