<?php

/**
 * Path: app/services/mat/issue/parsers/IssueParserS.php
 * 說明: S 類解析器（只負責 S 單）
 * 規則：
 * - 只取第一張 sheet（上層已做）
 * - header row：掃前 30 列，命中關鍵欄位 >= 4
 * - alias map：欄名同義詞映射
 * - S 單不做決策：找到欄位就直接匯入
 * - 空白/非數字 -> 0；數值 round(2)
 * - 支援負數與括號負數
 *
 * 匯入映射（定版）：
 * - 憑證編號 -> voucher
 * - 材料編號 -> material_number
 * - 材料名稱及規範 -> material_name
 * - 新料 -> recede_new
 * - 舊料 -> recede_old
 * - 廢料 -> scrap
 * - 下腳 -> footprint
 */

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class IssueParserS
{
  /** @var array<string, string[]> */
  private $alias = [
    // 憑證
    'voucher' => [
      '憑證編號',
    ],

    // 材料編號/名稱
    'material_number' => [
      '材料編號',
    ],
    'material_name' => [
      '材料名稱及規範',
    ],

    // 數量欄位（S 單：新料/舊料/廢料/下腳）
    'new_qty' => [
      '新料',
    ],
    'old_qty' => [
      '舊料',
    ],
    'scrap' => [
      '廢料',
    ],
    'footprint' => [
      '下腳',
    ],
  ];

  /** @var string[] */
  private $keyHeaders = [
    '憑證編號',
    '材料編號',
    '材料名稱及規範',
    '新料',
    '舊料',
    '廢料',
    '下腳',
  ];

  /**
   * @return array<int, array<string, mixed>>
   */
  public function parse(Worksheet $sheet): array
  {
    $maxScan = 30;
    $highestRow = (int)$sheet->getHighestRow();
    $highestCol = $sheet->getHighestColumn();

    // find header row
    $headerRow = 0;
    $headerMap = [];

    for ($r = 1; $r <= min($maxScan, $highestRow); $r++) {
      $rowVals = $sheet->rangeToArray('A' . $r . ':' . $highestCol . $r, null, true, false);
      $cells = isset($rowVals[0]) ? $rowVals[0] : [];

      $hit = 0;
      for ($i = 0; $i < count($cells); $i++) {
        $v = trim((string)($cells[$i] ?? ''));
        if ($v === '') continue;
        if ($this->isKeyHeader($v)) $hit++;
      }

      if ($hit >= 4) {
        $headerRow = $r;
        $headerMap = $this->buildHeaderMap($cells);
        break;
      }
    }

    if ($headerRow <= 0 || empty($headerMap)) {
      // header not found -> return empty
      return [];
    }

    $out = [];

    for ($r = $headerRow + 1; $r <= $highestRow; $r++) {
      $rowVals = $sheet->rangeToArray('A' . $r . ':' . $highestCol . $r, null, true, false);
      $cells = isset($rowVals[0]) ? $rowVals[0] : [];

      if ($this->isAllEmpty($cells)) continue;

      $voucher = (string)$this->getCellByKey($cells, $headerMap, 'voucher');

      $mn = trim((string)$this->getCellByKey($cells, $headerMap, 'material_number'));
      $mname = trim((string)$this->getCellByKey($cells, $headerMap, 'material_name'));

      // material_number 必填；空則跳過（避免寫入空料號）
      if ($mn === '') continue;

      $newQty = $this->num($this->getCellByKey($cells, $headerMap, 'new_qty'));
      $oldQty = $this->num($this->getCellByKey($cells, $headerMap, 'old_qty'));
      $scrap  = $this->num($this->getCellByKey($cells, $headerMap, 'scrap'));
      $foot   = $this->num($this->getCellByKey($cells, $headerMap, 'footprint'));

      // S 單：直接映射（不做決策）
      $out[] = [
        'voucher' => $voucher,
        'material_number' => $mn,
        'material_name' => $mname,

        // 其餘欄位維持 0（依你現行寫入欄位結構）
        'collar_new' => 0.0,
        'collar_old' => 0.0,

        'recede_new' => round($newQty, 2),
        'recede_old' => round($oldQty, 2),
        'scrap'      => round($scrap, 2),
        'footprint'  => round($foot, 2),
      ];
    }

    return $out;
  }

  private function isKeyHeader(string $s): bool
  {
    $s = trim($s);
    if ($s === '') return false;

    for ($i = 0; $i < count($this->keyHeaders); $i++) {
      if (mb_strpos($s, $this->keyHeaders[$i]) !== false) return true;
    }
    return false;
  }

  /**
   * @param array<int, mixed> $cells
   * @return array<string, int> key -> colIndex
   */
  private function buildHeaderMap(array $cells): array
  {
    $map = [];
    $norm = [];
    for ($i = 0; $i < count($cells); $i++) {
      $norm[$i] = trim((string)($cells[$i] ?? ''));
    }

    foreach ($this->alias as $key => $names) {
      $idx = $this->findCol($norm, $names);
      if ($idx !== -1) $map[$key] = $idx;
    }

    return $map;
  }

  /**
   * @param array<int, string> $cells
   * @param string[] $names
   */
  private function findCol(array $cells, array $names): int
  {
    $cellsNorm = [];
    for ($i = 0; $i < count($cells); $i++) {
      $cellsNorm[$i] = trim((string)$cells[$i]);
    }

    $namesNorm = [];
    for ($k = 0; $k < count($names); $k++) {
      $namesNorm[$k] = trim((string)$names[$k]);
    }

    // 1) 完全相等優先
    for ($k = 0; $k < count($namesNorm); $k++) {
      $n = $namesNorm[$k];
      if ($n === '') continue;

      for ($i = 0; $i < count($cellsNorm); $i++) {
        $h = $cellsNorm[$i];
        if ($h === '') continue;

        if ($h === $n) return $i;
      }
    }

    // 2) 找不到才用「包含」
    for ($k = 0; $k < count($namesNorm); $k++) {
      $n = $namesNorm[$k];
      if ($n === '') continue;

      for ($i = 0; $i < count($cellsNorm); $i++) {
        $h = $cellsNorm[$i];
        if ($h === '') continue;

        if (mb_strpos($h, $n) !== false) return $i;
      }
    }

    return -1;
  }

  /**
   * @param array<int, mixed> $cells
   * @param array<string, int> $headerMap
   */
  private function getCellByKey(array $cells, array $headerMap, string $key)
  {
    if (!isset($headerMap[$key])) return null;
    $idx = (int)$headerMap[$key];
    return $cells[$idx] ?? null;
  }

  /**
   * 數字規則：
   * - 空白/NULL -> 0
   * - 支援負數（含括號負數、全形負號、Unicode minus）
   * - 去除千分位逗號與空白
   */
  private function num($v): float
  {
    if ($v === null) return 0.0;

    if (is_int($v) || is_float($v)) return (float)$v;

    $s = trim((string)$v);
    if ($s === '') return 0.0;

    $s = str_replace([',', ' '], '', $s);

    $isParenNeg = false;
    if (preg_match('/^\((.*)\)$/', $s, $m)) {
      $isParenNeg = true;
      $s = trim($m[1]);
    }

    $s = str_replace(["－", "−"], "-", $s);

    if (!is_numeric($s)) return 0.0;

    $n = (float)$s;
    if ($isParenNeg) $n = -abs($n);

    return $n;
  }

  /**
   * @param array<int, mixed> $cells
   */
  private function isAllEmpty(array $cells): bool
  {
    for ($i = 0; $i < count($cells); $i++) {
      $v = $cells[$i];
      if ($v === null) continue;
      if (trim((string)$v) !== '') return false;
    }
    return true;
  }
}
