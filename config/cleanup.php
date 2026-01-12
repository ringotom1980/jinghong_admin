<?php
/**
 * Path: config/cleanup.php
 * 說明: 資料清理規則清單（只改這裡就能擴充多表）
 */

declare(strict_types=1);

return [
  //領退匯入資料
  [
    'name'      => 'mat_issue_items_by_withdraw_date',
    'table'     => 'mat_issue_items',
    'date_col'  => 'withdraw_date', // DATE 欄位
    'keep_days' => 183,             // 半年約 183 天（你也可改成 180）
    'pk_col'    => 'id',            // 用來 ORDER BY / LIMIT 批次刪除
    'batch'     => 5000,            // 每批刪 5000 筆（可依資料量調整）
    'where'     => '',              // 需要額外條件可加：AND xxx=...
  ],

  // 對帳資料表
    [
    'name'      => 'mat_edit_reconciliation_by_withdraw_date',
    'table'     => 'mat_edit_reconciliation',
    'date_col'  => 'withdraw_date',  // DATE 欄位
    'keep_days' => 183,              // 依你要保留多久調整
    'pk_col'    => 'withdraw_date',  // 這張表 PK 就是 withdraw_date
    'batch'     => 5000,             // 這張表一天一筆，其實 1000 也夠
    'where'     => '',
  ],

];
