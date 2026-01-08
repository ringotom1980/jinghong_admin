<?php
/**
 * Path: scripts/cron_cleanup.php
 * 說明: 定時資料清理入口（cron 呼叫）
 * 用法：
 *   php scripts/cron_cleanup.php
 *   php scripts/cron_cleanup.php --dry-run
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$dryRun = in_array('--dry-run', $argv, true);

$rulesFile = __DIR__ . '/../config/cleanup.php';
if (!is_file($rulesFile)) {
  fwrite(STDERR, "[cleanup] missing config/cleanup.php\n");
  exit(2);
}

$rules = require $rulesFile;
if (!is_array($rules)) {
  fwrite(STDERR, "[cleanup] invalid cleanup rules\n");
  exit(2);
}

date_default_timezone_set(getenv('APP_TIMEZONE') ?: 'Asia/Taipei');

echo "== Cleanup start: " . date('Y-m-d H:i:s') . " ==\n";
echo "Mode: " . ($dryRun ? "DRY-RUN" : "EXECUTE") . "\n";

$totalDeleted = 0;

foreach ($rules as $rule) {
  if (!is_array($rule)) continue;

  $name = (string)($rule['name'] ?? '');
  $table = (string)($rule['table'] ?? '');
  $dateCol = (string)($rule['date_col'] ?? '');
  $keepDays = (int)($rule['keep_days'] ?? 0);
  $pkCol = (string)($rule['pk_col'] ?? '');
  $batchSize = (int)($rule['batch'] ?? 1000);
  $whereExtra = (string)($rule['where'] ?? '');

  if ($name === '' || $table === '' || $dateCol === '' || $keepDays <= 0 || $pkCol === '') {
    echo "[skip] invalid rule\n";
    continue;
  }
  if ($batchSize <= 0) $batchSize = 1000;
  if ($batchSize > 20000) $batchSize = 20000; // 保守上限

  // cutoff: 今天 - keepDays（以日期判斷）
  $cutoff = new DateTimeImmutable('today');
  $cutoff = $cutoff->modify('-' . $keepDays . ' days');
  $cutoffStr = $cutoff->format('Y-m-d');

  echo "\n-- Rule: {$name}\n";
  echo "   table={$table}, date_col={$dateCol}, keep_days={$keepDays}, cutoff={$cutoffStr}, batch={$batchSize}\n";

  try {
    // 先算總數（乾跑也會用到）
    $sqlCount = "SELECT COUNT(*) AS c FROM {$table} WHERE {$dateCol} < ? " . ($whereExtra ? " {$whereExtra} " : "");
    $stC = db()->prepare($sqlCount);
    $stC->execute([$cutoffStr]);
    $row = $stC->fetch();
    $toDelete = (int)($row['c'] ?? 0);

    echo "   candidates={$toDelete}\n";
    if ($toDelete <= 0) continue;

    if ($dryRun) {
      continue;
    }

    // 分批刪除：用 ORDER BY pk LIMIT batchSize
    $deletedThisRule = 0;

    // 注意：MySQL/MariaDB 不允許 LIMIT 用 bind（在 emulate_prepares=false），所以 LIMIT 用安全的整數內插
    $limit = $batchSize;

    while (true) {
      $sqlDel = "DELETE FROM {$table}
                 WHERE {$dateCol} < ?
                 " . ($whereExtra ? " {$whereExtra} " : "") . "
                 ORDER BY {$pkCol}
                 LIMIT {$limit}";
      $stD = db()->prepare($sqlDel);
      $stD->execute([$cutoffStr]);
      $n = $stD->rowCount();

      if ($n <= 0) break;

      $deletedThisRule += $n;
      $totalDeleted += $n;

      echo "   deleted_batch={$n}, deleted_rule_total={$deletedThisRule}\n";

      // 保守：避免極端情況跑太久（你可視需求調整/移除）
      if ($deletedThisRule >= $toDelete) break;
    }

    echo "   deleted_rule_total={$deletedThisRule}\n";
  } catch (Throwable $e) {
    echo "   ERROR: " . $e->getMessage() . "\n";
    // 不中斷：讓其他 rule 照跑（你若要遇錯即停，我再改成 exit）
    continue;
  }
}

echo "\n== Cleanup end: " . date('Y-m-d H:i:s') . " ==\n";
echo "Total deleted: {$totalDeleted}\n";
