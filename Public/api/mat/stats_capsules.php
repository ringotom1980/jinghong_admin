<?php
/**
 * Path: Public/api/mat/stats_capsules.php
 * 說明: 統計頁 — 近三個月日期膠囊
 * - 回傳近三個月內有資料的 withdraw_date（DESC）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

try {
  $sql = "SELECT DISTINCT withdraw_date
          FROM mat_issue_batches
          WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
          ORDER BY withdraw_date DESC";

  $rows = db()->query($sql)->fetchAll();
  $dates = [];
  foreach ($rows as $r) $dates[] = (string)$r['withdraw_date'];

  json_ok(['dates' => $dates]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
