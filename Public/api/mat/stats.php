<?php

/**
 * Path: Public/api/mat/stats.php
 * 說明: 統計總控 API
 * 參數:
 * - withdraw_date=YYYY-MM-DD（可選，不給就取近三個月最新）
 * - shift=all|A|B|C|D|E|F（可選，預設 all）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();
require_once __DIR__ . '/stats_ac.php';
require_once __DIR__ . '/stats_ef.php';
require_once __DIR__ . '/stats_b.php';
require_once __DIR__ . '/stats_d.php';

function _pick_latest_date_3m(): ?string
{
    $sql = "SELECT MAX(withdraw_date) AS d
          FROM mat_issue_batches
          WHERE withdraw_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
    $row = db()->query($sql)->fetch();
    $d = $row ? (string)($row['d'] ?? '') : '';
    return $d !== '' ? $d : null;
}

/**
 * 依 shifts 彙總 items
 * - $splitByShift=true：回傳會包含 shift 欄位，並以 shift+material_number 分組（用於 A/C、E/F 拆卡）
 * - $withSortB=true：B 組加 sort_order（保留原有行為）
 */
function _agg_items_by_shifts(string $d, array $shifts, bool $withSortB = false, bool $splitByShift = false): array
{
    $pdo = db();

    if (count($shifts) < 1) return [];

    $in = implode(',', array_fill(0, count($shifts), '?'));
    $params = array_merge([$d], $shifts);

    if ($withSortB) {
        // B：保留 sort_order（雖然只有 B，但仍可加 shift 欄位不傷害）
        if ($splitByShift) {
            $sql = "SELECT
                i.shift,
                i.material_number,
                MAX(i.material_name) AS material_name,
                COALESCE(msb.sort_order, 999999) AS sort_order,
                SUM(i.collar_new)  AS collar_new,
                SUM(i.collar_old)  AS collar_old,
                SUM(i.recede_new)  AS recede_new,
                SUM(i.recede_old)  AS recede_old,
                SUM(i.scrap)       AS scrap,
                SUM(i.footprint)   AS footprint
              FROM mat_issue_items i
              LEFT JOIN mat_materials_sort_b msb
                     ON msb.material_number = i.material_number
              WHERE i.withdraw_date = ?
                AND i.shift IN ($in)
              GROUP BY i.shift, i.material_number, msb.sort_order
              ORDER BY sort_order ASC, i.material_number ASC";
        } else {
            $sql = "SELECT
                i.material_number,
                MAX(i.material_name) AS material_name,
                COALESCE(msb.sort_order, 999999) AS sort_order,
                SUM(i.collar_new)  AS collar_new,
                SUM(i.collar_old)  AS collar_old,
                SUM(i.recede_new)  AS recede_new,
                SUM(i.recede_old)  AS recede_old,
                SUM(i.scrap)       AS scrap,
                SUM(i.footprint)   AS footprint
              FROM mat_issue_items i
              LEFT JOIN mat_materials_sort_b msb
                     ON msb.material_number = i.material_number
              WHERE i.withdraw_date = ?
                AND i.shift IN ($in)
              GROUP BY i.material_number, msb.sort_order
              ORDER BY sort_order ASC, i.material_number ASC";
        }
    } else {
        if ($splitByShift) {
            $sql = "SELECT
                i.shift,
                i.material_number,
                MAX(i.material_name) AS material_name,
                SUM(i.collar_new)  AS collar_new,
                SUM(i.collar_old)  AS collar_old,
                SUM(i.recede_new)  AS recede_new,
                SUM(i.recede_old)  AS recede_old,
                SUM(i.scrap)       AS scrap,
                SUM(i.footprint)   AS footprint
              FROM mat_issue_items i
              WHERE i.withdraw_date = ?
                AND i.shift IN ($in)
              GROUP BY i.shift, i.material_number
              ORDER BY i.shift ASC, i.material_number ASC";
        } else {
            $sql = "SELECT
                i.material_number,
                MAX(i.material_name) AS material_name,
                SUM(i.collar_new)  AS collar_new,
                SUM(i.collar_old)  AS collar_old,
                SUM(i.recede_new)  AS recede_new,
                SUM(i.recede_old)  AS recede_old,
                SUM(i.scrap)       AS scrap,
                SUM(i.footprint)   AS footprint
              FROM mat_issue_items i
              WHERE i.withdraw_date = ?
                AND i.shift IN ($in)
              GROUP BY i.material_number
              ORDER BY i.material_number ASC";
        }
    }

    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
}

/** 把 splitByShift 的 rows 拆成 map：shift => rows[] */
function _split_rows_by_shift(array $rows): array
{
    $out = [];
    foreach ($rows as $r) {
        $s = strtoupper((string)($r['shift'] ?? ''));
        if ($s === '') continue;
        if (!isset($out[$s])) $out[$s] = [];
        $out[$s][] = $r;
    }
    return $out;
}

function _personnel_map(): array
{
    $pdo = db();
    $sql = "SELECT shift_code, person_name
          FROM mat_personnel
          WHERE shift_code IN ('A','B','C','D','E','F')";
    $rows = $pdo->query($sql)->fetchAll();

    $map = [];
    foreach ($rows as $r) {
        $k = strtoupper((string)($r['shift_code'] ?? ''));
        if ($k === '') continue;
        $map[$k] = (string)($r['person_name'] ?? '');
    }
    return $map;
}

try {
    $shift = strtoupper((string)($_GET['shift'] ?? 'ALL'));
    $d = (string)($_GET['withdraw_date'] ?? '');

    if ($d === '') {
        $latest = _pick_latest_date_3m();
        if (!$latest) json_ok([
            'withdraw_date' => null,
            'shift' => $shift,
            'groups' => []
        ]);
        $d = $latest;
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) {
        json_error('withdraw_date 格式不正確（YYYY-MM-DD）', 400);
    }

    $groups = [];

    if ($shift === 'ALL') {
        // A/C（交給 stats_ac.php）
        $acGroups = mat_stats_ac($d);
        $groups['A'] = $acGroups['A'] ?? ['rows' => []];
        $groups['C'] = $acGroups['C'] ?? ['rows' => []];

        // B（交給 stats_b.php：含 sort_order + 筆數字串）
        $bGroups = mat_stats_b($d);
        $groups['B'] = $bGroups['B'] ?? ['rows' => []];

        // ✅ D（交給 stats_d.php）
        $dGroups = mat_stats_d($d);
        $groups['D'] = $dGroups['D'] ?? ['rows' => []];

        // E/F（交給 stats_ef.php，定版：退舊 = recede_old + scrap + footprint）
        $efGroups = mat_stats_ef($d);
        $groups['E'] = $efGroups['E'] ?? ['rows' => []];
        $groups['F'] = $efGroups['F'] ?? ['rows' => []];
    } else {
        if ($shift === 'A' || $shift === 'C') {
            $acGroups = mat_stats_ac($d);
            $groups[$shift] = $acGroups[$shift] ?? ['rows' => []];
        } elseif ($shift === 'E' || $shift === 'F') {
            $efGroups = mat_stats_ef($d);
            $groups[$shift] = $efGroups[$shift] ?? ['rows' => []];
        } elseif ($shift === 'B') {
            $bGroups = mat_stats_b($d);
            $groups['B'] = $bGroups['B'] ?? ['rows' => []];
        } elseif ($shift === 'D') {
            // ✅ D（交給 stats_d.php）
            $dGroups = mat_stats_d($d);
            $groups['D'] = $dGroups['D'] ?? ['rows' => []];
        } else {
            json_error('shift 參數不正確（all|A|B|C|D|E|F）', 400);
        }
    }

    json_ok([
        'withdraw_date' => $d,
        'shift' => $shift,
        'personnel' => _personnel_map(),
        'groups' => $groups
    ]);
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}