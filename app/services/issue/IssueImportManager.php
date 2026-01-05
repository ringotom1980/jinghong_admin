<?php
/**
 * Path: app/services/mat/issue/IssueImportManager.php
 * 說明: 匯入總控（依 file_type 分派 parser）
 */

declare(strict_types=1);

require_once __DIR__ . '/parsers/IssueParserT.php';

final class IssueImportManager
{
  public function getParser(string $fileType)
  {
    $t = strtoupper(trim($fileType));
    // 目前只先做 T；未來新增 L/K/W/S 只要新增 Parser 類別並在這裡 mapping
    if ($t === 'T') return new IssueParserT();

    // default fallback
    return new IssueParserT();
  }
}
