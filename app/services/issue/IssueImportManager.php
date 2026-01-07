<?php

/**
 * Path: app/services/mat/issue/IssueImportManager.php
 * 說明: 匯入總控（依 file_type 分派 parser）
 */

declare(strict_types=1);

require_once __DIR__ . '/parsers/IssueParserT.php';
require_once __DIR__ . '/parsers/IssueParserS.php';
require_once __DIR__ . '/parsers/IssueParserKLW.php';

final class IssueImportManager
{
  public function getParser(string $fileType)
  {
    $t = strtoupper(trim($fileType));
    // 目前只先做 T；未來新增 L/K/W/S 只要新增 Parser 類別並在這裡 mapping
    if ($t === 'T') return new IssueParserT();
    if ($t === 'S') return new IssueParserS();
    if ($t === 'K' || $t === 'L' || $t === 'W') return new IssueParserKLW();
    // default fallback
    return new IssueParserT();
  }
}
