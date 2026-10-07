#!/usr/bin/env python3
"""Draft: generate only tracked runtime files; never read server env/vendor/storage.

Deployment target MUST be jinghong_admin/runtime-release, with existing dependencies
remaining in its parent. Exact replacements fail closed on source drift.
"""
import argparse
import pathlib
import subprocess

ALLOW_ROOTS = {'Public', 'app', 'config', 'scripts'}

def replace(text, old, new, count=1):
    if text.count(old) != count:
        raise ValueError(f'Source drift: expected {count} occurrences of {old!r}')
    return text.replace(old, new)

def generate(source, target):
    source, target = source.resolve(), target.resolve()
    if target == source or source in target.parents or target in source.parents:
        raise ValueError('Output must be outside source checkout')
    if target.exists():
        raise ValueError('Output must not exist; do not clear arbitrary directories')
    paths = subprocess.check_output(['git', '-C', str(source), 'ls-files', '-z']).decode().split('\0')
    selected = [p for p in paths if p and pathlib.PurePosixPath(p).parts[0] in ALLOW_ROOTS]
    # No symlinks or deployable mutable state, even if accidentally tracked.
    for p in selected:
        f = source / p
        if f.is_symlink() or not f.is_file():
            raise ValueError(f'Unsupported tracked file: {p}')
        if any(part.startswith('.env') or part in {'vendor', 'storage', '.git', '.github'} for part in pathlib.PurePosixPath(p).parts):
            raise ValueError(f'Forbidden runtime path: {p}')
    content = {p: (source / p).read_bytes() for p in selected}
    patches = {
        'app/bootstrap.php': [
            ("$envFile = dirname(__DIR__) . '/.env';", "require_once __DIR__ . '/deployment_paths.php';\n$envFile = JINGHONG_SHARED_ROOT . '/.env';", 1),
            ("require_once dirname(__DIR__) . '/vendor/autoload.php';", "require_once JINGHONG_SHARED_ROOT . '/vendor/autoload.php';", 1),
            ("return '';\n}", "return JINGHONG_PUBLIC_BASE;\n}", 1),
            ("return rtrim(substr($script, 0, $pos), '/');", "return JINGHONG_PUBLIC_BASE;", 1),
        ],
        'scripts/import_poles.php': [
            ("$envFile = dirname(__DIR__) . '/.env';", "require_once __DIR__ . '/../app/deployment_paths.php';\n$envFile = JINGHONG_SHARED_ROOT . '/.env';", 1),
            ("$root    = dirname(__DIR__);", "$root    = JINGHONG_SHARED_ROOT;", 1),
        ],
        'app/services/VehicleService.php': [
            ("$projectRoot = dirname(__DIR__, 2);", "$projectRoot = JINGHONG_SHARED_ROOT;", 2),
        ],
        'Public/index.php': [
            ("$base = '';", "$base = JINGHONG_PUBLIC_BASE;", 1),
            ("if ($pos !== false) $base = rtrim(substr($script, 0, $pos), '/');", "// Runtime directory is physical only; public URL stays stable.", 1),
        ],
    }
    for p, changes in patches.items():
        text = content[p].decode()
        for old, new, count in changes:
            text = replace(text, old, new, count)
        content[p] = text.encode()
    content['app/deployment_paths.php'] = b"<?php\ndeclare(strict_types=1);\n// runtime-release/app -> jinghong_admin, outside the cleared Git target.\ndefine('JINGHONG_SHARED_ROOT', dirname(__DIR__, 2));\ndefine('JINGHONG_PUBLIC_BASE', '/jinghong_admin');\n"
    # Online env.php is protected from preview. Preserve its original behavior
    # without reading or copying it: only a non-secret forwarding module ships.
    content['app/env.php'] = b"<?php\ndeclare(strict_types=1);\nrequire_once __DIR__ . '/deployment_paths.php';\nrequire_once JINGHONG_SHARED_ROOT . '/app/env.php';\n"
    health_path = source / 'tools/deployment/migration_health.php'
    if health_path.is_symlink() or not health_path.is_file() or 'tools/deployment/migration_health.php' not in paths:
        raise ValueError('Missing tracked dependency health check')
    content['Public/migration_health.php'] = health_path.read_bytes()
    # Parent entry owns routing. Defense in depth for non-public code.
    runtime_gate = b"RewriteEngine On\nRewriteCond %{DOCUMENT_ROOT}/jinghong_admin/runtime-enabled !-d\nRewriteCond %{THE_REQUEST} !^POST\\ /jinghong_admin/__runtime_health_9063b13\\ HTTP/\nRewriteRule ^ - [F,L]\n"
    content['.htaccess'] = b"Options -Indexes -MultiViews\n<FilesMatch \"^\\.\">\n    Require all denied\n</FilesMatch>\n" + runtime_gate + b"RewriteRule (^|/)\\. - [F,L]\nRewriteRule ^(?:app|config|scripts)(?:/|$) - [F,L,NC]\n"
    # Child RewriteEngine replaces parent's rewrite set, so repeat the stage
    # gate in Public instead of relying on parent RewriteRule inheritance.
    content['Public/.htaccess'] = runtime_gate + content['Public/.htaccess']
    sha = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD']).decode().strip()
    content['version.txt'] = ('g' + sha + '\n').encode()
    target.mkdir(parents=True)
    for p, data in content.items():
        f = target / p
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(data)
    return sha, len(content)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=pathlib.Path)
    parser.add_argument('target', type=pathlib.Path)
    args = parser.parse_args()
    print(generate(args.source, args.target))
