<?php

/**
 * Path: app/services/mat/MatIssueService.php
 * 說明: Mat Issue 厚層（SQL/交易/規則集中）
 */

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\IOFactory;

final class MatIssueService
{
  public static function listDates(): array
  {
    $sql = "SELECT DISTINCT withdraw_date
            FROM mat_issue_batches
            ORDER BY withdraw_date DESC";
    $rows = db()->query($sql)->fetchAll();
    $dates = [];
    foreach ($rows as $r) $dates[] = (string)$r['withdraw_date'];
    return ['dates' => $dates];
  }

  public static function listBatchesByDate(string $withdrawDate): array
  {
    $sql = "SELECT
          b.batch_id,
          b.withdraw_date,
          b.original_filename,
          b.file_type,
          b.uploaded_at,
          (SELECT COUNT(*) FROM mat_issue_items i WHERE i.batch_id = b.batch_id) AS items_count,

          /* 取一個代表 voucher（通常同批會一致；若不一致也至少能顯示其中一筆） */
          (SELECT MIN(NULLIF(TRIM(i2.voucher), ''))
             FROM mat_issue_items i2
            WHERE i2.batch_id = b.batch_id) AS voucher_first,

          /* voucher 去重後的數量（用來決定要不要顯示「等 N 單」） */
          (SELECT COUNT(DISTINCT NULLIF(TRIM(i3.voucher), ''))
             FROM mat_issue_items i3
            WHERE i3.batch_id = b.batch_id) AS voucher_cnt
        FROM mat_issue_batches b
        WHERE b.withdraw_date = ?
        ORDER BY b.batch_id DESC";
    $st = db()->prepare($sql);
    $st->execute([$withdrawDate]);
    return ['batches' => $st->fetchAll()];
  }

  public static function deleteBatch(int $batchId): array
  {
    $pdo = db();
    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("DELETE FROM mat_issue_batches WHERE batch_id = ?");
      $st->execute([$batchId]);

      if ($st->rowCount() <= 0) {
        $pdo->rollBack();
        throw new RuntimeException('找不到批次或已刪除');
      }

      $pdo->commit();
      return ['batch_id' => $batchId];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  public static function deleteAllByDate(string $withdrawDate): array
  {
    $pdo = db();
    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("DELETE FROM mat_issue_batches WHERE withdraw_date = ?");
      $st->execute([$withdrawDate]);

      // DELETE batches 後，items 會因 fk ON DELETE CASCADE 自動清掉
      $deletedBatches = (int)$st->rowCount();

      $pdo->commit();
      return [
        'withdraw_date' => $withdrawDate,
        'deleted_batches' => $deletedBatches
      ];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  /**
   * 缺 shift 清單
   * - 預設：用 withdraw_date 查（保留既有前端行為）
   * - 若提供 batchIds：只查「本次匯入」範圍
   */
  public static function listMissingShifts(string $withdrawDate, array $batchIds = []): array
  {
    $pdo = db();

    $where = "WHERE withdraw_date = ?
                AND (shift IS NULL OR shift = '')";
    $params = [$withdrawDate];

    $batchIds = self::normalize_int_ids($batchIds);
    if (!empty($batchIds)) {
      $in = implode(',', array_fill(0, count($batchIds), '?'));
      $where .= " AND batch_id IN ($in)";
      $params = array_merge($params, $batchIds);
    }

    $sql = "SELECT material_number,
                   MAX(material_name) AS material_name,
                   COUNT(*) AS missing_count
            FROM mat_issue_items
            $where
            GROUP BY material_number
            ORDER BY material_number ASC";
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $missing = $st->fetchAll();

    $p = $pdo->query("SELECT shift_code, person_name
                      FROM mat_personnel
                      ORDER BY shift_code ASC")->fetchAll();

    return [
      'missing' => $missing,
      'personnel' => $p
    ];
  }

  /**
   * 依「本次匯入範圍」補齊 shift（逐筆指定）
   *
   * items: [
   *   ['material_number'=>..., 'material_name'=>..., 'shift_code'=>...],
   *   ...
   * ]
   *
   * 行為（你定版的 5 點）：
   * - 對每個唯一 material_number（去重後）：
   *   1) 更新 mat_issue_items.shift：僅限本次 batch_ids 範圍內、同 material_number 且 shift 空白
   *   2) upsert mat_materials：material_number/material_name/shift（shift=shift_code）
   */
  public static function saveShift(string $withdrawDate, array $items, array $batchIds): array
  {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
      throw new InvalidArgumentException('withdraw_date 格式不正確（YYYY-MM-DD）');
    }

    $batchIds = self::normalize_int_ids($batchIds);
    if (empty($batchIds)) {
      throw new InvalidArgumentException('batch_ids 不可為空（需限定本次匯入範圍）');
    }

    if (!is_array($items) || empty($items)) {
      throw new InvalidArgumentException('items 不可為空');
    }

    // 去重：material_number 為 key（同材編只留第一筆）
    $uniq = [];
    foreach ($items as $it) {
      $mn = trim((string)($it['material_number'] ?? ''));
      if ($mn === '') continue;
      if (isset($uniq[$mn])) continue;

      $code = strtoupper(trim((string)($it['shift_code'] ?? '')));
      if ($code === '' || strlen($code) !== 1) {
        throw new InvalidArgumentException('shift_code 不正確');
      }

      $mname = (string)($it['material_name'] ?? '');
      $uniq[$mn] = ['material_number' => $mn, 'material_name' => $mname, 'shift_code' => $code];
    }
    if (empty($uniq)) {
      throw new InvalidArgumentException('items 不可為空');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
      // upsert mat_materials（依你定版：material_number 唯一，直接 upsert）
      $upsert = $pdo->prepare(
        "INSERT INTO mat_materials (material_number, material_name, shift, material_location)
         VALUES (?, ?, ?, '')
         ON DUPLICATE KEY UPDATE
           material_name = VALUES(material_name),
           shift = VALUES(shift)"
      );

      // 更新 mat_issue_items（限定本次 batch_ids + shift 空白 + 同材編）
      $batchIn = implode(',', array_fill(0, count($batchIds), '?'));

      $upd = $pdo->prepare(
        "UPDATE mat_issue_items
         SET shift = ?
         WHERE withdraw_date = ?
           AND batch_id IN ($batchIn)
           AND (shift IS NULL OR shift = '')
           AND material_number = ?"
      );

      $updatedItems = 0;

      foreach ($uniq as $mn => $row) {
        $shiftCode = $row['shift_code'];
        $mname = $row['material_name'];

        // 1) 主檔 upsert
        $upsert->execute([$mn, $mname, $shiftCode]);

        // 2) 明細回填（本次 batch 範圍）
        $params = array_merge([$shiftCode, $withdrawDate], $batchIds, [$mn]);
        $upd->execute($params);
        $updatedItems += (int)$upd->rowCount();
      }

      $pdo->commit();
      return [
        'updated_items' => $updatedItems,
        'unique_materials' => count($uniq)
      ];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  /**
   * 匯入多檔
   * - 建 batch
   * - 寫 items
   * - shift 比對：存在 mat_materials.shift → 帶入；否則 shift=''
   * ✅ 回傳：batch_ids（本次匯入建立的批次清單）
   */
  public static function importFiles(string $withdrawDate, array $files, ?int $uploadedBy): array
  {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $withdrawDate)) {
      throw new InvalidArgumentException('withdraw_date 格式不正確（YYYY-MM-DD）');
    }
    if (empty($files)) {
      throw new InvalidArgumentException('未收到檔案');
    }

    $pdo = db();
    $pdo->beginTransaction();

    $sumInserted = 0;
    $sumSkipped = 0;
    $sumErrors = 0;

    $hasMissing = false;
    $batchIds = [];

    try {
      require_once __DIR__ . '/issue/IssueImportManager.php';
      $manager = new IssueImportManager();

      foreach ($files as $f) {
        $tmp = $f['tmp_name'] ?? '';
        $name = $f['name'] ?? '';
        $err  = $f['error'] ?? UPLOAD_ERR_NO_FILE;

        if ($err !== UPLOAD_ERR_OK || !is_string($tmp) || $tmp === '' || !is_file($tmp)) {
          $sumErrors++;
          continue;
        }

        $originalFilename = basename((string)$name);
        $fileType = strtoupper(substr($originalFilename, 0, 1));
        if ($fileType === '' || strlen($fileType) !== 1) $fileType = 'T';

        // 同日+同檔名：重新匯入 → 刪舊批次
        $dupSt = $pdo->prepare(
          "SELECT batch_id
             FROM mat_issue_batches
            WHERE withdraw_date = ?
              AND original_filename = ?"
        );
        $dupSt->execute([$withdrawDate, $originalFilename]);
        $dupRows = $dupSt->fetchAll();

        if (!empty($dupRows)) {
          $del = $pdo->prepare("DELETE FROM mat_issue_batches WHERE batch_id = ?");
          foreach ($dupRows as $dr) {
            $oldBatchId = (int)($dr['batch_id'] ?? 0);
            if ($oldBatchId > 0) $del->execute([$oldBatchId]);
          }
        }

        // create batch
        $st = $pdo->prepare(
          "INSERT INTO mat_issue_batches (withdraw_date, original_filename, file_type, uploaded_by)
           VALUES (?, ?, ?, ?)"
        );
        $st->execute([$withdrawDate, $originalFilename, $fileType, $uploadedBy]);
        $batchId = (int)$pdo->lastInsertId();
        $batchIds[] = $batchId;

        // parse
        $parser = $manager->getParser($fileType);

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tmp);
        $sheet = $spreadsheet->getSheet(0);

        $rows = $parser->parse($sheet);

        $ins = $pdo->prepare(
          "INSERT INTO mat_issue_items
           (batch_id, withdraw_date, voucher, material_number, material_name,
            collar_new, collar_old, recede_new, recede_old, scrap, footprint, shift)
           VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($rows as $r) {
          $voucher = (string)($r['voucher'] ?? '');
          $mn = (string)($r['material_number'] ?? '');
          $mname = (string)($r['material_name'] ?? '');

          if ($mn === '') {
            $sumSkipped++;
            continue;
          }

          $shift = self::lookupShiftByMaterial($mn);
          if ($shift === null || $shift === '') {
            $shift = '';
            $hasMissing = true;
          }

          $ins->execute([
            $batchId,
            $withdrawDate,
            $voucher,
            $mn,
            $mname,
            (float)($r['collar_new'] ?? 0),
            (float)($r['collar_old'] ?? 0),
            (float)($r['recede_new'] ?? 0),
            (float)($r['recede_old'] ?? 0),
            (float)($r['scrap'] ?? 0),
            (float)($r['footprint'] ?? 0),
            $shift
          ]);

          $sumInserted++;
        }
      }

      $pdo->commit();

      return [
        'summary' => [
          'inserted' => $sumInserted,
          'skipped'  => $sumSkipped,
          'errors'   => $sumErrors,
        ],
        'has_missing_shift' => $hasMissing,
        'batch_ids' => $batchIds
      ];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  private static function lookupShiftByMaterial(string $materialNumber): ?string
  {
    $st = db()->prepare("SELECT shift FROM mat_materials WHERE material_number = ? LIMIT 1");
    $st->execute([$materialNumber]);
    $row = $st->fetch();
    if (!$row) return null;
    $v = $row['shift'];
    if ($v === null) return null;
    return (string)$v;
  }

  /** @return array<int,int> */
  private static function normalize_int_ids($ids): array
  {
    if (!is_array($ids)) return [];
    $out = [];
    foreach ($ids as $v) {
      $n = (int)$v;
      if ($n > 0) $out[] = $n;
    }
    // unique
    $out = array_values(array_unique($out));
    return $out;
  }
}
