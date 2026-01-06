<?php
/**
 * Path: app/services/mat/MatIssueService.php
 * 說明: Mat Issue 厚層（SQL/交易/規則集中）
 */

declare(strict_types=1);

// require_once __DIR__ . '/issue/IssueImportManager.php';

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
    $sql = "SELECT b.batch_id, b.withdraw_date, b.original_filename, b.file_type, b.uploaded_at,
                   (SELECT COUNT(*) FROM mat_issue_items i WHERE i.batch_id = b.batch_id) AS items_count
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
      // FK cascade will remove items, but we still delete parent explicitly
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

  public static function listMissingShifts(string $withdrawDate): array
  {
    // missing list
    $sql = "SELECT material_number,
                   MAX(material_name) AS material_name,
                   COUNT(*) AS missing_count
            FROM mat_issue_items
            WHERE withdraw_date = ?
              AND (shift IS NULL OR shift = '')
            GROUP BY material_number
            ORDER BY missing_count DESC, material_number ASC";
    $st = db()->prepare($sql);
    $st->execute([$withdrawDate]);
    $missing = $st->fetchAll();

    // personnel list
    $p = db()->query("SELECT shift_code, person_name
                      FROM mat_personnel
                      ORDER BY shift_code ASC")->fetchAll();

    return [
      'missing' => $missing,
      'personnel' => $p
    ];
  }

  public static function saveShift(string $withdrawDate, string $shiftCode, array $materialNumbers): array
  {
    $shiftCode = strtoupper(trim($shiftCode));
    if ($shiftCode === '' || strlen($shiftCode) !== 1) {
      throw new InvalidArgumentException('shift_code 不正確');
    }
    if (empty($materialNumbers)) {
      throw new InvalidArgumentException('material_numbers 不可為空');
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
      // 1) upsert mat_materials.shift = shiftCode
      //    若材料不存在 mat_materials，則建立一筆（只填 material_number, shift, material_location=''）
      $upsert = $pdo->prepare(
        "INSERT INTO mat_materials (material_number, shift, material_location)
         VALUES (?, ?, '')
         ON DUPLICATE KEY UPDATE shift = VALUES(shift)"
      );

      foreach ($materialNumbers as $mn) {
        $mn = trim((string)$mn);
        if ($mn === '') continue;
        $upsert->execute([$mn, $shiftCode]);
      }

      // 2) 回填 mat_issue_items.shift（僅限本 withdraw_date 且 shift 空白的同 material_number）
      // build IN (...)
      $clean = [];
      foreach ($materialNumbers as $mn) {
        $mn = trim((string)$mn);
        if ($mn !== '') $clean[] = $mn;
      }
      if (empty($clean)) {
        $pdo->rollBack();
        throw new InvalidArgumentException('material_numbers 不可為空');
      }

      $in = implode(',', array_fill(0, count($clean), '?'));
      $params = array_merge([$shiftCode, $withdrawDate], $clean);

      $sql = "UPDATE mat_issue_items
              SET shift = ?
              WHERE withdraw_date = ?
                AND (shift IS NULL OR shift = '')
                AND material_number IN ($in)";
      $st = $pdo->prepare($sql);
      $st->execute($params);
      $updatedItems = $st->rowCount();

      $pdo->commit();

      return [
        'updated_items' => $updatedItems,
        'shift_code' => $shiftCode
      ];
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  /**
   * 匯入多檔
   * - 建 batch
   * - 解析第一張 sheet
   * - 寫 items
   * - shift 比對：存在 mat_materials.shift → 帶入；否則 shift=''
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

    try {
      require_once __DIR__ . '/issue/IssueImportManager.php';
      $manager = new IssueImportManager();

      foreach ($files as $f) {
        // normalize one file structure from $_FILES
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

        // create batch
        $st = $pdo->prepare(
          "INSERT INTO mat_issue_batches (withdraw_date, original_filename, file_type, uploaded_by)
           VALUES (?, ?, ?, ?)"
        );
        $st->execute([$withdrawDate, $originalFilename, $fileType, $uploadedBy]);
        $batchId = (int)$pdo->lastInsertId();

        // parse
        $parser = $manager->getParser($fileType);

        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($tmp);
        $sheet = $spreadsheet->getSheet(0);

        $rows = $parser->parse($sheet);

        // write items
        $ins = $pdo->prepare(
          "INSERT INTO mat_issue_items
           (batch_id, withdraw_date, voucher, material_number, material_name,
            collar_new, collar_old, recede_new, recede_old, scrap, footprint, shift)
           VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($rows as $r) {
          // required
          $voucher = (string)($r['voucher'] ?? '');
          $mn = (string)($r['material_number'] ?? '');
          $mname = (string)($r['material_name'] ?? '');

          if ($mn === '') { $sumSkipped++; continue; }

          // shift lookup
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
        'has_missing_shift' => $hasMissing
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
}
