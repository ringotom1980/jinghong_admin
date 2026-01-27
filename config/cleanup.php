<?php
/**
 * Path: config/cleanup.php
 * 說明: 資料清理規則清單（只改這裡就能擴充多表）
 *
 * 清理範圍（依你定版）：
 * 1) 領退作業：保留 183 天 → 刪 mat_issue_batches（items 由 FK CASCADE 跟著刪）
 * 2) 對帳資料：保留 183 天 → 刪 mat_edit_reconciliation
 * 3) 工具維修：保留 10 年 → 刪 equ_repair_headers（items 由 FK CASCADE 跟著刪）
 * 4) 車輛維修：保留 10 年 → 刪 vehicle_repair_headers（items 由 FK CASCADE 跟著刪）
 */

declare(strict_types=1);

return [
  // 1) 領退作業：刪「批次主檔」，明細 mat_issue_items 會 ON DELETE CASCADE 一起刪
  [
    'name'      => 'mat_issue_batches_by_withdraw_date',
    'table'     => 'mat_issue_batches',
    'date_col'  => 'withdraw_date', // DATE 欄位
    'keep_days' => 365,             // 半年約 183 天
    'pk_col'    => 'batch_id',      // PK
    'batch'     => 2000,            // batches 通常不會爆量，保守即可
    'where'     => '',
  ],

  // 2) 對帳資料：一天一筆，直接清
  [
    'name'      => 'mat_edit_reconciliation_by_withdraw_date',
    'table'     => 'mat_edit_reconciliation',
    'date_col'  => 'withdraw_date',  // DATE 欄位
    'keep_days' => 365,              // 半年
    'pk_col'    => 'withdraw_date',  // PK=withdraw_date
    'batch'     => 2000,
    'where'     => '',
  ],

  // 3) 工具維修：刪主檔，明細 equ_repair_items 會 ON DELETE CASCADE 一起刪
  [
    'name'      => 'equ_repair_headers_by_repair_date',
    'table'     => 'equ_repair_headers',
    'date_col'  => 'repair_date', // DATE 欄位
    'keep_days' => 3650,          // 10 年
    'pk_col'    => 'id',          // PK
    'batch'     => 2000,
    'where'     => '',
  ],

  // 4) 車輛維修：刪主檔，明細 vehicle_repair_items 會 ON DELETE CASCADE 一起刪
  [
    'name'      => 'vehicle_repair_headers_by_repair_date',
    'table'     => 'vehicle_repair_headers',
    'date_col'  => 'repair_date', // DATE 欄位
    'keep_days' => 3650,          // 10 年
    'pk_col'    => 'id',          // PK
    'batch'     => 2000,
    'where'     => '',
  ],
];
