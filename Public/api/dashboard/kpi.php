<?php
/**
 * Path: Public/api/dashboard/kpi.php
 * 說明: Dashboard KPI（v0 骨架：先支援 1-1 卡）
 * 回傳：
 *  - asof_date: 即期膠囊日期（規則：未來含今日最近一筆；否則過去最近一筆）
 *  - mat.status: LWK/T/S/RECON 是否有資料（紅/綠）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

function _pick_asof_date(array $dates): ?string {
  // dates 為 YYYY-MM-DD，通常已 DESC，但不假設排序，自己處理
  $dates = array_values(array_filter($dates, fn($d) => is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)));
  if (!$dates) return null;

  sort($dates); // ASC 方便挑最近未來、或最近過去
  $today = date('Y-m-d');

  // 1) 未來含今日：取最接近 today 的那筆（>= today 的最小值）
  foreach ($dates as $d) {
    if ($d >= $today) return $d;
  }

  // 2) 沒有未來：取過去最近（最大值）
  return end($dates) ?: null;
}

function _table_exists(string $table): bool {
  $st = db()->prepare("SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1");
  $st->execute([$table]);
  return (bool)$st->fetchColumn();
}

try {
  // 讀近三個月膠囊 dates（沿用你 stats_capsules.php 的來源：mat_issue_batches）
  $sql = "SELECT DISTINCT withdraw_date
          FROM mat_issue_batches
          WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          ORDER BY withdraw_date DESC";
  $rows = db()->query($sql)->fetchAll();

  $dates = [];
  foreach ($rows as $r) $dates[] = (string)$r['withdraw_date'];

  $asof = _pick_asof_date($dates);

  // 預設全紅（沒日期也能回）
  $status = ['LWK' => false, 'T' => false, 'S' => false, 'RECON' => false];

  if ($asof) {
    // 用 mat_issue_batches.file_type 判斷最準（不用去 sum items）
    // LWK：IssueParserKLW（K/L/W）
    $st = db()->prepare("SELECT file_type, COUNT(*) AS c
                         FROM mat_issue_batches
                         WHERE withdraw_date = ?
                         GROUP BY file_type");
    $st->execute([$asof]);
    $typeRows = $st->fetchAll();

    $cnt = [];
    foreach ($typeRows as $tr) {
      $t = strtoupper((string)($tr['file_type'] ?? ''));
      $c = (int)($tr['c'] ?? 0);
      if ($t !== '') $cnt[$t] = $c;
    }

    $status['LWK'] = (($cnt['K'] ?? 0) + ($cnt['L'] ?? 0) + ($cnt['W'] ?? 0)) > 0;
    $status['T']   = ($cnt['T'] ?? 0) > 0;
    $status['S']   = ($cnt['S'] ?? 0) > 0;

    // 對帳：先安全檢查，避免你表名/欄位未定導致 500
    // 你系統目前有 Public/api/mat/edit_reconciliation.php，因此我先假設表名 mat_edit_reconciliation 且有 withdraw_date
    if (_table_exists('mat_edit_reconciliation')) {
      $st2 = db()->prepare("SELECT 1 FROM mat_edit_reconciliation WHERE withdraw_date = ? LIMIT 1");
      $st2->execute([$asof]);
      $status['RECON'] = (bool)$st2->fetchColumn();
    } else {
      $status['RECON'] = false;
    }
  }

  json_ok([
    'asof_date' => $asof,
    'mat' => [
      'status' => $status
    ]
  ]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
