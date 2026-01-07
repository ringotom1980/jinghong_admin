<?php

/**
 * Path: app/services/mat/MatIssueService.php
 * 說明: Mat Issue 厚層（SQL/交易/規則集中）
 */

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\IOFactory;

final class MatIssueService
{
  /* =====================
   * 查詢類
   * ===================== */

  public static function listDates(): array
  {
    $rows = db()->query(
      "SELECT DISTINCT withdraw_date
       FROM mat_issue_batches
       ORDER BY withdraw_date DESC"
    )->fetchAll();

    return ['dates' => array_column($rows, 'withdraw_date')];
  }

  public static function listBatchesByDate(string $withdrawDate): array
  {
    $st = db()->prepare(
      "SELECT b.batch_id, b.withdraw_date, b.original_filename, b.file_type, b.uploaded_at,
              (SELECT COUNT(*) FROM mat_issue_items i WHERE i.batch_id = b.batch_id) AS items_count
       FROM mat_issue_batches b
       WHERE b.withdraw_date = ?
       ORDER BY b.batch_id DESC"
    );
    $st->execute([$withdrawDate]);

    return ['batches' => $st->fetchAll()];
  }

  public static function listMissingShifts(string $withdrawDate, array $batchIds): array
  {
    if (empty($batchIds)) {
      return ['missing' => [], 'personnel' => []];
    }

    $in = implode(',', array_fill(0, count($batchIds), '?'));

    $st = db()->prepare(
      "SELECT material_number,
              MAX(material_name) AS material_name,
              COUNT(*) AS missing_count
       FROM mat_issue_items
       WHERE withdraw_date = ?
         AND batch_id IN ($in)
         AND (shift IS NULL OR shift = '')
       GROUP BY material_number
       ORDER BY material_number"
    );
    $st->execute(array_merge([$withdrawDate], $batchIds));
    $missing = $st->fetchAll();

    $personnel = db()->query(
      "SELECT shift_code, person_name
       FROM mat_personnel
       ORDER BY shift_code"
    )->fetchAll();

    return [
      'missing'   => $missing,
      'personnel' => $personnel
    ];
  }

  /* =====================
   * 補班別（核心）
   * ===================== */

  public static function saveShiftByBatch(array $batchIds, array $items): array
  {
    if (empty($batchIds)) {
      throw new InvalidArgumentException('batch_ids 不可為空');
    }
    if (empty($items)) {
      throw new InvalidArgumentException('items 不可為空');
    }

    $pdo = db();
    $pdo->beginTransaction();

    try {
      /* upsert 主檔 */
      $upsert = $pdo->prepare(
        "INSERT INTO mat_materials (material_number, material_name, shift)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           material_name = VALUES(material_name),
           shift = VALUES(shift)"
      );

      /* 回填明細 */
      $inBatch = implode(',', array_fill(0, count($batchIds), '?'));
      $upd = $pdo->prepare(
        "UPDATE mat_issue_items
         SET shift = ?
         WHERE batch_id IN ($inBatch)
           AND material_number = ?
           AND (shift IS NULL OR shift = '')"
      );

      $updated = 0;

      foreach ($items as $row) {
        $mn   = trim((string)$row['material_number']);
        $name = trim((string)$row['material_name']);
        $sc   = strtoupper(trim((string)$row['shift_code']));

        if ($mn === '' || $sc === '') continue;

        $upsert->execute([$mn, $name, $sc]);

        $upd->execute(array_merge([$sc], $batchIds, [$mn]));
        $updated += $upd->rowCount();
      }

      $pdo->commit();

      return ['updated_items' => $updated];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  /* =====================
   * 匯入
   * ===================== */

  public static function importFiles(string $withdrawDate, array $files, ?int $uid): array
  {
    $pdo = db();
    $pdo->beginTransaction();

    $batchIds = [];
    $hasMissing = false;

    try {
      require_once __DIR__ . '/issue/IssueImportManager.php';
      $mgr = new IssueImportManager();

      foreach ($files as $f) {
        if (($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) continue;

        $filename = basename((string)$f['name']);
        $fileType = strtoupper(substr($filename, 0, 1)) ?: 'T';

        /* 同日同檔名 → 先刪 */
        $st = $pdo->prepare(
          "DELETE FROM mat_issue_batches
           WHERE withdraw_date = ? AND original_filename = ?"
        );
        $st->execute([$withdrawDate, $filename]);

        $pdo->prepare(
          "INSERT INTO mat_issue_batches (withdraw_date, original_filename, file_type, uploaded_by)
           VALUES (?, ?, ?, ?)"
        )->execute([$withdrawDate, $filename, $fileType, $uid]);

        $batchId = (int)$pdo->lastInsertId();
        $batchIds[] = $batchId;

        $parser = $mgr->getParser($fileType);
        $sheet  = IOFactory::load($f['tmp_name'])->getSheet(0);
        $rows   = $parser->parse($sheet);

        $ins = $pdo->prepare(
          "INSERT INTO mat_issue_items
           (batch_id, withdraw_date, voucher, material_number, material_name,
            collar_new, collar_old, recede_new, recede_old, scrap, footprint, shift)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($rows as $r) {
          $mn = (string)$r['material_number'];
          if ($mn === '') continue;

          $shift = self::lookupShiftByMaterial($mn) ?? '';
          if ($shift === '') $hasMissing = true;

          $ins->execute([
            $batchId,
            $withdrawDate,
            $r['voucher'] ?? '',
            $mn,
            $r['material_name'] ?? '',
            (float)($r['collar_new'] ?? 0),
            (float)($r['collar_old'] ?? 0),
            (float)($r['recede_new'] ?? 0),
            (float)($r['recede_old'] ?? 0),
            (float)($r['scrap'] ?? 0),
            (float)($r['footprint'] ?? 0),
            $shift
          ]);
        }
      }

      $pdo->commit();

      return [
        'has_missing_shift' => $hasMissing,
        'batch_ids' => $batchIds
      ];
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  private static function lookupShiftByMaterial(string $mn): ?string
  {
    $st = db()->prepare(
      "SELECT shift FROM mat_materials WHERE material_number = ? LIMIT 1"
    );
    $st->execute([$mn]);
    $row = $st->fetch();
    return $row ? (string)$row['shift'] : null;
  }
}
