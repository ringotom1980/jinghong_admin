<?php

/**
 * Path: app/services/MatEditService.php
 * 說明: /mat/edit（D 班管理）後端服務層
 * - mat_edit_categories：分類（list/create/update/delete/sort）
 * - mat_edit_category_materials：分類-材料歸屬（材料互斥）
 * - mat_edit_reconciliation：對帳（日期 -> JSON）
 * - mat_materials：材料主檔（僅 shift='D'）
 */

declare(strict_types=1);

final class MatEditService
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /* =========================
   * Categories
   * ========================= */

    public function listCategories(): array
    {
        $sql = "SELECT id, category_name, sort_order
            FROM mat_edit_categories
            ORDER BY sort_order ASC, id ASC";
        $rows = $this->pdo->query($sql)->fetchAll();

        return array_map(function ($r) {
            return [
                'id' => (int)$r['id'],
                'name' => (string)$r['category_name'],
                'sort_order' => (int)$r['sort_order'],
            ];
        }, $rows);
    }

    public function categoryNameExists(string $name, ?int $excludeId = null): bool
    {
        $name = trim($name);
        $sql = "SELECT 1 FROM mat_edit_categories WHERE category_name = :n";
        if ($excludeId !== null) $sql .= " AND id <> :id";
        $sql .= " LIMIT 1";

        $st = $this->pdo->prepare($sql);
        $st->bindValue(':n', $name, PDO::PARAM_STR);
        if ($excludeId !== null) $st->bindValue(':id', $excludeId, PDO::PARAM_INT);
        $st->execute();
        return (bool)$st->fetchColumn();
    }

    public function createCategory(string $name): int
    {
        $name = trim($name);
        if ($name === '') throw new RuntimeException('分類名稱不可為空');
        if ($this->categoryNameExists($name, null)) throw new RuntimeException('名稱已存在');

        // 新分類預設放到最後（sort_order = max+10）
        $max = (int)$this->pdo->query("SELECT COALESCE(MAX(sort_order), 0) FROM mat_edit_categories")->fetchColumn();
        $sort = $max + 10;

        $st = $this->pdo->prepare(
            "INSERT INTO mat_edit_categories (category_name, sort_order) VALUES (:n, :s)"
        );
        $st->execute([':n' => $name, ':s' => $sort]);

        return (int)$this->pdo->lastInsertId();
    }

    public function renameCategory(int $id, string $name): void
    {
        $name = trim($name);
        if ($id <= 0) throw new RuntimeException('分類ID不正確');
        if ($name === '') throw new RuntimeException('分類名稱不可為空');
        if ($this->categoryNameExists($name, $id)) throw new RuntimeException('名稱已存在');

        $st = $this->pdo->prepare("UPDATE mat_edit_categories SET category_name = :n WHERE id = :id");
        $st->execute([':n' => $name, ':id' => $id]);
        if ($st->rowCount() === 0) {
            // 可能名稱相同或不存在；不存在要報錯
            $chk = $this->pdo->prepare("SELECT 1 FROM mat_edit_categories WHERE id=:id");
            $chk->execute([':id' => $id]);
            if (!$chk->fetchColumn()) throw new RuntimeException('分類不存在');
        }
    }

    public function deleteCategories(array $ids): void
    {
        $ids = array_values(array_filter(array_map('intval', $ids), function ($v) {
            return $v > 0;
        }));
        if (!$ids) return;

        // JSON key 一律用字串比對（recon_values_json 的 key 是 "2" 這種字串）
        $keysToRemove = array_map('strval', $ids);

        $this->pdo->beginTransaction();
        try {
            // 1) 清理 mat_edit_reconciliation：移除所有日期的對應 key
            //    MariaDB 10.2+ 支援 JSON_REMOVE；但你的欄位是 longtext，所以要用 JSON_SET/REMOVE 仍可（會隱式轉 JSON）
            //    若資料內有非 JSON 的髒值，JSON_VALID=0 的行先跳過，避免整批炸掉
            $rows = $this->pdo->query("SELECT withdraw_date, recon_values_json FROM mat_edit_reconciliation")->fetchAll(PDO::FETCH_ASSOC);

            $upd = $this->pdo->prepare("UPDATE mat_edit_reconciliation SET recon_values_json = :j WHERE withdraw_date = :d");

            foreach ($rows as $r) {
                $d = (string)$r['withdraw_date'];
                $raw = (string)($r['recon_values_json'] ?? '');

                $data = json_decode($raw, true);
                if (!is_array($data)) continue; // 非合法 JSON：跳過（避免亂改）

                $changed = false;
                foreach ($keysToRemove as $k) {
                    if (array_key_exists($k, $data)) {
                        unset($data[$k]);
                        $changed = true;
                    }
                }
                if (!$changed) continue;

                $j = json_encode($data, JSON_UNESCAPED_UNICODE);
                if (!is_string($j)) throw new RuntimeException('JSON 編碼失敗（reconciliation cleanup）');

                $upd->execute([':j' => $j, ':d' => $d]);
            }

            // 2) 刪分類（category_materials 會被 FK cascade）
            $in = implode(',', array_fill(0, count($ids), '?'));
            $st = $this->pdo->prepare("DELETE FROM mat_edit_categories WHERE id IN ($in)");
            $st->execute($ids);

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** @param int[] $orderedIds */
    public function sortCategories(array $orderedIds): void
    {
        $orderedIds = array_values(array_filter(array_map('intval', $orderedIds), function ($v) {
            return $v > 0;
        }));
        if (!$orderedIds) return;

        $this->pdo->beginTransaction();
        try {
            // 用 10,20,30... 避免頻繁重排造成衝突
            $st = $this->pdo->prepare("UPDATE mat_edit_categories SET sort_order = :s WHERE id = :id");
            $s = 10;
            foreach ($orderedIds as $id) {
                $st->execute([':s' => $s, ':id' => $id]);
                $s += 10;
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /* =========================
   * Category Materials (shift='D')
   * ========================= */

    public function listCategoryMaterials(): array
    {
        // categories + materials concat
        $cats = $this->listCategories();

        $sql = "SELECT cm.category_id, cm.material_number, m.material_name
            FROM mat_edit_category_materials cm
            LEFT JOIN mat_materials m ON m.material_number = cm.material_number
            ORDER BY cm.category_id ASC, cm.material_number ASC";
        $rows = $this->pdo->query($sql)->fetchAll();

        $map = []; // category_id => list
        foreach ($rows as $r) {
            $cid = (int)$r['category_id'];
            if (!isset($map[$cid])) $map[$cid] = [];
            $map[$cid][] = [
                'material_number' => (string)$r['material_number'],
                'material_name' => (string)($r['material_name'] ?? ''),
            ];
        }

        // 給前端：每個分類材料組合（顯示用字串 + 清單）
        foreach ($cats as &$c) {
            $list = $map[$c['id']] ?? [];
            $c['materials'] = $list;
            $c['materials_text'] = implode(', ', array_map(function ($x) {
                return $x['material_number'];
            }, $list));
        }
        unset($c);

        return $cats;
    }

    /**
     * 供 modal 用：列出 shift='D' 的材料清單
     * - 同時回傳 assigned_category_id，讓前端能「禁選」
     */
    public function listMaterialsShiftDWithAssignment(): array
    {
        $materials = $this->pdo->query(
            "SELECT material_number, COALESCE(material_name,'') AS material_name
       FROM mat_materials
       WHERE shift = 'D'
       ORDER BY material_number ASC"
        )->fetchAll();

        $assigned = $this->pdo->query(
            "SELECT material_number, category_id
       FROM mat_edit_category_materials"
        )->fetchAll();

        $assignedMap = [];
        foreach ($assigned as $a) {
            $assignedMap[(string)$a['material_number']] = (int)$a['category_id'];
        }

        return array_map(function ($m) use ($assignedMap) {
            $num = (string)$m['material_number'];
            return [
                'material_number' => $num,
                'material_name' => (string)$m['material_name'],
                'assigned_category_id' => $assignedMap[$num] ?? null, // int|null
            ];
        }, $materials);
    }

    /**
     * 設定某分類的材料組合（整包覆蓋）
     * - 互斥規則：material_number 不可同時屬於其他分類
     * @param string[] $materialNumbers
     */
    public function setCategoryMaterials(int $categoryId, array $materialNumbers): void
    {
        if ($categoryId <= 0) throw new RuntimeException('分類ID不正確');

        // normalize unique
        $materialNumbers = array_values(array_unique(array_filter(array_map(function ($v) {
            return trim((string)$v);
        }, $materialNumbers), function ($v) {
            return $v !== '';
        })));

        // 檢查 category 存在
        $st = $this->pdo->prepare("SELECT 1 FROM mat_edit_categories WHERE id = :id");
        $st->execute([':id' => $categoryId]);
        if (!$st->fetchColumn()) throw new RuntimeException('分類不存在');

        // 檢查所有 material 是否在 shift='D' 的 mat_materials
        if ($materialNumbers) {
            $in = implode(',', array_fill(0, count($materialNumbers), '?'));
            $chk = $this->pdo->prepare(
                "SELECT material_number
         FROM mat_materials
         WHERE shift='D' AND material_number IN ($in)"
            );
            $chk->execute($materialNumbers);
            $ok = $chk->fetchAll(PDO::FETCH_COLUMN);

            $okMap = array_fill_keys(array_map('strval', $ok), true);
            $missing = [];
            foreach ($materialNumbers as $mn) {
                if (!isset($okMap[$mn])) $missing[] = $mn;
            }
            if ($missing) {
                throw new RuntimeException('材料不存在或非 D 班：' . implode(', ', $missing));
            }

            // 檢查互斥：是否已被其他分類占用
            $in2 = implode(',', array_fill(0, count($materialNumbers), '?'));
            $args = $materialNumbers;
            $args[] = $categoryId;

            $conf = $this->pdo->prepare(
                "SELECT material_number, category_id
         FROM mat_edit_category_materials
         WHERE material_number IN ($in2) AND category_id <> ?"
            );
            $conf->execute($args);
            $confRows = $conf->fetchAll();

            if ($confRows) {
                // 回報哪些材料被哪個分類占用
                $bad = array_map(function ($r) {
                    return (string)$r['material_number'] . '(category_id=' . (int)$r['category_id'] . ')';
                }, $confRows);
                throw new RuntimeException('材料已被其他分類選用：' . implode(', ', $bad));
            }
        }

        $this->pdo->beginTransaction();
        try {
            // 先刪再插（整包覆蓋）
            $del = $this->pdo->prepare("DELETE FROM mat_edit_category_materials WHERE category_id = :cid");
            $del->execute([':cid' => $categoryId]);

            if ($materialNumbers) {
                $ins = $this->pdo->prepare(
                    "INSERT INTO mat_edit_category_materials (category_id, material_number) VALUES (:cid, :mn)"
                );
                foreach ($materialNumbers as $mn) {
                    $ins->execute([':cid' => $categoryId, ':mn' => $mn]);
                }
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /* =========================
   * Reconciliation
   * ========================= */

    public function getReconciliation(string $withdrawDate): array
    {
        $withdrawDate = trim($withdrawDate);
        if (!$this->isValidDate($withdrawDate)) throw new RuntimeException('日期格式不正確');

        $st = $this->pdo->prepare(
            "SELECT recon_values_json, updated_at, updated_by
       FROM mat_edit_reconciliation
       WHERE withdraw_date = :d"
        );
        $st->execute([':d' => $withdrawDate]);
        $row = $st->fetch();

        $values = [];
        if ($row && isset($row['recon_values_json'])) {
            $decoded = json_decode((string)$row['recon_values_json'], true);
            if (is_array($decoded)) $values = $decoded;
        }

        // 統一：key 轉 string，value 轉數字字串（前端可直接塞 input）
        $norm = [];
        foreach ($values as $k => $v) {
            $kid = (string)$k;
            if ($v === '' || $v === null) $norm[$kid] = '0';
            else $norm[$kid] = (string)$v;
        }

        return [
            'withdraw_date' => $withdrawDate,
            'values' => $norm,
            'meta' => [
                'updated_at' => $row['updated_at'] ?? null,
                'updated_by' => $row['updated_by'] ?? null,
            ],
        ];
    }

    /**
     * 儲存對帳（整包覆蓋）
     * @param array<string,mixed> $values key=category_id
     */
    public function saveReconciliation(string $withdrawDate, array $values, ?int $userId): void
    {
        $withdrawDate = trim($withdrawDate);
        if (!$this->isValidDate($withdrawDate)) throw new RuntimeException('日期格式不正確');

        // 空值=0；允許小數
        $norm = [];
        foreach ($values as $cid => $val) {
            $cid = (string)$cid;
            $s = trim((string)$val);
            if ($s === '') $s = '0';

            // 允許：正數 / 負數 / 小數
            // 空字串已在前面轉成 0
            if (!preg_match('/^-?\d+(\.\d+)?$/', $s)) {
                throw new RuntimeException('對帳數量格式不正確（category_id=' . $cid . '）');
            }

            $norm[$cid] = $s;
        }

        $json = json_encode($norm, JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) throw new RuntimeException('JSON 編碼失敗');

        $st = $this->pdo->prepare(
            "INSERT INTO mat_edit_reconciliation (withdraw_date, recon_values_json, updated_by)
       VALUES (:d, :j, :u)
       ON DUPLICATE KEY UPDATE
         recon_values_json = VALUES(recon_values_json),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP()"
        );
        $st->execute([
            ':d' => $withdrawDate,
            ':j' => $json,
            ':u' => $userId,
        ]);
    }

    /**
     * 檢查某天是否已匯入提領資料（mat_issue_items.withdraw_date）
     */
    public function hasIssueData(string $withdrawDate): bool
    {
        $withdrawDate = trim($withdrawDate);
        if (!$this->isValidDate($withdrawDate)) return false;

        // 你規格：判斷 mat_issue_items.withdraw_date
        $st = $this->pdo->prepare("SELECT 1 FROM mat_issue_items WHERE withdraw_date = :d LIMIT 1");
        $st->execute([':d' => $withdrawDate]);
        return (bool)$st->fetchColumn();
    }

    /* =========================
   * Utils
   * ========================= */

    private function isValidDate(string $d): bool
    {
        // YYYY-MM-DD
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) return false;
        $dt = DateTime::createFromFormat('Y-m-d', $d);
        return $dt && $dt->format('Y-m-d') === $d;
    }
}
