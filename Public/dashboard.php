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
      <article class="dash-card dash-card--wide" data-jump="mat_stats" data-section="capsule">
        <div class="dash-card__top">
          <div class="dash-card__k">近期領退作業狀態</div>
          <div class="dash-card__tag">點日期→統計；點燈號→對應頁</div>
        </div>

        <div class="dash-row">
          <div class="dash-row__label">領退時間</div>
          <div class="dash-row__value" id="matNextDateText">—</div>
        </div>

        <div class="dash-lights" role="group" aria-label="作業狀態燈號">
          <button type="button" class="dash-light ui-float-card ui-float-card--sm" data-action="go_issue" data-type="LWK">
            <span class="dash-light__dot" data-light="LWK" aria-hidden="true"></span>
            <span class="dash-light__text">領料資料</span>
          </button>

          <button type="button" class="dash-light ui-float-card ui-float-card--sm" data-action="go_issue" data-type="T">
            <span class="dash-light__dot" data-light="T" aria-hidden="true"></span>
            <span class="dash-light__text">退料資料</span>
          </button>

          <button type="button" class="dash-light ui-float-card ui-float-card--sm" data-action="go_issue" data-type="S">
            <span class="dash-light__dot" data-light="S" aria-hidden="true"></span>
            <span class="dash-light__text">用餘資料</span>
          </button>

          <button type="button" class="dash-light ui-float-card ui-float-card--sm" data-action="go_edit_b">
            <span class="dash-light__dot" data-light="RECON" aria-hidden="true"></span>
            <span class="dash-light__text">對帳資料</span>
          </button>
        </div>
      </article>

      <!-- 1-2 -->
      <article class="dash-card" data-jump="mat_stats" data-section="A">
        <div class="dash-card__top">
          <div class="dash-card__k">近期 A 班領料</div>
          <div class="dash-card__tag">點卡片→統計 A 班</div>
        </div>
        <div class="dash-list" id="matAList">
          <div class="dash-muted">—</div>
        </div>
      </article>

      <!-- 1-3 -->
      <article class="dash-card" data-jump="mat_stats" data-section="D">
        <div class="dash-card__top">
          <div class="dash-card__k">近期 D 班退料</div>
          <div class="dash-card__tag">點卡片→統計 D 班</div>
        </div>
        <div class="dash-list" id="matDNegList">
          <div class="dash-muted">—</div>
        </div>
      </article>

      <!-- 1-4 -->
      <article class="dash-card" data-jump="mat_stats" data-section="F">
        <div class="dash-card__top">
          <div class="dash-card__k">近期 F 班變壓器領退</div>
          <div class="dash-card__tag">點卡片→統計 F 班</div>
        </div>

        <div class="dash-mini-grid" aria-label="變壓器數量 2x2">
          <div class="dash-mini-grid__head"></div>
          <div class="dash-mini-grid__head">桿上型</div>
          <div class="dash-mini-grid__head">亭置式</div>

          <div class="dash-mini-grid__rowhead">領料</div>
          <div class="dash-mini-grid__cell"><span id="fIssuePole">—</span></div>
          <div class="dash-mini-grid__cell"><span id="fIssuePad">—</span></div>

          <div class="dash-mini-grid__rowhead">退料</div>
          <div class="dash-mini-grid__cell"><span id="fReturnPole">—</span></div>
          <div class="dash-mini-grid__cell"><span id="fReturnPad">—</span></div>
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
      <article class="dash-card" data-jump="car_base" data-section="overdue">
        <div class="dash-card__top">
          <div class="dash-card__k">已逾期車輛</div>
          <div class="dash-card__tag">點卡片→車輛基本資料</div>
        </div>
        <div class="dash-list" id="carOverdueList">
          <div class="dash-muted">—</div>
        </div>
      </article>

      <!-- 2-2 -->
      <article class="dash-card" data-jump="car_base" data-section="due_soon">
        <div class="dash-card__top">
          <div class="dash-card__k">即將到期車輛（30 天內）</div>
          <div class="dash-card__tag">點卡片→車輛基本資料</div>
        </div>
        <div class="dash-list" id="carDueSoonList">
          <div class="dash-muted">—</div>
        </div>
      </article>

      <!-- 2-3 -->
      <article class="dash-card" data-jump="car_stats" data-section="repair_6m">
        <div class="dash-card__top">
          <div class="dash-card__k">近半年維修金額</div>
          <div class="dash-card__tag">點卡片→維修統計</div>
        </div>

        <div class="dash-kv">
          <div class="dash-kv__row">
            <div class="dash-kv__k">公司負擔</div>
            <div class="dash-kv__v" id="carRepairCompany">—</div>
          </div>
          <div class="dash-kv__row">
            <div class="dash-kv__k">工班負擔</div>
            <div class="dash-kv__v" id="carRepairTeam">—</div>
          </div>
          <div class="dash-kv__row dash-kv__row--total">
            <div class="dash-kv__k">合計</div>
            <div class="dash-kv__v" id="carRepairTotal">—</div>
          </div>
        </div>
      </article>
    </div>
  </section>

  <!-- ========== Section: Tools (工具管理) ========== -->
  <section class="dash-section" id="dash-tools" aria-label="工具管理">
    <div class="dash-section__head">
      <h2 class="dash-section__title">工具管理</h2>
      <div class="dash-section__meta">近 6 個月維修金額（公司/工班/合計）</div>
    </div>

    <div class="dash-grid dash-grid--tools">
      <article class="dash-card dash-card--wide" data-jump="equ_stats" data-section="repair_6m">
        <div class="dash-card__top">
          <div class="dash-card__k">半年維修金額折線（佔位）</div>
          <div class="dash-card__tag">點卡片→工具統計</div>
        </div>

        <div class="dash-chart-placeholder" aria-label="折線圖佔位">
          <div class="dash-chart-placeholder__text">
            這裡將放「三條折線」：公司 / 工班 / 合計（先用佔位骨架跑流程）
          </div>
        </div>
      </article>
    </div>
  </section>

</main>

<?php require __DIR__ . '/partials/footer.php'; ?>
<?php require __DIR__ . '/partials/scripts.php'; ?>
</body>
</html>
