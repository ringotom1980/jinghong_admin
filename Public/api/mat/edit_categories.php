<?php

/**
 * Path: Public/api/mat/edit_categories.php
 * 說明: D 班分類 API（list/create/update/delete/sort）
 */

declare(strict_types=1);

require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

require_once __DIR__ . '/../../../app/services/MatEditService.php';

$svc = new MatEditService(db());

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

/** 統一讀 payload（JSON body） */
$payload = [];
if ($method !== 'GET') {
    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) $payload = [];
}

/**
 * 統一 action 來源（兼容）
 * - GET：action 走 query（預設 list）
 * - POST：優先 query action，其次 payload action
 */
if ($method === 'GET') {
    $action = (string)($_GET['action'] ?? 'list');
} else {
    $action = (string)($_GET['action'] ?? '');
    if ($action === '') $action = (string)($payload['action'] ?? '');
}

try {

    /** GET list */
    if ($method === 'GET' && $action === 'list') {
        json_ok([
            'categories' => $svc->listCategories()
        ]);
    }

    /** POST actions */
    if ($method === 'POST') {

        if ($action === 'create') {
            // 兼容：前端可能送 name 或 category_name
            $name = (string)($payload['category_name'] ?? $payload['name'] ?? '');
            $id = $svc->createCategory($name);
            json_ok(['id' => $id]);
        }

        if ($action === 'update') {
            $id = (int)($payload['id'] ?? 0);
            $name = (string)($payload['category_name'] ?? $payload['name'] ?? '');
            $svc->renameCategory($id, $name);
            json_ok(true);
        }

        if ($action === 'delete') {
            $ids = $payload['ids'] ?? [];
            if (!is_array($ids)) $ids = [];
            $svc->deleteCategories($ids);
            json_ok(true);
        }

        if ($action === 'sort') {
            $ordered = $payload['ordered_ids'] ?? [];
            if (!is_array($ordered)) $ordered = [];
            $svc->sortCategories($ordered);
            json_ok(true);
        }

        if ($action === 'bulk_update') {
            $updates = $payload['updates'] ?? [];
            $deletes = $payload['deletes'] ?? [];
            $order   = $payload['order'] ?? null;

            if (!is_array($updates)) $updates = [];
            if (!is_array($deletes)) $deletes = [];

            // order 允許：null 或 array
            if ($order !== null && !is_array($order)) $order = null;

            // normalize deletes
            $deletes = array_values(array_filter(array_map('intval', $deletes), function ($v) {
                return $v > 0;
            }));

            // normalize updates: [{id:int, name:string}]
            $normUpdates = [];
            foreach ($updates as $u) {
                if (!is_array($u)) continue;
                $id = (int)($u['id'] ?? 0);
                $name = trim((string)($u['name'] ?? ''));
                if ($id <= 0) continue;
                if ($name === '') continue;
                $normUpdates[] = ['id' => $id, 'name' => $name];
            }

            // normalize order
            $normOrder = null;
            if (is_array($order)) {
                $normOrder = array_values(array_filter(array_map('intval', $order), function ($v) {
                    return $v > 0;
                }));
                if (!$normOrder) $normOrder = null;
            }

            // ✅ 交易：確保 delete/rename/sort 一致性（任一步失敗整包回滾）
            $pdo = db();
            $pdo->beginTransaction();
            try {
                // 1) delete
                if ($deletes) {
                    $svc->deleteCategories($deletes);
                }

                // 2) rename（跳過已刪除者）
                if ($normUpdates) {
                    $deletedSet = $deletes ? array_fill_keys($deletes, true) : [];
                    foreach ($normUpdates as $u) {
                        if (isset($deletedSet[$u['id']])) continue;
                        $svc->renameCategory($u['id'], $u['name']);
                    }
                }

                // 3) sort（若有提供）
                if ($normOrder) {
                    // 也跳過已刪除者
                    if ($deletes) {
                        $delSet = array_fill_keys($deletes, true);
                        $normOrder = array_values(array_filter($normOrder, function ($id) use ($delSet) {
                            return !isset($delSet[$id]);
                        }));
                    }
                    if ($normOrder) $svc->sortCategories($normOrder);
                }

                $pdo->commit();
                json_ok(true);
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }
        }
    }

    json_error('不支援的 action', 400);
} catch (Throwable $e) {
    json_error($e->getMessage(), 400);
}
