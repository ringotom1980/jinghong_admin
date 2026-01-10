<?php
/**
 * Path: Public/api/mat/edit_B.php
 * 說明: B 班管理 API
 * - GET  action=list
 * - POST action=sort      payload: { ordered: [material_number...] }
 * - POST action=move_to   payload: { material_number: "...", position: 3 }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatEditBService.php';

$svc = new MatEditBService(db());

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

$payload = [];
if ($method !== 'GET') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];
}

if ($method === 'GET') {
    $action = (string)($_GET['action'] ?? 'list');
} else {
    $action = (string)($_GET['action'] ?? '');
    if ($action === '') $action = (string)($payload['action'] ?? '');
}

try {
    if ($method === 'GET' && $action === 'list') {
        $items = $svc->listItems();
        json_ok(['items' => $items]);
    }

    if ($method === 'POST') {

        if ($action === 'sort') {
            $ordered = $payload['ordered'] ?? [];
            if (!is_array($ordered)) $ordered = [];
            $svc->saveOrder($ordered);
            json_ok(true);
        }

        if ($action === 'move_to') {
            $mn = trim((string)($payload['material_number'] ?? ''));
            $pos = (int)($payload['position'] ?? 0);
            if ($mn === '') throw new RuntimeException('material_number 不可為空');
            if ($pos <= 0) throw new RuntimeException('position 必須為正整數');
            $svc->moveToPosition($mn, $pos);
            json_ok(true);
        }
    }

    json_error('不支援的 action', 400);

} catch (Throwable $e) {
    json_error($e->getMessage(), 400);
}
