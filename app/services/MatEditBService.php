<?php
/**
 * Path: app/services/MatEditBService.php
 * 說明: B 班管理（/mat/edit_B）服務層
 * - 只處理 shift='B' 的材料排序
 * - 確保與 mat_materials 同步（自動補齊/清理）
 */

declare(strict_types=1);

final class MatEditBService
{
    /** @var PDO */
    private $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * 同步 B 班排序表：
     * - 新增：mat_materials(shift='B') 但 sort 表沒有的
     * - 刪除：sort 表有但 mat_materials 已不屬於 B 的
     */
    public function syncSortTable(): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1) 刪除不再是 B 的 material_number
            $this->pdo->exec("
                DELETE s
                FROM mat_materials_sort_b s
                LEFT JOIN mat_materials m
                  ON m.material_number = s.material_number
                 AND m.shift = 'B'
                WHERE m.material_number IS NULL
            ");

            // 2) 插入缺少的 B 班材料（排序放最後：max+10）
            $max = (int)$this->pdo->query("SELECT COALESCE(MAX(sort_order), 0) FROM mat_materials_sort_b")->fetchColumn();
            $base = $max + 10;

            // 找出 B 班材料中尚未存在 sort 表者
            $rows = $this->pdo->query("
                SELECT m.material_number
                FROM mat_materials m
                LEFT JOIN mat_materials_sort_b s ON s.material_number = m.material_number
                WHERE m.shift = 'B' AND s.material_number IS NULL
                ORDER BY m.material_number ASC
            ")->fetchAll(PDO::FETCH_COLUMN);

            if ($rows) {
                $ins = $this->pdo->prepare("INSERT INTO mat_materials_sort_b (material_number, sort_order) VALUES (:mn, :so)");
                $so = $base;
                foreach ($rows as $mn) {
                    $ins->execute([':mn' => (string)$mn, ':so' => $so]);
                    $so += 10;
                }
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * 取得 B 班材料清單（依 sort_order）
     * @return array<int,array{material_number:string, material_name:string, sort_order:int}>
     */
    public function listItems(): array
    {
        $this->syncSortTable();

        $st = $this->pdo->query("
            SELECT
              m.material_number,
              COALESCE(m.material_name,'') AS material_name,
              COALESCE(s.sort_order, 0) AS sort_order
            FROM mat_materials m
            LEFT JOIN mat_materials_sort_b s ON s.material_number = m.material_number
            WHERE m.shift = 'B'
            ORDER BY s.sort_order ASC, m.material_number ASC
        ");
        $rows = $st->fetchAll();

        return array_map(function ($r) {
            return [
                'material_number' => (string)$r['material_number'],
                'material_name'   => (string)($r['material_name'] ?? ''),
                'sort_order'      => (int)($r['sort_order'] ?? 0),
            ];
        }, $rows);
    }

    /**
     * 拖曳排序：送整包 material_number 依序重排
     * - 不在清單內的（新進來的 B 班材料）會自動補到最後
     * @param string[] $ordered
     */
    public function saveOrder(array $ordered): void
    {
        $ordered = $this->normalizeMaterialNumbers($ordered);
        $this->syncSortTable();

        // 驗證：ordered 內每一個都必須是 shift='B'
        if ($ordered) {
            $in = implode(',', array_fill(0, count($ordered), '?'));
            $chk = $this->pdo->prepare("SELECT material_number FROM mat_materials WHERE shift='B' AND material_number IN ($in)");
            $chk->execute($ordered);
            $ok = $chk->fetchAll(PDO::FETCH_COLUMN);
            $okMap = array_fill_keys(array_map('strval', $ok), true);

            $bad = [];
            foreach ($ordered as $mn) {
                if (!isset($okMap[$mn])) $bad[] = $mn;
            }
            if ($bad) {
                throw new RuntimeException('包含非 B 班材料：' . implode(', ', $bad));
            }
        }

        $this->pdo->beginTransaction();
        try {
            // 取目前 B 班全集合（確保不會漏）
            $all = $this->pdo->query("
                SELECT m.material_number
                FROM mat_materials m
                WHERE m.shift='B'
                ORDER BY m.material_number ASC
            ")->fetchAll(PDO::FETCH_COLUMN);

            $all = array_map('strval', $all);
            $orderedSet = $ordered ? array_fill_keys($ordered, true) : [];

            // ordered 先排，剩下的補到最後
            $final = [];
            foreach ($ordered as $mn) $final[] = $mn;
            foreach ($all as $mn) {
                if (!isset($orderedSet[$mn])) $final[] = $mn;
            }

            $st = $this->pdo->prepare("UPDATE mat_materials_sort_b SET sort_order = :so WHERE material_number = :mn");
            $so = 10;
            foreach ($final as $mn) {
                $st->execute([':so' => $so, ':mn' => $mn]);
                $so += 10;
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * 指定位置（插入式，不是交換）
     * - position=3 表示插到第 3（原本 3.. 往後擠）
     */
    public function moveToPosition(string $materialNumber, int $position): void
    {
        $materialNumber = trim($materialNumber);
        if ($materialNumber === '') throw new RuntimeException('material_number 不可為空');

        $this->syncSortTable();

        // 驗證是否為 B 班材料
        $st = $this->pdo->prepare("SELECT 1 FROM mat_materials WHERE shift='B' AND material_number=:mn LIMIT 1");
        $st->execute([':mn' => $materialNumber]);
        if (!$st->fetchColumn()) throw new RuntimeException('材料不存在或非 B 班');

        $this->pdo->beginTransaction();
        try {
            // 取現行順序清單
            $list = $this->pdo->query("
                SELECT m.material_number
                FROM mat_materials m
                LEFT JOIN mat_materials_sort_b s ON s.material_number=m.material_number
                WHERE m.shift='B'
                ORDER BY s.sort_order ASC, m.material_number ASC
            ")->fetchAll(PDO::FETCH_COLUMN);

            $list = array_values(array_map('strval', $list));

            // 移除目標
            $new = [];
            foreach ($list as $mn) {
                if ($mn !== $materialNumber) $new[] = $mn;
            }

            $len = count($new) + 1;
            if ($position < 1) $position = 1;
            if ($position > $len) $position = $len;

            // 插入（position 是 1-based）
            array_splice($new, $position - 1, 0, [$materialNumber]);

            // 重寫 sort_order
            $upd = $this->pdo->prepare("UPDATE mat_materials_sort_b SET sort_order=:so WHERE material_number=:mn");
            $so = 10;
            foreach ($new as $mn) {
                $upd->execute([':so' => $so, ':mn' => $mn]);
                $so += 10;
            }

            $this->pdo->commit();
        } catch (Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /** @param mixed[] $arr @return string[] */
    private function normalizeMaterialNumbers(array $arr): array
    {
        $out = [];
        foreach ($arr as $v) {
            $s = trim((string)$v);
            if ($s === '') continue;
            $out[] = $s;
        }
        // unique (keep order)
        $seen = [];
        $final = [];
        foreach ($out as $s) {
            if (isset($seen[$s])) continue;
            $seen[$s] = true;
            $final[] = $s;
        }
        return $final;
    }
}
