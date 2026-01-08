<?php
/**
 * Path: config/cleanup.php
 * 說明: 資料清理規則清單（只改這裡就能擴充多表）
 */

declare(strict_types=1);

return [
  [
    'name'      => 'mat_issue_items_by_withdraw_date',
    'table'     => 'mat_issue_items',
    'date_col'  => 'withdraw_date', // DATE 欄位
    'keep_days' => 183,             // 半年約 183 天（你也可改成 180）
    'pk_col'    => 'id',            // 用來 ORDER BY / LIMIT 批次刪除
    'batch'     => 5000,            // 每批刪 5000 筆（可依資料量調整）
    'where'     => '',              // 需要額外條件可加：AND xxx=...
  ],

  // （可選，先不要開）刪掉「超過半年且已無明細」的 batches，避免留下空批次
  // [
  //   'name'      => 'mat_issue_batches_no_items',
  //   'table'     => 'mat_issue_batches',
  //   'date_col'  => 'withdraw_date',
  //   'keep_days' => 183,
  //   'pk_col'    => 'batch_id',
  //   'batch'     => 1000,
  //   'where'     => "AND NOT EXISTS (SELECT 1 FROM mat_issue_items i WHERE i.batch_id = mat_issue_batches.batch_id)",
  // ],
];
