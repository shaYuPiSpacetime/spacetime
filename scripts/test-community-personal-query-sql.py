"""Execute mapper SQL against isolated SQLite fixtures; does not claim MySQL EXPLAIN evidence."""
from pathlib import Path
import re
import sqlite3
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
source = (root / 'backend/src/main/java/com/spacetime/common/mapper/CommunityPersonalQueryMapper.java').read_text(encoding='utf-8')
sql_blocks = re.findall(r'@Select\("""(.*?)"""\)', source, re.S)
db = sqlite3.connect(':memory:')
db.create_function('CONCAT', -1, lambda *args: ''.join(map(str, args)))
db.executescript('''
CREATE TABLE community_post(id INTEGER PRIMARY KEY, author_id INTEGER, deleted INTEGER, status TEXT, like_count INTEGER);
CREATE TABLE community_follow(id INTEGER PRIMARY KEY, follower_id INTEGER, target_user_id INTEGER, deleted INTEGER, status TEXT);
CREATE TABLE community_comment(id INTEGER PRIMARY KEY, post_id INTEGER, author_id INTEGER, deleted INTEGER, status TEXT, content TEXT, create_time TEXT);
CREATE TABLE community_comment_like(id INTEGER PRIMARY KEY, comment_id INTEGER, deleted INTEGER, status TEXT);
CREATE TABLE community_like(id INTEGER PRIMARY KEY, post_id INTEGER, user_id INTEGER, deleted INTEGER, status TEXT, update_time TEXT);
CREATE TABLE community_view_history(id INTEGER PRIMARY KEY, user_id INTEGER, post_id INTEGER, deleted INTEGER, viewed_at TEXT);
CREATE TABLE app_user_unlock_record(id INTEGER PRIMARY KEY, user_id INTEGER, target_user_id INTEGER, deleted INTEGER, unlock_no TEXT, effective_time TEXT);
CREATE TABLE app_user(id INTEGER PRIMARY KEY, deleted INTEGER);
CREATE TABLE community_content_preference(id INTEGER PRIMARY KEY, user_id INTEGER, target_user_id INTEGER, deleted INTEGER, action_type TEXT, status TEXT, update_time TEXT);
INSERT INTO app_user VALUES(1,0),(2,0),(3,1);
INSERT INTO community_post VALUES(100,1,0,'published',7),(101,1,0,'rejected',0),(102,1,0,'blocked',99),(103,1,1,'published',99),(104,2,0,'published',2);
INSERT INTO community_follow VALUES(1,1,2,0,'FOLLOW'),(2,2,1,0,'FOLLOW'),(3,1,3,0,'UNFOLLOW'),(4,3,1,1,'FOLLOW');
INSERT INTO community_comment VALUES(1,100,1,0,'published','a','2026-10-10'),(2,100,1,0,'published','b','2026-10-10'),(3,102,1,0,'published','hidden parent','2026-10-11'),(4,100,1,1,'published','deleted','2026-10-12');
INSERT INTO community_comment_like VALUES(1,1,0,'enabled'),(2,2,0,'disabled'),(3,4,0,'enabled'),(4,1,1,'enabled');
INSERT INTO community_like VALUES(1,100,1,0,'ENABLED','2026-10-10'),(2,102,1,0,'ENABLED','2026-10-11'),(3,104,1,0,'DISABLED','2026-10-12'),(4,100,3,0,'ENABLED','2026-10-12');
INSERT INTO community_view_history VALUES(1,1,100,0,'2026-10-10'),(2,1,102,0,'2026-10-11'),(3,1,103,0,'2026-10-12'),(4,1,104,1,'2026-10-13');
INSERT INTO app_user_unlock_record VALUES(1,1,2,0,'ULK-1','2026-10-10'),(2,1,2,1,'ULK-2','2026-10-11');
INSERT INTO community_content_preference VALUES(1,1,2,0,'hide_author_posts','enabled','2026-10-10'),(2,1,3,0,'hide_author_posts','enabled','2026-10-11');
''')


def query(block, kind=None, page=1, size=50):
    if '<script>' in block:
        choose = ET.fromstring(block.strip()).find('choose')
        branch = next((item for item in choose.findall('when') if f"'{kind}'" in item.attrib['test']), choose.find('otherwise'))
        block = ''.join(branch.itertext())
    sql = re.sub(r'#\{(\w+)\}', r':\1', block)
    params = {'userId': 1, 'postId': 100}
    total = db.execute(f'SELECT COUNT(*) FROM ({sql}) q', params).fetchone()[0]
    rows = db.execute(sql + ' LIMIT :limit OFFSET :offset', params | {'limit': size, 'offset': (page - 1) * size}).fetchall()
    return rows, total


assert query(sql_blocks[0])[0] == [(2, 1, 1, 8)], 'aggregate filters and null-safe received likes'
for kind, expected in [('commented', 2), ('liked', 1), ('viewed', 1), ('unlocked', 1)]:
    rows, total = query(sql_blocks[1], kind)
    assert len(rows) == total == expected, kind
first, total = query(sql_blocks[1], 'commented', size=1)
second, other_total = query(sql_blocks[1], 'commented', page=2, size=1)
assert first[0][0] == 'comment-2' and second[0][0] == 'comment-1' and total == other_total == 2
assert query(sql_blocks[2], 'commented')[0] == [(1, 'b', '2026-10-10')], 'comment user dedup selects latest body'
assert query(sql_blocks[2], 'liked')[0] == [(1, '2026-10-10')], 'deleted users excluded'
assert query(sql_blocks[3])[0] == [(2, '2026-10-10')], 'hidden author count matches visible users'

# Large histories are paged before profile assembly; preserve total with stable ties.
db.executemany('INSERT INTO community_comment VALUES(?,104,1,0,\'published\',\'fixture\',\'2026-10-09\')', [(i,) for i in range(1000, 21000)])
rows, total = query(sql_blocks[1], 'commented', page=2, size=50)
assert len(rows) == 50 and total == 20002
assert rows[0][0] != first[0][0]

migration = (root / 'deploy/sql/prod/110_community_personal_query_indexes.sql').read_text(encoding='utf-8')
workflow = (root / '.github/workflows/deploy-backend-prod.yml').read_text(encoding='utf-8')
assert migration.count('ADD INDEX') == 11
assert migration.count('NOT EXISTS') == 11
assert workflow.count('110_community_personal_query_indexes.sql') == 2
print('SQL fixtures passed: aggregation, four history branches, tie paging, user dedup, hidden users, 20,002-row pagination, 11 idempotent deployment indexes')
