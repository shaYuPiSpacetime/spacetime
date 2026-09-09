"""Read-only full-corpus verification against the configured development database."""
import argparse
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import pymysql
from apply_sensitive_word_migration import ROOT, load_env
from generate_sensitive_word_seed import CATEGORIES, assign_categories, collect_entries


def verify(archive, status, env_file):
    entries, source = collect_entries(archive)
    expected = {word: category for category, word in assign_categories(entries)}
    cfg = load_env(env_file)
    conn = pymysql.connect(host=cfg['DEV_DB_HOST'], port=int(cfg['DEV_DB_PORT']),
        user=cfg['DEV_DB_USER'], password=cfg['DEV_DB_PASSWORD'], database=cfg['DEV_DB_NAME'],
        charset='utf8mb4', connect_timeout=5, read_timeout=15, autocommit=True)
    try:
        with conn.cursor() as c:
            c.execute('SELECT id,word,category_code,status FROM content_sensitive_word WHERE deleted=0')
            rows = c.fetchall()
            actual = {row[1]: row[2] for row in rows}
            assert len(rows) == len(actual) == len(expected), 'active count / global uniqueness mismatch'
            assert actual == expected, 'source word or assigned category mismatch'
            assert all(row[3] == status for row in rows), 'initial status mismatch'
            c.execute('SELECT revision FROM content_sensitive_word_revision WHERE id=1 AND deleted=0')
            revision = c.fetchone()[0]
            assert revision >= 2
            c.execute("SELECT COUNT(*) FROM sys_menu WHERE path='/sensitive-words' AND parent_id IN (SELECT id FROM sys_menu WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M' AND deleted=0) AND menu_type='C' AND status='ENABLED' AND deleted=0")
            assert c.fetchone()[0] == 1
            c.execute("SELECT COUNT(DISTINCT m.perms) FROM sys_menu m JOIN sys_role_menu rm ON rm.menu_id=m.id JOIN sys_role r ON r.id=rm.role_id WHERE r.role_code='super_admin' AND r.status='ENABLED' AND r.deleted=0 AND m.deleted=0 AND m.perms IN ('sensitive-word:list','sensitive-word:add','sensitive-word:edit','sensitive-word:delete')")
            grants = c.fetchone()[0]
            assert grants == 4
        samples = [dict(id=row[0], word=row[1], categoryCode=row[2], status=row[3])
                   for row in rows if row[1] in ('北京', '希望', '未来', '护士', '真', '比', '法', 'b')]
        counts = Counter(row[2] for row in rows)
        representative = {}
        for row in rows:
            if 2 <= len(row[1]) <= 24 and row[2] not in representative:
                representative[row[2]] = dict(id=row[0], word=row[1], categoryCode=row[2], status=row[3])
        assert representative, 'no searchable vocabulary sample'
        return {'result': 'PASS', 'verifiedAt': datetime.now().astimezone().isoformat(),
            'archiveSha256': source['archiveSha256'], 'activeWords': len(rows),
            'allWordsAndCategoriesMatchArchive': True, 'duplicateActiveOriginalWords': 0,
            'initialStatus': status, 'statusCounts': dict(Counter(row[3] for row in rows)),
            'categoryCounts': {code: counts[code] for code, _ in CATEGORIES},
            'categoryCount': len(CATEGORIES), 'populatedCategoryCount': len(counts),
            'combinedListVerification': source.get('combinedListVerification'),
            'representativeSamples': list(representative.values()),
            'revision': revision, 'operationCenterMenus': 1, 'menuParent': '运营中心', 'superAdminPermissionCount': grants,
            'normalExpressionSamples': samples, 'verificationLayer': 'real database; not authenticated UI'}
    finally:
        conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--status', choices=['ENABLED', 'DISABLED'], required=True)
    parser.add_argument('--env-file', type=Path, default=ROOT/'backend/.env.local')
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.archive, args.status, args.env_file)
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: result[k] for k in ('result', 'activeWords', 'initialStatus',
        'allWordsAndCategoriesMatchArchive', 'duplicateActiveOriginalWords', 'superAdminPermissionCount')}, ensure_ascii=False))
