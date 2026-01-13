<?php
/**
 * Path: Public/modules/vehicle/base.php
 * 說明: 車輛基本資料（列表 + 明細 + 檢查到期 + 照片）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = '車輛基本資料｜境宏工程有限公司管理系統';

$pageCss = [
  'assets/css/vehicle_base.css',
];

$pageJs = [
  'assets/js/vehicle_base.js',
  'assets/js/vehicle_base_list.js',
  'assets/js/vehicle_base_detail.js',
  'assets/js/vehicle_base_inspections.js',
  'assets/js/vehicle_base_photo.js',
];
?>
<!DOCTYPE html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>
  <?php require __DIR__ . '/../../partials/header.php'; ?>
  <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

  <main class="page page-enter">
    <div class="vb container">

      <div class="page-head">
        <h1>車輛基本資料</h1>
        <p class="page-sub">列表查詢、車輛基本欄位維護、檢查到期日維護、車輛照片（單張覆蓋）。</p>
      </div>

      <section class="vb-grid">
        <!-- 左：列表 -->
        <aside class="card vb-list">
          <div class="card__head vb-list__head">
            <div class="vb-list__title">
              <h2>車輛列表</h2>
              <div class="vb-badges">
                <span class="vb-badge" id="vbCountBadge">0</span>
              </div>
            </div>

            <div class="vb-list__tools">
              <div class="vb-search">
                <input class="input" id="vbQ" type="search" placeholder="搜尋：車輛編號 / 車牌 / 使用人 / 車主" autocomplete="off" />
              </div>

              <div class="vb-filters">
                <label class="vb-check">
                  <input type="checkbox" id="vbActiveOnly" checked />
                  <span>只顯示使用中</span>
                </label>

                <button class="btn btn--secondary" id="vbBtnReload" type="button">
                  <span class="btn__text">重新載入</span>
                  <span class="btn__spinner" aria-hidden="true"></span>
                </button>

                <button class="btn btn--primary" id="vbBtnNew" type="button">
                  <span class="btn__text">新增車輛</span>
                  <span class="btn__spinner" aria-hidden="true"></span>
                </button>
              </div>
            </div>
          </div>

          <div class="card__body vb-list__body">
            <div class="vb-tableWrap">
              <table class="table vb-table">
                <thead>
                  <tr>
                    <th style="width:90px;">編號</th>
                    <th style="width:120px;">車牌</th>
                    <th>使用人</th>
                    <th style="width:80px;">狀態</th>
                  </tr>
                </thead>
                <tbody id="vbListTbody">
                  <tr>
                    <td colspan="4" class="vb-empty">載入中…</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="vb-hint">
              點選一列進入明細；可在右側直接儲存。
            </div>
          </div>
        </aside>

        <!-- 右：明細 -->
        <section class="card vb-detail">
          <div class="card__head vb-detail__head">
            <div class="vb-detail__title">
              <h2 id="vbDetailTitle">車輛明細</h2>
              <div class="vb-detail__meta" id="vbDetailMeta"></div>
            </div>

            <div class="vb-detail__actions">
              <button class="btn btn--secondary" id="vbBtnReset" type="button">
                <span class="btn__text">重置</span>
                <span class="btn__spinner" aria-hidden="true"></span>
              </button>

              <button class="btn btn--primary" id="vbBtnSave" type="button">
                <span class="btn__text">儲存</span>
                <span class="btn__spinner" aria-hidden="true"></span>
              </button>
            </div>
          </div>

          <div class="card__body vb-detail__body">
            <div class="vb-tabs">
              <button class="vb-tab is-active" type="button" data-tab="detail">基本資料</button>
              <button class="vb-tab" type="button" data-tab="inspections">檢查到期</button>
              <button class="vb-tab" type="button" data-tab="photo">照片</button>
            </div>

            <!-- Tab: 基本資料 -->
            <div class="vb-panel is-active" data-panel="detail">
              <form class="vb-form" id="vbForm" autocomplete="off">
                <input type="hidden" id="vbId" value="" />

                <div class="vb-form__grid">
                  <div class="vb-field">
                    <label class="form-label" for="vbVehicleCode">車輛編號</label>
                    <input class="input" id="vbVehicleCode" type="text" placeholder="例：C-01（不可重用）" maxlength="10" />
                    <div class="vb-help">全站唯一；新增後建議不要更改。</div>
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbPlateNo">車牌號碼</label>
                    <input class="input" id="vbPlateNo" type="text" placeholder="例：ABC-1234" maxlength="30" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbVehicleTypeId">車輛類型</label>
                    <select class="input" id="vbVehicleTypeId"></select>
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbBrandId">廠牌</label>
                    <select class="input" id="vbBrandId"></select>
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbBoomTypeId">吊臂型式</label>
                    <select class="input" id="vbBoomTypeId"></select>
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbTonnage">噸數</label>
                    <input class="input" id="vbTonnage" type="number" step="0.01" placeholder="例：3.5" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbVehicleYear">出廠年份</label>
                    <input class="input" id="vbVehicleYear" type="number" step="1" placeholder="YYYY" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbOwnerName">車主</label>
                    <input class="input" id="vbOwnerName" type="text" maxlength="100" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbUserName">使用人</label>
                    <input class="input" id="vbUserName" type="text" maxlength="100" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbVehiclePrice">車輛價格</label>
                    <input class="input" id="vbVehiclePrice" type="number" step="0.01" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbBoomPrice">吊臂價格</label>
                    <input class="input" id="vbBoomPrice" type="number" step="0.01" />
                  </div>

                  <div class="vb-field">
                    <label class="form-label" for="vbBucketPrice">車斗價格</label>
                    <input class="input" id="vbBucketPrice" type="number" step="0.01" />
                  </div>

                  <div class="vb-field vb-field--row">
                    <label class="vb-check vb-check--big">
                      <input type="checkbox" id="vbIsActive" checked />
                      <span>使用中</span>
                    </label>
                  </div>

                  <div class="vb-field vb-field--full">
                    <label class="form-label" for="vbNote">備註</label>
                    <textarea class="input" id="vbNote" rows="3" maxlength="255" placeholder="最多 255 字"></textarea>
                  </div>
                </div>
              </form>
            </div>

            <!-- Tab: 檢查到期 -->
            <div class="vb-panel" data-panel="inspections">
              <div class="vb-inspectHead">
                <div class="vb-inspectTitle">
                  <h3>檢查到期日</h3>
                  <div class="vb-help">可同時設定「是否需要檢查」與「到期/檢測日期」。</div>
                </div>

                <button class="btn btn--primary" id="vbBtnSaveInspections" type="button">
                  <span class="btn__text">儲存檢查設定</span>
                  <span class="btn__spinner" aria-hidden="true"></span>
                </button>
              </div>

              <div id="vbInspectionsWrap" class="vb-inspections">
                <div class="vb-empty">請先選擇左側車輛。</div>
              </div>
            </div>

            <!-- Tab: 照片 -->
            <div class="vb-panel" data-panel="photo">
              <div class="vb-photoHead">
                <div>
                  <h3>車輛照片（單張覆蓋）</h3>
                  <div class="vb-help">上傳後會覆蓋既有照片；建議寬邊 1200px 以上。</div>
                </div>

                <div class="vb-photoActions">
                  <input class="vb-file" id="vbPhotoFile" type="file" accept="image/*" />
                  <button class="btn btn--primary" id="vbBtnUploadPhoto" type="button">
                    <span class="btn__text">上傳照片</span>
                    <span class="btn__spinner" aria-hidden="true"></span>
                  </button>
                </div>
              </div>

              <div class="vb-photoBox">
                <img id="vbPhotoImg" class="vb-photoImg" alt="車輛照片" />
                <div id="vbPhotoEmpty" class="vb-empty">尚未有照片。</div>
              </div>
            </div>
          </div>
        </section>
      </section>

    </div>
  </main>

  <?php require __DIR__ . '/../../partials/footer.php'; ?>
  <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>
</html>
