<?php

/**
 * Path: app/services/VehicleService.php
 * 說明: 車輛管理服務（基本資料 / 檢查 / 照片）
 *
 * DB tables:
 * - vehicle_vehicles
 * - vehicle_vehicle_types
 * - vehicle_brands
 * - vehicle_boom_types
 * - vehicle_inspection_types
 * - vehicle_vehicle_inspections
 * - vehicle_vehicle_inspection_rules
 *
 * storage:
 * - storage/uploads/vehicles/vehicle_{id}.jpg  (與 app/ 同層的 storage/)
 */

declare(strict_types=1);

final class VehicleService
{
  /** 將到期門檻（天） */
  private const DUE_SOON_DAYS = 30;

  public static function getDicts(): array
  {
    $pdo = db();

    $types = $pdo->query("
      SELECT id, name, sort_no, is_enabled
      FROM vehicle_vehicle_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $brands = $pdo->query("
      SELECT id, name, sort_no, is_enabled
      FROM vehicle_brands
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $boomTypes = $pdo->query("
      SELECT id, name, sort_no, is_enabled
      FROM vehicle_boom_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $inspectionTypes = $pdo->query("
      SELECT type_id, type_key, type_name, sort_no, is_enabled
      FROM vehicle_inspection_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, type_id ASC
    ")->fetchAll();

    return [
      'types' => $types,
      'brands' => $brands,
      'boom_types' => $boomTypes,
      'inspection_types' => $inspectionTypes,
      'due_soon_days' => self::DUE_SOON_DAYS,
    ];
  }

  /**
   * 左側清單：vehicles + 檢查聚合（逾期/將到期/正常/免檢）
   */
  public static function listVehiclesWithInspectionAgg(): array
  {
    $pdo = db();

    // 先撈 vehicles + 字典名稱（快）
    $rows = $pdo->query("
      SELECT
        v.id,
        v.vehicle_code,
        v.plate_no,
        v.owner_name,
        v.user_name,
        v.vehicle_type_id,
        v.brand_id,
        v.boom_type_id,
        v.is_active,
        UNIX_TIMESTAMP(v.updated_at) AS updated_ts,
        vt.name AS type_name,
        vb.name AS brand_name,
        bt.name AS boom_type_name
      FROM vehicle_vehicles v
      LEFT JOIN vehicle_vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN vehicle_brands vb ON vb.id = v.brand_id
      LEFT JOIN vehicle_boom_types bt ON bt.id = v.boom_type_id
      ORDER BY v.vehicle_code ASC
    ")->fetchAll();

    if (!$rows) {
      return ['vehicles' => []];
    }

    // 再撈檢查狀態（用 rules 決定 required，沒 rule ＝ required）
    $vehicleIds = array_map(static fn($r) => (int)$r['id'], $rows);
    $in = implode(',', array_fill(0, count($vehicleIds), '?'));

    $sql = "
      SELECT
        t.type_id,
        t.type_key,
        t.type_name,
        v.id AS vehicle_id,
        COALESCE(r.is_required, 1) AS is_required,
        i.due_date
      FROM vehicle_vehicles v
      JOIN vehicle_inspection_types t ON t.is_enabled = 1
      LEFT JOIN vehicle_vehicle_inspection_rules r
        ON r.vehicle_id = v.id AND r.type_id = t.type_id
      LEFT JOIN vehicle_vehicle_inspections i
        ON i.vehicle_id = v.id AND i.type_id = t.type_id
      WHERE v.id IN ($in)
      ORDER BY v.id ASC, t.sort_no ASC, t.type_id ASC
    ";

    $st = $pdo->prepare($sql);
    foreach ($vehicleIds as $idx => $vid) $st->bindValue($idx + 1, $vid, PDO::PARAM_INT);
    $st->execute();
    $inspRows = $st->fetchAll();

    // 聚合
    $byVehicle = [];
    foreach ($vehicleIds as $vid) {
      $byVehicle[$vid] = ['OVERDUE' => 0, 'DUE_SOON' => 0, 'OK' => 0, 'NA' => 0, 'UNSET' => 0];
    }

    $today = new DateTimeImmutable('today');
    $soonDate = $today->modify('+' . self::DUE_SOON_DAYS . ' days');

    foreach ($inspRows as $r) {
      $vid = (int)$r['vehicle_id'];
      $required = ((int)$r['is_required'] === 1);

      if (!$required) {
        $byVehicle[$vid]['NA']++;
        continue;
      }

      $due = $r['due_date'] ? new DateTimeImmutable((string)$r['due_date']) : null;
      if (!$due) {
        $byVehicle[$vid]['UNSET']++;
        continue;
      }

      if ($due < $today) $byVehicle[$vid]['OVERDUE']++;
      else if ($due <= $soonDate) $byVehicle[$vid]['DUE_SOON']++;
      else $byVehicle[$vid]['OK']++;
    }

    // 回填到 rows
    foreach ($rows as &$v) {
      $vid = (int)$v['id'];
      $agg = $byVehicle[$vid] ?? ['OVERDUE' => 0, 'DUE_SOON' => 0, 'OK' => 0, 'NA' => 0, 'UNSET' => 0];

      $v['overdue_count'] = (int)$agg['OVERDUE'];
      $v['soon_count'] = (int)$agg['DUE_SOON'];
      $v['ok_count'] = (int)$agg['OK'];
      $v['na_count'] = (int)$agg['NA'];
      $v['unset_count'] = (int)$agg['UNSET'];
    }
    unset($v);

    return ['vehicles' => $rows];
  }

  /**
   * 右側 bundle：vehicle + inspections(status) + rules(map)
   */
  public static function getVehicleBundle(int $vehicleId): ?array
  {
    $pdo = db();

    $st = $pdo->prepare("
      SELECT
        v.*,
        vt.name AS type_name,
        vb.name AS brand_name,
        bt.name AS boom_type_name
      FROM vehicle_vehicles v
      LEFT JOIN vehicle_vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN vehicle_brands vb ON vb.id = v.brand_id
      LEFT JOIN vehicle_boom_types bt ON bt.id = v.boom_type_id
      WHERE v.id = ?
      LIMIT 1
    ");
    $st->execute([$vehicleId]);
    $v = $st->fetch();
    if (!$v) return null;

    // rules
    $rst = $pdo->prepare("
      SELECT type_id, is_required
      FROM vehicle_vehicle_inspection_rules
      WHERE vehicle_id = ?
    ");
    $rst->execute([$vehicleId]);
    $rulesRows = $rst->fetchAll();

    $rules = [];
    foreach ($rulesRows as $rr) {
      $rules[(string)$rr['type_id']] = (int)$rr['is_required'];
    }

    // inspections with computed status
    $inspections = self::listInspectionsForVehicle($vehicleId);

    // photo_url（對外可直接用；用 updated_at 做 cache-busting）
    $v['photo_url'] = self::photoUrlFromRow($v);

    return [
      'vehicle' => $v,
      'rules' => $rules,
      'inspections' => $inspections,
      'due_soon_days' => self::DUE_SOON_DAYS,
    ];
  }

  public static function createVehicle(array $body): array
  {
    $pdo = db();

    $vehicleCode = isset($body['vehicle_code']) ? trim((string)$body['vehicle_code']) : '';
    if ($vehicleCode === '') {
      throw new RuntimeException('vehicle_code 不可為空');
    }
    // ✅ 正規化：去空白、轉大寫、允許 A01 / A-01 → 一律 A-01
    $vehicleCode = strtoupper(preg_replace('/\s+/', '', $vehicleCode));

    // A01 → A-01
    if (preg_match('/^[A-Z]\d{2}$/', $vehicleCode)) {
      $vehicleCode = substr($vehicleCode, 0, 1) . '-' . substr($vehicleCode, 1, 2);
    }

    // 最終格式必須 A-01
    if (!preg_match('/^[A-Z]-\d{2}$/', $vehicleCode)) {
      throw new RuntimeException('車輛編號格式不正確（例：A-01）');
    }

    // 先擋重複（也會被 UNIQUE 擋，但這樣訊息更友善）
    $stDup = $pdo->prepare("SELECT 1 FROM vehicle_vehicles WHERE vehicle_code = ? LIMIT 1");
    $stDup->execute([$vehicleCode]);
    if ($stDup->fetchColumn()) {
      throw new RuntimeException('車輛編號已存在，請更換');
    }

    $plate = isset($body['plate_no']) ? trim((string)$body['plate_no']) : null;
    $owner = isset($body['owner_name']) ? trim((string)$body['owner_name']) : null;
    $user  = isset($body['user_name']) ? trim((string)$body['user_name']) : null;

    $vehicleTypeId = self::toNullableInt($body['vehicle_type_id'] ?? null);
    $brandId       = self::toNullableInt($body['brand_id'] ?? null);
    $boomTypeId    = self::toNullableInt($body['boom_type_id'] ?? null);

    $tonnage = self::toNullableDecimal($body['tonnage'] ?? null);
    $year    = self::toNullableInt($body['vehicle_year'] ?? null);

    $vehiclePrice = self::toNullableDecimal($body['vehicle_price'] ?? null);
    $boomPrice    = self::toNullableDecimal($body['boom_price'] ?? null);
    $bucketPrice  = self::toNullableDecimal($body['bucket_price'] ?? null);

    $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;
    $note     = isset($body['note']) ? trim((string)$body['note']) : null;

    $st = $pdo->prepare("
    INSERT INTO vehicle_vehicles
      (vehicle_code, plate_no, vehicle_type_id, brand_id, boom_type_id,
       owner_name, user_name, tonnage, vehicle_year,
       vehicle_price, boom_price, bucket_price, is_active, note)
    VALUES
      (:vehicle_code, :plate_no, :vehicle_type_id, :brand_id, :boom_type_id,
       :owner_name, :user_name, :tonnage, :vehicle_year,
       :vehicle_price, :boom_price, :bucket_price, :is_active, :note)
  ");

    $st->execute([
      ':vehicle_code' => $vehicleCode,
      ':plate_no' => ($plate === '') ? null : $plate,
      ':vehicle_type_id' => $vehicleTypeId,
      ':brand_id' => $brandId,
      ':boom_type_id' => $boomTypeId,
      ':owner_name' => ($owner === '') ? null : $owner,
      ':user_name' => ($user === '') ? null : $user,
      ':tonnage' => $tonnage,
      ':vehicle_year' => $year,
      ':vehicle_price' => $vehiclePrice,
      ':boom_price' => $boomPrice,
      ':bucket_price' => $bucketPrice,
      ':is_active' => ($isActive === 1) ? 1 : 0,
      ':note' => ($note === '') ? null : $note,
    ]);

    $newId = (int)$pdo->lastInsertId();
    $bundle = self::getVehicleBundle($newId);
    if (!$bundle) {
      throw new RuntimeException('新增成功但讀取失敗');
    }
    return $bundle;
  }

  public static function saveVehicle(int $id, array $body): array
  {
    $pdo = db();

    // 基本防呆（你需要更嚴格再加）
    $plate = isset($body['plate_no']) ? trim((string)$body['plate_no']) : null;
    $owner = isset($body['owner_name']) ? trim((string)$body['owner_name']) : null;
    $user = isset($body['user_name']) ? trim((string)$body['user_name']) : null;

    $vehicleTypeId = self::toNullableInt($body['vehicle_type_id'] ?? null);
    $brandId = self::toNullableInt($body['brand_id'] ?? null);
    $boomTypeId = self::toNullableInt($body['boom_type_id'] ?? null);

    $tonnage = self::toNullableDecimal($body['tonnage'] ?? null);
    $year = self::toNullableInt($body['vehicle_year'] ?? null);

    $vehiclePrice = self::toNullableDecimal($body['vehicle_price'] ?? null);
    $boomPrice = self::toNullableDecimal($body['boom_price'] ?? null);
    $bucketPrice = self::toNullableDecimal($body['bucket_price'] ?? null);

    $isActive = isset($body['is_active']) ? (int)$body['is_active'] : 1;
    $note = isset($body['note']) ? trim((string)$body['note']) : null;

    $st = $pdo->prepare("
      UPDATE vehicle_vehicles
      SET
        plate_no = :plate_no,
        vehicle_type_id = :vehicle_type_id,
        brand_id = :brand_id,
        boom_type_id = :boom_type_id,
        owner_name = :owner_name,
        user_name = :user_name,
        tonnage = :tonnage,
        vehicle_year = :vehicle_year,
        vehicle_price = :vehicle_price,
        boom_price = :boom_price,
        bucket_price = :bucket_price,
        is_active = :is_active,
        note = :note
      WHERE id = :id
      LIMIT 1
    ");

    $st->execute([
      ':plate_no' => ($plate === '') ? null : $plate,
      ':vehicle_type_id' => $vehicleTypeId,
      ':brand_id' => $brandId,
      ':boom_type_id' => $boomTypeId,
      ':owner_name' => ($owner === '') ? null : $owner,
      ':user_name' => ($user === '') ? null : $user,
      ':tonnage' => $tonnage,
      ':vehicle_year' => $year,
      ':vehicle_price' => $vehiclePrice,
      ':boom_price' => $boomPrice,
      ':bucket_price' => $bucketPrice,
      ':is_active' => ($isActive === 1) ? 1 : 0,
      ':note' => ($note === '') ? null : $note,
      ':id' => $id
    ]);

    // 回傳最新 row（含字典名稱）
    $bundle = self::getVehicleBundle($id);
    if (!$bundle || !isset($bundle['vehicle'])) {
      throw new RuntimeException('儲存成功但讀取失敗');
    }

    return $bundle['vehicle'];
  }

  /**
   * 儲存單項檢查到期日（UPSERT）
   * 回傳該車 inspections（含 status）
   */
  public static function saveInspectionDueDate(int $vehicleId, int $typeId, ?string $dueDate): array
  {
    $pdo = db();

    // 若該項目不需要檢查，前端已 disabled；後端仍再保底允許寫入但不建議
    $st = $pdo->prepare("
      INSERT INTO vehicle_vehicle_inspections (vehicle_id, type_id, due_date)
      VALUES (:vehicle_id, :type_id, :due_date)
      ON DUPLICATE KEY UPDATE
        due_date = VALUES(due_date),
        updated_at = CURRENT_TIMESTAMP()
    ");
    $st->execute([
      ':vehicle_id' => $vehicleId,
      ':type_id' => $typeId,
      ':due_date' => $dueDate
    ]);

    return self::listInspectionsForVehicle($vehicleId);
  }

  /**
   * 取得該車 inspections（帶 status 與 is_required）
   */
  public static function listInspectionsForVehicle(int $vehicleId): array
  {
    $pdo = db();

    $st = $pdo->prepare("
      SELECT
        t.type_id,
        t.type_key,
        t.type_name,
        t.sort_no,
        v.id AS vehicle_id,
        COALESCE(r.is_required, 1) AS is_required,
        i.due_date
      FROM vehicle_vehicles v
      JOIN vehicle_inspection_types t ON t.is_enabled = 1
      LEFT JOIN vehicle_vehicle_inspection_rules r
        ON r.vehicle_id = v.id AND r.type_id = t.type_id
      LEFT JOIN vehicle_vehicle_inspections i
        ON i.vehicle_id = v.id AND i.type_id = t.type_id
      WHERE v.id = ?
      ORDER BY t.sort_no ASC, t.type_id ASC
    ");
    $st->execute([$vehicleId]);
    $rows = $st->fetchAll();

    $today = new DateTimeImmutable('today');
    $soonDate = $today->modify('+' . self::DUE_SOON_DAYS . ' days');

    foreach ($rows as &$r) {
      $required = ((int)$r['is_required'] === 1);
      if (!$required) {
        $r['status'] = 'NA';
        continue;
      }

      $due = $r['due_date'] ? new DateTimeImmutable((string)$r['due_date']) : null;
      if (!$due) {
        $r['status'] = 'UNSET';
        continue;
      }

      if ($due < $today) $r['status'] = 'OVERDUE';
      else if ($due <= $soonDate) $r['status'] = 'DUE_SOON';
      else $r['status'] = 'OK';
    }
    unset($r);

    return $rows;
  }

  /**
   * 照片覆蓋上傳：storage/uploads/vehicles/vehicle_{id}.jpg
   * 回傳 photo_url（含 cache-busting）
   *
   * ✅ 新增：若 DB 原本 photo_path 指向舊檔名（例如 KEQ-2562.jpg），在更新成功後刪除舊檔
   */
  public static function uploadVehiclePhoto(int $vehicleId, array $file): string
  {
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
      throw new RuntimeException('上傳檔案無效');
    }

    // 檔案大小
    $size = (int)($file['size'] ?? 0);
    if ($size <= 0) throw new RuntimeException('檔案大小為 0');
    if ($size > 6 * 1024 * 1024) throw new RuntimeException('檔案過大（上限 6MB）');

    $pdo = db();

    // ✅ 先讀舊路徑（用於事後刪舊檔）
    $oldPhotoPath = '';
    $stOld = $pdo->prepare("SELECT photo_path FROM vehicle_vehicles WHERE id = ? LIMIT 1");
    $stOld->execute([$vehicleId]);
    $oldRow = $stOld->fetch();
    if ($oldRow && isset($oldRow['photo_path'])) {
      $oldPhotoPath = trim((string)$oldRow['photo_path']);
    }

    // 目標目錄：{projectRoot}/storage/uploads/vehicles
    $projectRoot = dirname(__DIR__, 2); // app/services -> app -> project root
    $dir = $projectRoot . '/storage/uploads/vehicles';
    if (!is_dir($dir)) {
      if (!mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('建立 storage 目錄失敗');
      }
    }

    $newPhotoPath = 'storage/uploads/vehicles/vehicle_' . $vehicleId . '.jpg';
    $targetFs = $projectRoot . '/' . $newPhotoPath;

    // 轉 jpg（確保一致覆蓋）
    $tmp = $file['tmp_name'];
    $imgInfo = @getimagesize($tmp);
    if (!$imgInfo) throw new RuntimeException('不支援的圖片格式');

    $mime = (string)($imgInfo['mime'] ?? '');
    $src = null;
    if ($mime === 'image/jpeg') $src = @imagecreatefromjpeg($tmp);
    else if ($mime === 'image/png') $src = @imagecreatefrompng($tmp);
    else if ($mime === 'image/webp') $src = @imagecreatefromwebp($tmp);

    if (!$src) throw new RuntimeException('圖片讀取失敗');

    // 以原尺寸輸出 jpg（品質 85）
    if (!@imagejpeg($src, $targetFs, 85)) {
      imagedestroy($src);
      throw new RuntimeException('寫入 JPG 失敗');
    }
    imagedestroy($src);

    // DB 更新 photo_path
    $st = $pdo->prepare("
      UPDATE vehicle_vehicles
      SET photo_path = :p
      WHERE id = :id
      LIMIT 1
    ");
    $st->execute([':p' => $newPhotoPath, ':id' => $vehicleId]);

    // ✅ 刪除舊檔（安全白名單：只允許刪 storage/uploads/vehicles/ 內的檔）
    if ($oldPhotoPath !== '' && $oldPhotoPath !== $newPhotoPath) {
      $prefix = 'storage/uploads/vehicles/';
      $oldNorm = ltrim($oldPhotoPath, '/');
      if (str_starts_with($oldNorm, $prefix)) {
        $oldFs = $projectRoot . '/' . $oldNorm;

        // 防呆：避免路徑跳脫
        $realBase = realpath($projectRoot . '/' . $prefix);
        $realOld  = $oldFs && file_exists($oldFs) ? realpath($oldFs) : false;

        if ($realBase && $realOld && str_starts_with($realOld, $realBase) && is_file($realOld)) {
          @unlink($realOld);
        }
      }
    }

    // 回傳可直接顯示的 URL（走 BASE_URL）
    return self::publicUrl($newPhotoPath) . '?v=' . (is_file($targetFs) ? (int)@filemtime($targetFs) : time());
  }

  /* ----------------- helpers ----------------- */

  private static function photoUrlFromRow(array $v): string
  {
    $p = isset($v['photo_path']) ? trim((string)$v['photo_path']) : '';
    if ($p === '') return '';

    // ✅ 用檔案最後修改時間做 cache busting（最準，與 DB 無關）
    $projectRoot = dirname(__DIR__, 2); // app/services -> app -> project root
    $fs = $projectRoot . '/' . ltrim($p, '/');
    $ts = (is_file($fs)) ? (int)@filemtime($fs) : 0;

    // fallback：沒有檔案時才用 updated_at
    if ($ts <= 0 && !empty($v['updated_at'])) {
      $ts = (int)strtotime((string)$v['updated_at']);
    }
    if ($ts <= 0) $ts = time();

    return self::publicUrl($p) . '?v=' . $ts;
  }

  private static function publicUrl(string $path): string
  {
    $base = base_url();
    $base = ($base !== '') ? rtrim($base, '/') : '';
    $path = '/' . ltrim($path, '/');
    return $base . $path;
  }

  private static function toNullableInt($v): ?int
  {
    if ($v === null || $v === '') return null;
    $n = (int)$v;
    return ($n > 0) ? $n : null;
  }

  private static function toNullableDecimal($v): ?string
  {
    if ($v === null || $v === '') return null;
    // 保留兩位（DB DECIMAL(14,2)）
    $n = (float)$v;
    return number_format($n, 2, '.', '');
  }
}
