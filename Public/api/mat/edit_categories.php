<?php
/**Public/api/mat/edit_categories.php
 * 分類：list / create / update / delete / sort
 */
declare(strict_types=1);
require_once __DIR__ . '/../../../app/bootstrap.php';
require_login();

$svc = new MatEditService();
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            json_ok($svc->listCategories());

        case 'create':
            $id = $svc->createCategory(trim($_POST['name'] ?? ''));
            json_ok(['id' => $id]);

        case 'update':
            $svc->updateCategory((int)$_POST['id'], trim($_POST['name']));
            json_ok();

        case 'delete':
            $svc->deleteCategory((int)$_POST['id']);
            json_ok();

        case 'sort':
            $svc->sortCategories($_POST['ids'] ?? []);
            json_ok();

        default:
            json_error('未知 action');
    }
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
