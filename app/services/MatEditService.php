<?php
/**
 * Path: app/services/MatEditService.php
 * 說明: /mat/edit 後端服務層（集中資料操作）
 * - 分類 CRUD / 排序
 * - 分類 ↔ 材料組合
 * - 對帳資料（整包 JSON）
 * - 分類刪除時清理對帳 JSON
 * - 承辦人（沿用 mat_personnel）
 */

declare(strict_types=1);

class MatEditService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = db();
    }

    /* ========= 分類 ========= */

    public function listCategories(): array
    {
        $sql = "SELECT * FROM mat_edit_categories ORDER BY sort_order ASC, id ASC";
        return $this->db->query($sql)->fetchAll();
    }

    public function createCategory(string $name): int
    {
        $stmt = $this->db->prepare(
            "INSERT INTO mat_edit_categories (category_name, sort_order)
             VALUES (:name, (SELECT IFNULL(MAX(sort_order),0)+1 FROM mat_edit_categories))"
        );
        $stmt->execute([':name' => $name]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCategory(int $id, string $name): void
    {
        $stmt = $this->db->prepare(
            "UPDATE mat_edit_categories SET category_name = :name WHERE id = :id"
        );
        $stmt->execute([':id' => $id, ':name' => $name]);
    }

    public function deleteCategory(int $id): void
    {
        $this->db->beginTransaction();

        // 刪分類本體（materials 由 FK CASCADE）
        $stmt = $this->db->prepare("DELETE FROM mat_edit_categories WHERE id = :id");
        $stmt->execute([':id' => $id]);

        // 清理所有對帳 JSON
        $rows = $this->db->query(
            "SELECT withdraw_date, recon_values_json FROM mat_edit_reconciliation"
        )->fetchAll();

        foreach ($rows as $r) {
            $json = json_decode($r['recon_values_json'], true);
            if (!is_array($json)) continue;

            $key = (string)$id;
            if (!array_key_exists($key, $json)) continue;

            unset($json[$key]);

            if (empty($json)) {
                $del = $this->db->prepare(
                    "DELETE FROM mat_edit_reconciliation WHERE withdraw_date = :d"
                );
                $del->execute([':d' => $r['withdraw_date']]);
            } else {
                $upd = $this->db->prepare(
                    "UPDATE mat_edit_reconciliation
                     SET recon_values_json = :j
                     WHERE withdraw_date = :d"
                );
                $upd->execute([
                    ':j' => json_encode($json, JSON_UNESCAPED_UNICODE),
                    ':d' => $r['withdraw_date']
                ]);
            }
        }

        $this->db->commit();
    }

    public function sortCategories(array $orderedIds): void
    {
        $this->db->beginTransaction();
        $stmt = $this->db->prepare(
            "UPDATE mat_edit_categories SET sort_order = :o WHERE id = :id"
        );

        foreach ($orderedIds as $i => $id) {
            $stmt->execute([':o' => $i + 1, ':id' => (int)$id]);
        }
        $this->db->commit();
    }

    /* ========= 分類 ↔ 材料 ========= */

    public function getCategoryMaterials(int $categoryId): array
    {
        $stmt = $this->db->prepare(
            "SELECT material_number
             FROM mat_edit_category_materials
             WHERE category_id = :id"
        );
        $stmt->execute([':id' => $categoryId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }

    public function saveCategoryMaterials(int $categoryId, array $materials): void
    {
        $this->db->beginTransaction();

        $del = $this->db->prepare(
            "DELETE FROM mat_edit_category_materials WHERE category_id = :id"
        );
        $del->execute([':id' => $categoryId]);

        if ($materials) {
            $ins = $this->db->prepare(
                "INSERT INTO mat_edit_category_materials (category_id, material_number)
                 VALUES (:cid, :m)"
            );
            foreach ($materials as $m) {
                $ins->execute([':cid' => $categoryId, ':m' => $m]);
            }
        }

        $this->db->commit();
    }

    /* ========= 對帳 ========= */

    public function getReconciliation(string $date): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT recon_values_json FROM mat_edit_reconciliation WHERE withdraw_date = :d"
        );
        $stmt->execute([':d' => $date]);
        $row = $stmt->fetch();
        return $row ? json_decode($row['recon_values_json'], true) : null;
    }

    public function saveReconciliation(string $date, array $values, ?int $userId): void
    {
        $stmt = $this->db->prepare(
            "REPLACE INTO mat_edit_reconciliation
             (withdraw_date, recon_values_json, updated_by)
             VALUES (:d, :j, :u)"
        );
        $stmt->execute([
            ':d' => $date,
            ':j' => json_encode($values, JSON_UNESCAPED_UNICODE),
            ':u' => $userId
        ]);
    }

    /* ========= 承辦人 ========= */

    public function getPersonnel(): array
    {
        return $this->db->query(
            "SELECT shift_code, person_name FROM mat_personnel ORDER BY shift_code"
        )->fetchAll();
    }

    public function savePersonnel(string $shift, string $name): void
    {
        $stmt = $this->db->prepare(
            "UPDATE mat_personnel SET person_name = :n WHERE shift_code = :s"
        );
        $stmt->execute([':n' => $name, ':s' => $shift]);
    }
}
