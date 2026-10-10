"""Verify the exact recovery SQL in a disposable CI MySQL instance."""
import os
import re
import subprocess
from pathlib import Path

if os.environ.get('OPS_FIXTURE_TEST') != '1':
    raise SystemExit('Requires dedicated fixture environment')
ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / 'scripts/ops/restore-relation-cancel-20261010.sql').read_text(encoding='utf8')
DB = 'ops_relation_restore_fixture'
CLIENT = ['mysql', '-h127.0.0.1', '-P3306', '-uroot', '--default-character-set=utf8mb4', '--batch', '--skip-column-names']

def query(sql, database=True, failure=None):
    result = subprocess.run(CLIENT + ([DB] if database else []), input=sql, text=True, capture_output=True)
    if failure:
        assert result.returncode != 0 and failure in result.stderr, result.stderr
    else:
        assert result.returncode == 0, result.stderr
    return result.stdout.strip()

def fixture():
    query(f'DROP DATABASE IF EXISTS {DB}; CREATE DATABASE {DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', False)
    migration = (ROOT / 'deploy/sql/prod/056_prd02_relation_feedback.sql').read_text(encoding='utf8')
    for table in ['app_relation_like', 'app_relation_visit']:
        query(re.search(rf'CREATE TABLE IF NOT EXISTS `{table}` .*?;(?=\s)', migration, re.S).group())
    query("""
CREATE TABLE app_user(id BIGINT PRIMARY KEY,phone_hash CHAR(64),phone VARCHAR(30),deleted INT DEFAULT 0,account_status VARCHAR(20) DEFAULT 'NORMAL');
INSERT INTO app_user(id,phone_hash) VALUES (1,'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a');
INSERT INTO app_user(id) VALUES (2),(3),(4),(5),(6),(7),(8),(9),(10),(11);
CREATE TABLE app_user_cancel_request(id BIGINT PRIMARY KEY,user_id BIGINT,deleted INT DEFAULT 0,create_time DATETIME,status VARCHAR(20),revoked_time DATETIME);
INSERT INTO app_user_cancel_request VALUES(1,1,0,'2026-10-10 14:16:37','RESTORED','2026-10-10 14:16:40');
CREATE TABLE app_user_relation_block(id BIGINT PRIMARY KEY,user_id BIGINT,target_user_id BIGINT,deleted INT DEFAULT 0,status VARCHAR(20),block_type VARCHAR(30));
INSERT INTO app_user_relation_block VALUES(1,7,1,0,'ENABLED','BLACKLIST');
SET @t='2026-10-10 14:16:37';
INSERT INTO app_relation_like(id,like_no,request_id,from_user_id,to_user_id,like_status,active_marker,invalid_reason,invalid_time,liked_time) VALUES
(1,'l1','r1',1,2,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(2,'l2','r2',3,1,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(3,'l3','r3',1,4,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(4,'l4','r4',1,4,'active',1,NULL,NULL,'2026-10-10 15:00:00'),
(5,'l5','r5',1,5,'cancelled',NULL,'like_cancelled',@t,'2026-10-09 10:00:00'),
(6,'l6','r6',1,6,'invalid',NULL,'account_deleted','2026-10-09 10:00:00','2026-10-09 09:00:00'),
(7,'l7','r7',1,7,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(8,'l8','r8',1,8,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(9,'l9','r9',1,8,'cancelled',NULL,'like_cancelled','2026-10-10 15:00:00','2026-10-10 14:50:00'),
(10,'l10','r10',9,10,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00'),
(11,'l11','r11',1,11,'invalid',NULL,'account_deleted',@t,'2026-10-09 10:00:00');
UPDATE app_user SET account_status='FROZEN' WHERE id=11;
INSERT INTO app_relation_visit(id,visit_no,visitor_user_id,target_user_id,visit_status,first_visit_time,last_visit_time,invalid_reason,invalid_time) VALUES
(1,'v1',2,1,'invalid',@t,@t,'account_deleted',@t),
(2,'v2',7,1,'invalid',@t,@t,'account_deleted',@t),
(3,'v3',9,10,'invalid',@t,@t,'account_deleted',@t),
(4,'v4',3,1,'invalid',@t,@t,'blocked',@t);
""")

fixture()
assert query(SQL).startswith('completed\t')
assert query("SELECT GROUP_CONCAT(id ORDER BY id) FROM app_relation_like WHERE like_status='active';") == '1,2,4'
assert query('SELECT GROUP_CONCAT(id ORDER BY id) FROM ops_bak_20261010_cancel_likes;') == '1,2'
assert query("SELECT GROUP_CONCAT(id ORDER BY id) FROM app_relation_visit WHERE visit_status='visible';") == '1'
assert query('SELECT COUNT(*) FROM ops_bak_20261010_cancel_visits;') == '1'
query("UPDATE app_relation_like SET like_status='cancelled',active_marker=NULL WHERE id=1;")
assert query(SQL).startswith('already_completed\t')
assert query("SELECT like_status FROM app_relation_like WHERE id=1;") == 'cancelled'
print('PASS scope, backup, bidirectional likes, visits, new duplicates, later cancellations, blocks, abnormal peers, repeat protection')

for setup, error in [
    ("UPDATE app_user SET phone_hash=NULL WHERE id=1;", 'Target identity is not unique'),
    ("UPDATE app_user SET phone_hash=(SELECT h FROM (SELECT phone_hash h FROM app_user WHERE id=1) s) WHERE id=2;", 'Target identity is not unique'),
    ("UPDATE app_user SET account_status='CANCELLING' WHERE id=1;", 'Target account is not normal'),
    ("UPDATE app_user_cancel_request SET status='COOLING_OFF';", 'Cancellation recovery guard failed'),
    ("INSERT INTO app_user_cancel_request VALUES(2,1,0,'2026-10-10 16:00:00','RESTORED','2026-10-10 16:00:01');", 'Cancellation recovery guard failed'),
]:
    fixture()
    query(setup)
    query(SQL, failure=error)
    assert query("SELECT COUNT(*) FROM app_relation_like WHERE like_status='active';") == '1'
    print('PASS guard: ' + error)

fixture()
query("""CREATE TRIGGER reject_restore BEFORE UPDATE ON app_relation_visit FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture rollback';""")
query(SQL, failure='fixture rollback')
assert query('SELECT COUNT(*) FROM ops_bak_20261010_cancel_likes;') == '0'
assert query('SELECT COUNT(*) FROM ops_relation_restore_log;') == '0'
assert query("SELECT like_status FROM app_relation_like WHERE id=1;") == 'invalid'
print('PASS atomic rollback after like updates and backups')
