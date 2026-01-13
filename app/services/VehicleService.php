<?php
/**
 * Path: app/services/VehicleService.php
 * 說明: 車輛模組後端邏輯集中（列表/明細/儲存/檢查/照片）
 */

declare(strict_types=1);

final class VehicleService
{
  public static function dicts(): array
  {
    $pdo = db();

    $vehicleTypes = $pdo->query("
      SELECT id, name
      FROM vehicle_vehicle_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $brands = $pdo->query("
      SELECT id, name
      FROM vehicle_brands
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $boomTypes = $pdo->query("
      SELECT id, name
      FROM vehicle_boom_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, id ASC
    ")->fetchAll();

    $inspectionTypes = $pdo->query("
      SELECT type_id, type_key, type_name
      FROM vehicle_inspection_types
      WHERE is_enabled = 1
      ORDER BY sort_no ASC, type_id ASC
    ")->fetchAll();

    return [
      'vehicle_types' => $vehicleTypes,
      'brands' => $brands,
      'boom_types' => $boomTypes,
      'inspection_types' => $inspectionTypes,
    ];
  }

  public static function listVehicles(string $q = '', bool $activeOnly = true): array
  {
    $pdo = db();

    $where = [];
    $params = [];

    if ($activeOnly) {
      $where[] = 'v.is_active = 1';
    }

    if ($q !== '') {
      $where[] = '(v.vehicle_code LIKE :q OR v.plate_no LIKE :q OR v.owner_name LIKE :q OR v.user_name LIKE :q)';
      $params[':q'] = '%' . $q . '%';
    }

    $sql = "
      SELECT
        v.id, v.vehicle_code, v.plate_no,
        v.owner_name, v.user_name,
        v.is_active,
        v.vehicle_type_id, vt.name AS vehicle_type_name,
        v.brand_id, b.name AS brand_name,
        v.boom_type_id, bt.name AS boom_type_name,
        v.photo_path,
        v.updated_at
      FROM vehicle_vehicles v
      LEFT JOIN vehicle_vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN vehicle_brands b ON b.id = v.brand_id
      LEFT JOIN vehicle_boom_types bt ON bt.id = v.boom_type_id
    ";

    if ($where) $sql .= " WHERE " . implode(' AND ', $where);

    $sql .= " ORDER BY v.is_active DESC, v.vehicle_code ASC, v.id DESC";

    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
  }

  public static function getVehicle(int $id): array
  {
    $pdo = db();

    $st = $pdo->prepare("
      SELECT
        v.*,
        vt.name AS vehicle_type_name,
        b.name AS brand_name,
        bt.name AS boom_type_name
      FROM vehicle_vehicles v
      LEFT JOIN vehicle_vehicle_types vt ON vt.id = v.vehicle_type_id
      LEFT JOIN vehicle_brands b ON b.id = v.brand_id
      LEFT JOIN vehicle_boom_types bt ON bt.id = v.boom_type_id
      WHERE v.id = :id
      LIMIT 1
    ");
    $st->execute([':id' => $id]);
    $vehicle = $st->fetch();

    if (!$vehicle) {
      throw new RuntimeException('找不到車輛資料');
    }

    $st2 = $pdo->prepare("
      SELECT id, vehicle_id, type_id, due_date, updated_at
      FROM vehicle_vehicle_inspections
      WHERE vehicle_id = :vid
      ORDER BY type_id ASC
    ");
    $st2->execute([':vid' => $id]);
    $inspections = $st2->fetchAll();

    $st3 = $pdo->prepare("
      SELECT id, vehicle_id, type_id, is_required, updated_at
      FROM vehicle_vehicle_inspection_rules
      WHERE vehicle_id = :vid
      ORDER BY type_id ASC
    ");
    $st3->execute([':vid' => $id]);
    $rules = $st3->fetchAll();

    return [
      'vehicle' => $vehicle,
      'inspections' => $inspections,
      'rules' => $rules,
    ];
  }

  public static function saveVehicle(array $p): array
  {
    $pdo = db();

    $id = isset($p['id']) && $p['id'] !== '' ? (int)$p['id'] : 0;
    $vehicleCode = trim((string)($p['vehicle_code'] ?? ''));
    if ($vehicleCode === '') {
      throw new RuntimeException('vehicle_code 不可空白');
    }
    if (mb_strlen($vehicleCode) > 10) {
      throw new RuntimeException('vehicle_code 長度不可超過 10');
    }

    // normalize
    $plateNo = self::nullIfEmpty($p['plate_no'] ?? null);
    $vehicleTypeId = self::nullIfEmpty($p['vehicle_type_id'] ?? null);
    $brandId = self::nullIfEmpty($p['brand_id'] ?? null);
    $boomTypeId = self::nullIfEmpty($p['boom_type_id'] ?? null);

    $ownerName = self::nullIfEmpty($p['owner_name'] ?? null);
    $userName = self::nullIfEmpty($p['user_name'] ?? null);

    $tonnage = self::nullIfEmpty($p['tonnage'] ?? null);
    $vehicleYear = self::nullIfEmpty($p['vehicle_year'] ?? null);

    $vehiclePrice = self::nullIfEmpty($p['vehicle_price'] ?? null);
    $boomPrice = self::nullIfEmpty($p['boom_price'] ?? null);
    $bucketPrice = self::nullIfEmpty($p['bucket_price'] ?? null);

    $isActive = (int)(!empty($p['is_active']) ? 1 : 0);
    $note = self::nullIfEmpty($p['note'] ?? null);

    // unique check (vehicle_code)
    if ($id > 0) {
      $chk = $pdo->prepare("SELECT id FROM vehicle_vehicles WHERE vehicle_code = :code AND id <> :id LIMIT 1");
      $chk->execute([':code' => $vehicleCode, ':id' => $id]);
      if ($chk->fetch()) throw new RuntimeException('車輛編號已存在（不可重複）');
    } else {
      $chk = $pdo->prepare("SELECT id FROM vehicle_vehicles WHERE vehicle_code = :code LIMIT 1");
      $chk->execute([':code' => $vehicleCode]);
      if ($chk->fetch()) throw new RuntimeException('車輛編號已存在（不可重複）');
    }

    if ($id > 0) {
      $st = $pdo->prepare("
        UPDATE vehicle_vehicles
        SET
          vehicle_code = :vehicle_code,
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
        ':vehicle_code' => $vehicleCode,
        ':plate_no' => $plateNo,
        ':vehicle_type_id' => $vehicleTypeId,
        ':brand_id' => $brandId,
        ':boom_type_id' => $boomTypeId,
        ':owner_name' => $ownerName,
        ':user_name' => $userName,
        ':tonnage' => $tonnage,
        ':vehicle_year' => $vehicleYear,
        ':vehicle_price' => $vehiclePrice,
        ':boom_price' => $boomPrice,
        ':bucket_price' => $bucketPrice,
        ':is_active' => $isActive,
        ':note' => $note,
        ':id' => $id
      ]);
    } else {
      $st = $pdo->prepare("
        INSERT INTO vehicle_vehicles
        (vehicle_code, plate_no, vehicle_type_id, brand_id, boom_type_id,
         owner_name, user_name, tonnage, vehicle_year,
         vehicle_price, boom_price, bucket_price,
         is_active, note)
        VALUES
        (:vehicle_code, :plate_no, :vehicle_type_id, :brand_id, :boom_type_id,
         :owner_name, :user_name, :tonnage, :vehicle_year,
         :vehicle_price, :boom_price, :bucket_price,
         :is_active, :note)
      ");
      $st->execute([
        ':vehicle_code' => $vehicleCode,
        ':plate_no' => $plateNo,
        ':vehicle_type_id' => $vehicleTypeId,
        ':brand_id' => $brandId,
        ':boom_type_id' => $boomTypeId,
        ':owner_name' => $ownerName,
        ':user_name' => $userName,
        ':tonnage' => $tonnage,
        ':vehicle_year' => $vehicleYear,
        ':vehicle_price' => $vehiclePrice,
        ':boom_price' => $boomPrice,
        ':bucket_price' => $bucketPrice,
        ':is_active' => $isActive,
        ':note' => $note
      ]);
      $id = (int)$pdo->lastInsertId();
    }

    return ['id' => $id];
  }

  public static function saveInspectionsAndRules(int $vehicleId, array $inspections, array $rules): void
  {
    $pdo = db();

    // ensure vehicle exists
    $chk = $pdo->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id LIMIT 1");
    $chk->execute([':id' => $vehicleId]);
    if (!$chk->fetch()) throw new RuntimeException('車輛不存在');

    $pdo->beginTransaction();
    try {
      // inspections upsert
      $stIns = $pdo->prepare("
        INSERT INTO vehicle_vehicle_inspections (vehicle_id, type_id, due_date)
        VALUES (:vehicle_id, :type_id, :due_date)
        ON DUPLICATE KEY UPDATE due_date = VALUES(due_date), updated_at = CURRENT_TIMESTAMP()
      ");

      foreach ($inspections as $row) {
        if (!is_array($row)) continue;
        $typeId = (int)($row['type_id'] ?? 0);
        if ($typeId <= 0) continue;

        $due = $row['due_date'] ?? null;
        $due = self::normalizeDateOrNull($due);

        $stIns->execute([
          ':vehicle_id' => $vehicleId,
          ':type_id' => $typeId,
          ':due_date' => $due
        ]);
      }

      // rules upsert
      $stRule = $pdo->prepare("
        INSERT INTO vehicle_vehicle_inspection_rules (vehicle_id, type_id, is_required)
        VALUES (:vehicle_id, :type_id, :is_required)
        ON DUPLICATE KEY UPDATE is_required = VALUES(is_required), updated_at = CURRENT_TIMESTAMP()
      ");

      foreach ($rules as $row2) {
        if (!is_array($row2)) continue;
        $typeId2 = (int)($row2['type_id'] ?? 0);
        if ($typeId2 <= 0) continue;

        $req = (int)((string)($row2['is_required'] ?? '1') === '0' ? 0 : 1);

        $stRule->execute([
          ':vehicle_id' => $vehicleId,
          ':type_id' => $typeId2,
          ':is_required' => $req
        ]);
      }

      $pdo->commit();
    } catch (Throwable $e) {
      $pdo->rollBack();
      throw $e;
    }
  }

  public static function uploadPhoto(int $vehicleId, array $file): array
  {
    $pdo = db();

    $chk = $pdo->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id LIMIT 1");
    $chk->execute([':id' => $vehicleId]);
    if (!$chk->fetch()) throw new RuntimeException('車輛不存在');

    if (!isset($file['error']) || (int)$file['error'] !== UPLOAD_ERR_OK) {
      throw new RuntimeException('上傳失敗（檔案錯誤碼：' . (int)($file['error'] ?? -1) . '）');
    }

    $tmp = (string)($file['tmp_name'] ?? '');
    $name = (string)($file['name'] ?? '');
    if ($tmp === '' || !is_uploaded_file($tmp)) {
      throw new RuntimeException('上傳失敗（非有效上傳檔）');
    }

    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
      throw new RuntimeException('僅允許 jpg / jpeg / png / webp');
    }

    // storage/uploads/vehicle/{vehicle_id}/photo_{ts}.{ext}
    $root = dirname(__DIR__, 2); // app/
    $storage = $root . '/storage/uploads/vehicle/' . $vehicleId;
    if (!is_dir($storage)) {
      if (!mkdir($storage, 0775, true) && !is_dir($storage)) {
        throw new RuntimeException('建立上傳資料夾失敗');
      }
    }

    $ts = (string)time();
    $filename = 'photo_' . $ts . '.' . $ext;
    $dest = $storage . '/' . $filename;

    if (!move_uploaded_file($tmp, $dest)) {
      throw new RuntimeException('移動檔案失敗');
    }

    // public path via rewrite: /uploads -> /storage/uploads
    $photoPath = '/uploads/vehicle/' . $vehicleId . '/' . $filename;

    $st = $pdo->prepare("UPDATE vehicle_vehicles SET photo_path = :p WHERE id = :id LIMIT 1");
    $st->execute([':p' => $photoPath, ':id' => $vehicleId]);

    return [
      'vehicle_id' => $vehicleId,
      'photo_path' => $photoPath
    ];
  }

  private static function nullIfEmpty($v)
  {
    if ($v === null) return null;
    if (is_bool($v)) return $v ? 1 : 0;

    $s = trim((string)$v);
    if ($s === '') return null;
    return $s;
  }

  private static function normalizeDateOrNull($v): ?string
  {
    if ($v === null) return null;
    $s = trim((string)$v);
    if ($s === '') return null;

    // YYYY-MM-DD only
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
      throw new RuntimeException('日期格式不正確（YYYY-MM-DD）');
    }
    return $s;
  }
}
