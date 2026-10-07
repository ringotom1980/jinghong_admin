<?php

/**
 * Path: Public/modules/car/base.php
 * 說明: 車輛管理｜基本資料（左清單 + 右工作區：基本資料 / 六項檢查 / 照片）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '車輛管理｜基本資料';
$pageCss = [
  'assets/css/car_base.css',
];

$pageJs = [
  'assets/js/car_base.js',
  'assets/js/car_base_list.js',
  'assets/js/car_base_detail.js',
  'assets/js/car_base_inspections.js',
  'assets/js/car_base_photo.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body class="page-enter">

  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page car-base" role="main">
    <section class="page-head">
      <h1>車輛管理｜基本資料</h1>
      <p class="page-sub">左側選單選擇車輛，右側顯示基本資料，點擊編輯可修改基本資料(含照片)、檢查項目日期即改即存。</p>
    </section>

    <div class="carb-shell">
      <!-- LEFT: list -->
      <aside class="carb-left card card--flat" aria-label="車輛清單">
        <div class="carb-left__head">
          <div class="carb-search">
            <input class="input" id="carbSearch" type="search" placeholder="搜尋：車編 / 車牌 / 車主 / 使用人" autocomplete="off" />
          </div>

          <div class="carb-filters" role="group" aria-label="檢查狀態篩選">
            <button type="button" class="carb-pill is-active" data-filter="all">全部</button>
            <button type="button" class="carb-pill" data-filter="soon">快到期</button>
            <button type="button" class="carb-pill" data-filter="overdue">已逾期</button>
            <button type="button" class="carb-pill" data-filter="na">停用中</button>

            <input type="hidden" id="carbSort" value="vehicle_code_asc" />
          </div>
        </div>

        <div class="carb-left__body">
          <div class="carb-list" id="carbList" aria-live="polite"></div>
          <div class="carb-empty" id="carbEmpty" hidden>目前沒有停用中車輛資料</div>
          <div class="carb-loading" id="carbLoading" hidden>載入中…</div>
        </div>
      </aside>

      <!-- RIGHT: workspace -->
      <section class="carb-right card" aria-label="工作區">
        <header class="carb-right__head">
          <div class="carb-title">
            <div class="carb-title__main" id="carbTitleMain">請先從左側選擇車輛</div>
            <div class="carb-title__sub" id="carbTitleSub"></div>
          </div>

          <div class="carb-actions">
            <!-- VIEW 狀態：新增 / 編輯 -->
            <button type="button" class="btn btn--secondary" id="carbNewBtn">新增車輛</button>
            <button type="button" class="btn btn--primary" id="carbEditBtn" disabled>編輯本車</button>

            <!-- CREATE / EDIT 狀態：儲存 / 取消（平常隱藏） -->
            <button type="button" class="btn btn--primary" id="carbSaveBtn" hidden disabled>
              <span class="btn__text">儲存</span><span class="btn__spinner" aria-hidden="true"></span>
            </button>
            <button type="button" class="btn btn--ghost" id="carbCancelBtn" hidden disabled>取消</button>
          </div>

        </header>

        <nav class="carb-tabs" aria-label="功能分頁">
          <button type="button" class="carb-tab is-active" data-tab="detail" id="carbTabDetail" disabled>基本資料</button>
          <button type="button" class="carb-tab" data-tab="insp" id="carbTabInsp" disabled>各項檢查</button>
        </nav>

        <div class="carb-panels">
          <!-- Detail panel -->
          <section class="carb-panel is-active" data-panel="detail" aria-label="基本資料">
            <div class="carb-form" id="carbDetailForm">

              <div class="carb-detailSplit">
                <!-- LEFT 1/3: photo -->
                <aside class="carb-detailPhoto" aria-label="車輛照片">
                  <div class="carb-sectionTitle">
                    <span>車輛實照</span>
                  </div>
                  <div class="carb-photo__preview card card--flat">
                    <div class="carb-photo__imgWrap">
                      <img id="carbPhotoImg" alt="車輛照片" />
                      <div class="carb-photo__empty" id="carbPhotoEmpty" hidden>尚未上傳照片</div>
                    </div>

                    <div class="carb-photo__actions">
                      <input type="file" id="carbPhotoFile" accept="image/*" hidden />
                      <button type="button" class="btn btn--warning" id="carbPhotoUploadBtn" disabled>
                        <span class="btn__text">更換照片</span><span class="btn__spinner" aria-hidden="true"></span>
                      </button>
                    </div>

                  </div>
                </aside>

                <!-- RIGHT 2/3: fields -->
                <section class="carb-detailFields" aria-label="基本資料欄位">
                  <div class="carb-grid">
                    <div class="carb-field">
                      <label class="form-label">車輛編號</label>
                      <input class="input" name="vehicle_code" type="text" placeholder="例：C-01" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">車牌號碼</label>
                      <input class="input" name="plate_no" type="text" placeholder="例：ABC-1234" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">噸數</label>
                      <input class="input" name="tonnage" type="number" step="0.01" placeholder="例：3.50" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">廠牌</label>
                      <select name="brand_id" disabled></select>
                      <input class="input carb-new-input" name="brand_new" type="text" placeholder="輸入新廠牌" disabled hidden />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">吊臂型式</label>
                      <select name="boom_type_id" disabled></select>
                      <input class="input carb-new-input" name="boom_type_new" type="text" placeholder="輸入新吊臂型式" disabled hidden />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">車輛類型</label>
                      <select name="vehicle_type_id" disabled></select>
                      <input class="input carb-new-input" name="vehicle_type_new" type="text" placeholder="輸入新車輛類型" disabled hidden />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">出廠年份</label>
                      <input class="input" name="vehicle_year" type="number" min="1950" max="2100" placeholder="YYYY" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">車主</label>
                      <input class="input" name="owner_name" type="text" placeholder="車主姓名" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">使用人</label>
                      <input class="input" name="user_name" type="text" placeholder="使用人姓名" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">車輛價格</label>
                      <input class="input" name="vehicle_price" type="number" step="0.01" placeholder="0.00" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">吊臂價格</label>
                      <input class="input" name="boom_price" type="number" step="0.01" placeholder="0.00" disabled />
                    </div>

                    <div class="carb-field">
                      <label class="form-label">車斗價格</label>
                      <input class="input" name="bucket_price" type="number" step="0.01" placeholder="0.00" disabled />
                    </div>

                    <div class="carb-field carb-field--row">
                      <label class="carb-switch">
                        <input type="checkbox" name="is_active" disabled />
                        <span>使用中（停用請取消）</span>
                      </label>
                    </div>

                    <div class="carb-field carb-field--full">
                      <label class="form-label">備註</label>
                      <textarea class="input" name="note" rows="2" placeholder="備註" disabled></textarea>
                    </div>
                  </div>
                </section>
              </div>

            </div>
          </section>

          <!-- Inspections panel -->
          <section class="carb-panel" data-panel="insp" aria-label="六項檢查">
            <div class="carb-insp">
              <div class="carb-insp__left">
                <div class="carb-insp__summary card card--flat">
                  <div class="carb-insp__summaryHead">
                    <h3>檢查狀態</h3>
                    <div class="carb-insp__legend">
                      <span class="tag tag--ok">正常</span>
                      <span class="tag tag--soon">快到期</span>
                      <span class="tag tag--over">已逾期</span>
                      <span class="tag tag--na">停用中</span>
                    </div>
                  </div>
                  <div class="carb-insp__summaryBody" id="carbInspSummary"></div>
                </div>
              </div>

              <div class="carb-insp__right">
                <div class="carb-insp__tableWrap">
                  <table class="table carb-insp__table" aria-label="檢查項目">
                    <thead>
                      <tr>
                        <th style="width:40%;">項目</th>
                        <th style="width:18%;">檢查需要</th>
                        <th style="width:22%;">到期日</th>
                        <th style="width:20%;">狀態</th>
                      </tr>
                    </thead>
                    <tbody id="carbInspTbody"></tbody>
                  </table>
                  <div class="carb-hint">到期日變更後會立即儲存。</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>