<?php
/**
 * Path: Public/api/mat/stats_capsules.php
 * 說明: 近三個月領退日期膠囊（統計頁用）
 * - 來源：mat_issue_batches.withdraw_date（以匯入批次為準）
 * - 回傳：{ dates: ["YYYY-MM-DD", ...] }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

try {
  $sql = "SELECT DISTINCT withdraw_date
          FROM mat_issue_batches
          WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          ORDER BY withdraw_date DESC";
  $rows = db()->query($sql)->fetchAll();

  $dates = [];
  foreach ($rows as $r) {
    $dates[] = (string)$r['withdraw_date'];
  }

  json_ok(['dates' => $dates]);
} catch (Throwable $e) {
  json_error($e->getMessage(), 500);
}
