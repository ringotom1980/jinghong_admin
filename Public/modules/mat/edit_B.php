<?php

/**
 * Path: Public/modules/mat/edit_B.php
 * 說明: B 班管理（/mat/edit_B）
 * - 顯示 B 班材料清單（項次/材料編號/材料名稱）
 * - 支援：拖曳排序、指定位置（插入式）、搜尋（編號+名稱）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$pageTitle = 'B 班管理｜領退管理';
$pageCss = ['assets/css/mat_edit_B.css'];
$pageJs  = [
  'assets/js/mat_edit_ui.js',
  'assets/js/mat_edit_B.js',
];

?>
<!doctype html>
<html lang="zh-Hant">
<?php require __DIR__ . '/../../partials/head.php'; ?>

<body>

    <?php require __DIR__ . '/../../partials/header.php'; ?>
    <?php require __DIR__ . '/../../partials/sidebar.php'; ?>

    <main class="page mat-edit-b page-enter" role="main">
        <div class="content">

            <header class="page-head">
                <h1>B 班管理</h1>
                <div class="page-sub">B 班材料清單 · 排序設定（拖曳 / 指定位置 / 搜尋）</div>
            </header>

            <section class="card mb-card">
                <div class="card__head mb-head">
                    <h2>B 班材料清單</h2>

                    <div class="mb-toolbar">
                        <div class="mb-search">
                            <div class="mb-search__wrap">
                                <input type="text" id="mbSearch" class="mb-search__input" placeholder="搜尋材料編號或材料名稱…" autocomplete="off">
                                <button type="button" class="mb-search__clear" id="mbSearchClear" aria-label="清除搜尋" title="清除">×</button>
                            </div>
                            <div class="mb-search__hint" id="mbHint"></div>
                        </div>
                    </div>
                </div>

                <div class="card__body">
                    <div class="mb-note" id="mbNote"></div>

                    <div class="mb-list" id="mbList">
                        <!-- JS render -->
                    </div>
                </div>
            </section>

        </div>
    </main>

    <?php require __DIR__ . '/../../partials/footer.php'; ?>
    <?php require __DIR__ . '/../../partials/scripts.php'; ?>
</body>

</html>