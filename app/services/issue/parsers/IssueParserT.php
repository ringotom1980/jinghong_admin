<?php

/**
 * Path: app/services/mat/issue/parsers/IssueParserT.php
 * 說明: T 類解析器（只負責 T 單）
 * 規則：
 * - 只取第一張 sheet（上層已做）
 * - header row：掃前 30 列，命中關鍵欄位 >= 4
 * - alias map：欄名同義詞映射
 * - 拆除良優先：拆除良>0 走拆除良，否則舊料>0 走舊料
 * - 空白/非數字 -> 0；數值 round(2)
 */

declare(strict_types=1);

use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

final class IssueParserT
{
  /** @var array<string, string[]> */
  private $alias = [
    'voucher' => ['憑證批號', '憑證批號(批次)', '憑證批號/批次'],
    'good_qty' => ['拆除良數量', '拆除良', '拆除良(數量)'],
    'old_qty' => ['舊料數量', '舊料', '舊料(數量)'],
    'good_mat_no' => ['拆除原材料編號', '拆除原材料編號(料號)', '拆除原材料編碼'],
    'mat_no' => ['材料編號', '材料料號', '料號'],
    'good_mat_name' => ['拆除原材料名稱', '拆除原材料名稱(品名)', '拆除原材料品名'],
    'mat_name' => ['材料名稱及規範', '材料名稱規格', '材料名稱', '品名及規範', '品名規格'],
    'scrap' => ['廢料數量', '廢料', '廢料(數量)'],
    'footprint' => ['下腳數量', '下腳', '下腳(數量)'],
  ];

  /** @var string[] */
  private $keyHeaders = [
    '憑證批號',
    '拆除良數量',
    '舊料數量',
    '拆除原材料編號',
    '材料編號',
    '拆除原材料名稱',
    '材料名稱及規範',
    '廢料數量',
    '下腳數量'
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

      $voucher = $this->getCellByKey($cells, $headerMap, 'voucher');

      $goodQty = $this->num($this->getCellByKey($cells, $headerMap, 'good_qty'));
      $oldQty  = $this->num($this->getCellByKey($cells, $headerMap, 'old_qty'));

      $scrap = $this->num($this->getCellByKey($cells, $headerMap, 'scrap'));
      $foot  = $this->num($this->getCellByKey($cells, $headerMap, 'footprint'));
error_log('[T] voucher='.(string)$voucher
  .' good_raw='.json_encode($this->getCellByKey($cells,$headerMap,'good_qty'), JSON_UNESCAPED_UNICODE)
  .' old_raw='.json_encode($this->getCellByKey($cells,$headerMap,'old_qty'), JSON_UNESCAPED_UNICODE)
  .' scrap_raw='.json_encode($this->getCellByKey($cells,$headerMap,'scrap'), JSON_UNESCAPED_UNICODE)
  .' foot_raw='.json_encode($this->getCellByKey($cells,$headerMap,'footprint'), JSON_UNESCAPED_UNICODE)
  .' => good='.$goodQty.' old='.$oldQty.' scrap='.$scrap.' foot='.$foot
);

      // === 定版規則（T單）===
      // - 每列都要匯入（不因 good/old 都 0 就跳過）
      // - material_* / recede_old 的來源由 good/old 決策：
      //   1) good>0 且 old==0 => 拆除原材料 + recede_old=good
      //   2) good==old 且 >0  => 材料編號/名稱及規範 + recede_old=old
      //   3) 其餘（good==0 或 old>0 或 兩者皆0）=> 材料編號/名稱及規範 + recede_old=old(可為0)

      $mn = '';
      $mname = '';
      $recedeOld = 0.0;

      if ($goodQty > 0 && $oldQty == 0.0) {
        // Case: 拆除良>0、舊料=0（此時 scrap/foot 依來源必為0，但仍照欄位取值）
        $mn = trim((string)$this->getCellByKey($cells, $headerMap, 'good_mat_no'));
        $mname = trim((string)$this->getCellByKey($cells, $headerMap, 'good_mat_name'));
        $recedeOld = $goodQty;
      } else {
        // Case: (1) good=0 old>0、(2) good=old>0、(3) good=0 old=0（廢料/下腳列）
        $mn = trim((string)$this->getCellByKey($cells, $headerMap, 'mat_no'));
        $mname = trim((string)$this->getCellByKey($cells, $headerMap, 'mat_name'));
        $recedeOld = $oldQty; // 可為 0
      }

      // material_number 為必填；若此列真的沒料號，才跳過（避免寫入空料號造成後續流程問題）
      if ($mn === '') continue;

      $out[] = [
        'voucher' => (string)$voucher,
        'material_number' => $mn,
        'material_name' => $mname,
        // 本 T 單目前只回填 recede_old/scrap/footprint，其餘維持 0
        'collar_new' => 0.0,
        'collar_old' => 0.0,
        'recede_new' => 0.0,
        'recede_old' => round($recedeOld, 2),
        'scrap' => round($scrap, 2),
        'footprint' => round($foot, 2),
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
      $v = trim((string)($cells[$i] ?? ''));
      $norm[$i] = $v;
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
    for ($i = 0; $i < count($cells); $i++) {
      $h = $cells[$i];
      if ($h === '') continue;

      for ($k = 0; $k < count($names); $k++) {
        $n = $names[$k];
        if ($n !== '' && mb_strpos($h, $n) !== false) {
          return $i;
        }
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
   * 數字規則：空白/NULL/非數字 -> 0
   */
  private function num($v): float
  {
    if ($v === null) return 0.0;
    if (is_string($v)) {
      $v = trim($v);
      if ($v === '') return 0.0;
      $v = str_replace([',', ' '], '', $v);
    }
    if (!is_numeric($v)) return 0.0;
    return (float)$v;
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
