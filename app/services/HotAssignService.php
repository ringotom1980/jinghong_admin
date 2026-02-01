<?php

/**
 * Path: app/services/HotAssignService.php
 * 說明: 活電工具配賦（assign）後端服務
 * - 左表：hot_tools 曾配賦過的車（目前仍有配賦者）
 * - 新增車：必須同時配賦至少 1 筆工具
 * - 左表刪除：解除該車全部配賦（vehicle_id -> NULL）
 */

declare(strict_types=1);

final class HotAssignService
{
  /** @var PDO */
  private $db;

  public function __construct(PDO $db)
  {
    $this->db = $db;
  }

  /* =========================
   * 左表：車輛清單（目前有配賦者）
   * ========================= */
  public function listAssignedVehicles(): array
  {
    $sql = "
      SELECT
        v.id,
        v.vehicle_code,
        v.plate_no,
        v.is_active,
        COUNT(t.id) AS assigned_cnt
      FROM hot_tools t
      JOIN vehicle_vehicles v ON v.id = t.vehicle_id
      WHERE t.vehicle_id IS NOT NULL
      GROUP BY v.id
      ORDER BY v.is_active DESC, v.vehicle_code ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 右表：某車已配賦工具
   * ========================= */
  public function listToolsByVehicle(int $vehicleId): array
  {
    $sql = "
      SELECT
        t.id,
        t.tool_no,
        t.inspect_date,
        t.note,
        i.code AS item_code,
        i.name AS item_name,
        i.id AS item_id
      FROM hot_tools t
      JOIN hot_items i ON i.id = t.item_id
      WHERE t.vehicle_id = :vid
      ORDER BY i.code ASC, t.tool_no ASC
    ";
    $st = $this->db->prepare($sql);
    $st->execute([':vid' => $vehicleId]);
    return $st->fetchAll();
  }

  /* =========================
   * 新增車 modal：可選車（排除已存在於 hot_tools.vehicle_id 的車）
   * - 停用車可選
   * ========================= */
  public function listAvailableVehiclesForAdd(): array
  {
    $sql = "
      SELECT
        v.id,
        v.vehicle_code,
        v.plate_no,
        v.is_active
      FROM vehicle_vehicles v
      WHERE v.id NOT IN (
        SELECT DISTINCT vehicle_id FROM hot_tools WHERE vehicle_id IS NOT NULL
      )
      ORDER BY v.is_active DESC, v.vehicle_code ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 新增車 modal：分類統計（A分類：總數/已配賦/可配賦）
   * ========================= */
  public function listItemsCounts(): array
  {
    $sql = "
      SELECT
        i.id,
        i.code,
        i.name,
        COUNT(t.id) AS tool_total,
        SUM(CASE WHEN t.vehicle_id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_cnt,
        SUM(CASE WHEN t.vehicle_id IS NULL THEN 1 ELSE 0 END) AS available_cnt
      FROM hot_items i
      LEFT JOIN hot_tools t ON t.item_id = i.id
      GROUP BY i.id
      ORDER BY i.code ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 取得未配賦工具（可依分類）
   * - 用於「新增配賦」或「新增車」下拉
   * ========================= */
  public function listUnassignedTools(?int $itemId = null): array
  {
    if ($itemId !== null && $itemId > 0) {
      $sql = "
        SELECT t.id, t.tool_no, t.item_id
        FROM hot_tools t
        WHERE t.vehicle_id IS NULL AND t.item_id = :iid
        ORDER BY t.tool_no ASC
      ";
      $st = $this->db->prepare($sql);
      $st->execute([':iid' => $itemId]);
      return $st->fetchAll();
    }

    $sql = "
      SELECT t.id, t.tool_no, t.item_id
      FROM hot_tools t
      WHERE t.vehicle_id IS NULL
      ORDER BY t.item_id ASC, t.tool_no ASC
    ";
    return $this->db->query($sql)->fetchAll();
  }

  /* =========================
   * 新增車（必須至少 1 筆工具）
   * rows: [{tool_id, inspect_date?, note?}]
   * - 批次把選取工具 vehicle_id 設成該車
   * ========================= */
  public function addVehicleWithTools(int $vehicleId, array $rows): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');
    if (!is_array($rows) || count($rows) < 1) throw new InvalidArgumentException('至少需選 1 筆工具');

    $toolIds = [];
    $metaById = [];
    foreach ($rows as $r) {
      $tid = (int)($r['tool_id'] ?? 0);
      if ($tid <= 0) continue;
      $toolIds[] = $tid;

      $inspect = $this->normalizeDateOrNull($r['inspect_date'] ?? null);
      $note = $this->normalizeNoteOrNull($r['note'] ?? null);
      $metaById[$tid] = ['inspect_date' => $inspect, 'note' => $note];
    }
    $toolIds = array_values(array_unique($toolIds));
    if (count($toolIds) < 1) throw new InvalidArgumentException('至少需選 1 筆工具');

    $this->db->beginTransaction();
    try {
      // 車存在即可（可停用）
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      // 確保該車目前不在左表（避免重複新增）
      $stExists = $this->db->prepare("SELECT 1 FROM hot_tools WHERE vehicle_id = :vid LIMIT 1");
      $stExists->execute([':vid' => $vehicleId]);
      if ($stExists->fetch()) throw new RuntimeException('該車已存在配賦（不可重複新增）');

      // 鎖住欲配賦工具列，且必須未配賦
      $in = implode(',', array_fill(0, count($toolIds), '?'));
      $sqlLock = "SELECT id, vehicle_id FROM hot_tools WHERE id IN ($in) FOR UPDATE";
      $stLock = $this->db->prepare($sqlLock);
      $stLock->execute($toolIds);
      $locked = $stLock->fetchAll();
      if (count($locked) !== count($toolIds)) throw new RuntimeException('工具資料不完整');

      foreach ($locked as $t) {
        if ($t['vehicle_id'] !== null) throw new RuntimeException('選取工具包含已配賦者（請重新選擇）');
      }

      // 更新 vehicle_id +（可選）inspect_date/note
      $sqlUp = "UPDATE hot_tools SET vehicle_id = :vid, inspect_date = :inspect_date, note = :note WHERE id = :id";
      $stUp = $this->db->prepare($sqlUp);

      $n = 0;
      foreach ($toolIds as $tid) {
        $inspect = $metaById[$tid]['inspect_date'] ?? null;
        $note = $metaById[$tid]['note'] ?? null;

        $stUp->bindValue(':vid', $vehicleId, PDO::PARAM_INT);
        $stUp->bindValue(':inspect_date', $inspect, $inspect === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stUp->bindValue(':note', $note, $note === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stUp->bindValue(':id', $tid, PDO::PARAM_INT);
        $stUp->execute();
        $n += $stUp->rowCount();
      }

      $this->db->commit();
      return ['assigned' => $n, 'vehicle_id' => $vehicleId];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 左表刪除：解除該車全部配賦（vehicle_id -> NULL）
   * ========================= */
  public function unassignAllByVehicle(int $vehicleId): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');

    $this->db->beginTransaction();
    try {
      // 鎖車
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      // 解除
      $st = $this->db->prepare("UPDATE hot_tools SET vehicle_id = NULL WHERE vehicle_id = :vid");
      $st->execute([':vid' => $vehicleId]);

      $this->db->commit();
      return ['unassigned' => (int)$st->rowCount(), 'vehicle_id' => $vehicleId];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  public function batchUpdateInspectDateByVehicle(int $vehicleId, $inspectDate): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');
    $date = $this->normalizeDateOrNull($inspectDate);
    if ($date === null) throw new InvalidArgumentException('inspect_date 不可為空');

    $this->db->beginTransaction();
    try {
      // 鎖車存在即可
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      $st = $this->db->prepare("UPDATE hot_tools SET inspect_date = :d WHERE vehicle_id = :vid");
      $st->execute([':d' => $date, ':vid' => $vehicleId]);

      $this->db->commit();
      return ['updated' => (int)$st->rowCount(), 'vehicle_id' => $vehicleId, 'inspect_date' => $date];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  public function updateInspectDatesByVehicle(int $vehicleId, array $rows): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');
    if (count($rows) < 1) throw new InvalidArgumentException('rows 不可為空');

    $map = [];
    foreach ($rows as $r) {
      $tid = (int)($r['tool_id'] ?? 0);
      if ($tid <= 0) continue;
      $date = $this->normalizeDateOrNull($r['inspect_date'] ?? null);
      if ($date === null) throw new InvalidArgumentException('inspect_date 不可為空');
      $map[$tid] = $date;
    }
    if (!count($map)) throw new InvalidArgumentException('rows 不可為空');

    $toolIds = array_keys($map);

    $this->db->beginTransaction();
    try {
      // 鎖車
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      // 鎖工具 + 驗證都屬於本車
      $in = implode(',', array_fill(0, count($toolIds), '?'));
      $stLock = $this->db->prepare("SELECT id, vehicle_id FROM hot_tools WHERE id IN ($in) FOR UPDATE");
      $stLock->execute($toolIds);
      $locked = $stLock->fetchAll();
      if (count($locked) !== count($toolIds)) throw new RuntimeException('工具資料不完整');

      foreach ($locked as $t) {
        if ($t['vehicle_id'] === null || (int)$t['vehicle_id'] !== (int)$vehicleId) {
          throw new RuntimeException('包含非本車工具（不可更新檢驗日期）');
        }
      }

      $stUp = $this->db->prepare("UPDATE hot_tools SET inspect_date = :d WHERE id = :id");
      $n = 0;
      foreach ($map as $tid => $d) {
        $stUp->execute([':d' => $d, ':id' => $tid]);
        $n += $stUp->rowCount();
      }

      $this->db->commit();
      return ['updated' => $n, 'vehicle_id' => $vehicleId];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 右表：差分更新（同時 add/remove）
   * - addIds：只能加入「未配賦」工具
   * - removeIds：只能解除「目前屬於此車」的工具
   * - 全部 transaction + FOR UPDATE 防止同時被別車搶走
   * ========================= */
  public function updateAssignDiff(int $vehicleId, array $addIds, array $removeIds): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');

    $addIds = array_values(array_unique(array_map('intval', $addIds)));
    $addIds = array_values(array_filter($addIds, fn($x) => $x > 0));

    $removeIds = array_values(array_unique(array_map('intval', $removeIds)));
    $removeIds = array_values(array_filter($removeIds, fn($x) => $x > 0));

    if (count($addIds) < 1 && count($removeIds) < 1) {
      throw new InvalidArgumentException('add_tool_ids / remove_tool_ids 不可同時為空');
    }

    $this->db->beginTransaction();
    try {
      // 鎖車（車存在即可，停用也可）
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      $added = 0;
      $removed = 0;

      /* ---------- remove：只能解除本車的 ---------- */
      if (count($removeIds) > 0) {
        $in = implode(',', array_fill(0, count($removeIds), '?'));

        // 鎖欲解除工具
        $stLock = $this->db->prepare("SELECT id, vehicle_id FROM hot_tools WHERE id IN ($in) FOR UPDATE");
        $stLock->execute($removeIds);
        $rows = $stLock->fetchAll();
        if (count($rows) !== count($removeIds)) throw new RuntimeException('remove 工具資料不完整');

        foreach ($rows as $r) {
          $vid = $r['vehicle_id'];
          if ($vid === null) throw new RuntimeException('remove 包含未配賦工具');
          if ((int)$vid !== (int)$vehicleId) throw new RuntimeException('remove 包含非本車工具');
        }

        $stUp = $this->db->prepare("UPDATE hot_tools SET vehicle_id = NULL WHERE id = :id");
        foreach ($removeIds as $tid) {
          $stUp->execute([':id' => $tid]);
          $removed += $stUp->rowCount();
        }
      }

      /* ---------- add：只能加入未配賦 ---------- */
      if (count($addIds) > 0) {
        $in = implode(',', array_fill(0, count($addIds), '?'));

        // 鎖欲加入工具
        $stLock = $this->db->prepare("SELECT id, vehicle_id FROM hot_tools WHERE id IN ($in) FOR UPDATE");
        $stLock->execute($addIds);
        $rows = $stLock->fetchAll();
        if (count($rows) !== count($addIds)) throw new RuntimeException('add 工具資料不完整');

        foreach ($rows as $r) {
          if ($r['vehicle_id'] !== null) throw new RuntimeException('add 包含已配賦工具');
        }

        $stUp = $this->db->prepare("UPDATE hot_tools SET vehicle_id = :vid WHERE id = :id");
        foreach ($addIds as $tid) {
          $stUp->execute([':vid' => $vehicleId, ':id' => $tid]);
          $added += $stUp->rowCount();
        }
      }

      $this->db->commit();
      return ['added' => $added, 'removed' => $removed, 'vehicle_id' => $vehicleId];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 右表：移轉進來（允許原本在其他車）
   * ========================= */
  public function transferToolsToVehicle(int $vehicleId, array $toolIds): array
  {
    if ($vehicleId <= 0) throw new InvalidArgumentException('vehicle_id 不可為空');
    $toolIds = array_values(array_unique(array_map('intval', $toolIds)));
    $toolIds = array_values(array_filter($toolIds, fn($x) => $x > 0));
    if (count($toolIds) < 1) throw new InvalidArgumentException('tool_ids 不可為空');

    $this->db->beginTransaction();
    try {
      $stV = $this->db->prepare("SELECT id FROM vehicle_vehicles WHERE id = :id FOR UPDATE");
      $stV->execute([':id' => $vehicleId]);
      if (!$stV->fetch()) throw new RuntimeException('車輛不存在');

      $in = implode(',', array_fill(0, count($toolIds), '?'));
      $stLock = $this->db->prepare("SELECT id FROM hot_tools WHERE id IN ($in) FOR UPDATE");
      $stLock->execute($toolIds);
      $rows = $stLock->fetchAll();
      if (count($rows) !== count($toolIds)) throw new RuntimeException('工具資料不完整');

      $stUp = $this->db->prepare("UPDATE hot_tools SET vehicle_id = :vid WHERE id = :id");
      $n = 0;
      foreach ($toolIds as $tid) {
        $stUp->execute([':vid' => $vehicleId, ':id' => $tid]);
        $n += $stUp->rowCount();
      }

      $this->db->commit();
      return ['transferred' => $n];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* =========================
   * 右表：解除歸屬（指定工具）
   * ========================= */
  public function unassignTools(array $toolIds): array
  {
    $toolIds = array_values(array_unique(array_map('intval', $toolIds)));
    $toolIds = array_values(array_filter($toolIds, fn($x) => $x > 0));
    if (count($toolIds) < 1) throw new InvalidArgumentException('tool_ids 不可為空');

    $this->db->beginTransaction();
    try {
      $in = implode(',', array_fill(0, count($toolIds), '?'));
      $stLock = $this->db->prepare("SELECT id FROM hot_tools WHERE id IN ($in) FOR UPDATE");
      $stLock->execute($toolIds);
      $rows = $stLock->fetchAll();
      if (count($rows) !== count($toolIds)) throw new RuntimeException('工具資料不完整');

      $stUp = $this->db->prepare("UPDATE hot_tools SET vehicle_id = NULL WHERE id = :id");
      $n = 0;
      foreach ($toolIds as $tid) {
        $stUp->execute([':id' => $tid]);
        $n += $stUp->rowCount();
      }

      $this->db->commit();
      return ['unassigned' => $n];
    } catch (Throwable $e) {
      $this->db->rollBack();
      throw $e;
    }
  }

  /* ===== helpers ===== */
  private function normalizeDateOrNull($v): ?string
  {
    $s = trim((string)$v);
    if ($s === '') return null;
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) throw new InvalidArgumentException('日期格式錯誤（需 YYYY-MM-DD）');
    return $s;
  }

  private function normalizeNoteOrNull($v): ?string
  {
    $s = trim((string)$v);
    return $s === '' ? null : $s;
  }
}
