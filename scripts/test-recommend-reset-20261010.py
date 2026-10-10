"""Run the reset SQL against a disposable local CI MySQL database before production."""
import json
import os
from pathlib import Path
import subprocess

if os.environ.get("OPS_FIXTURE_TEST") != "1":
    raise SystemExit("Requires the dedicated CI fixture environment")

ROOT = Path(__file__).resolve().parents[1]
SQL = (ROOT / "deploy/sql/prod/111_ops_reset_recommend_20261010.sql").read_text(encoding="utf-8")
DB = "ops_recommend_reset_fixture"
HASH = "a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a"
CLIENT = ["mysql", "-h127.0.0.1", "-P3306", "-uroot", "--default-character-set=utf8mb4", "--batch", "--skip-column-names"]


def query(sql, database=True, success=True):
    """Execute fixture-only SQL and expose no connection credentials."""
    result = subprocess.run(CLIENT + ([DB] if database else []), input=sql, text=True, capture_output=True)
    if success and result.returncode:
        raise AssertionError(result.stderr)
    if not success:
        assert result.returncode != 0, "Expected the reset to reject ambiguous account identity"
        assert "Target account must match exactly one active user" in result.stderr
    return result.stdout.strip()


def fixture(status="active", expiry="NULL", quota=20):
    """Rebuild minimal tables used by the unchanged production operation."""
    query(f"DROP DATABASE IF EXISTS {DB}; CREATE DATABASE {DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;", database=False)
    log_schema = (ROOT / "deploy/sql/prod/065_prd08_recommend_ideal_closure.sql").read_text(encoding="utf-8")
    log_schema = log_schema[log_schema.index("CREATE TABLE IF NOT EXISTS `ct_recommend_view_log`"):]
    log_schema = log_schema[:log_schema.index(";\n") + 1]
    query(f"""
CREATE TABLE app_user (id BIGINT PRIMARY KEY, phone VARCHAR(30), phone_hash CHAR(64), deleted TINYINT DEFAULT 0);
CREATE TABLE app_user_asset (id BIGINT PRIMARY KEY, user_id BIGINT, vip_status VARCHAR(20), vip_expire_time DATETIME, deleted TINYINT DEFAULT 0);
CREATE TABLE app_config (id BIGINT PRIMARY KEY, config_key VARCHAR(64), config_value VARCHAR(255), deleted TINYINT DEFAULT 0);
{log_schema}
INSERT INTO app_user VALUES (1, NULL, '{HASH}', 0), (2, NULL, 'other-account', 0);
INSERT INTO app_user_asset VALUES (1,1,'{status}',{expiry},0);
INSERT INTO app_config VALUES (1,'commercial.view.quota.normal','10',0),(2,'commercial.view.quota.vip','{quota}',0);
SET @now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR);
SET @cycle = TIMESTAMP(DATE(DATE_SUB(@now, INTERVAL 12 HOUR)), '12:00:00');
INSERT INTO ct_recommend_view_log (id,event_no,request_id,user_id,candidate_user_id,scene,action,viewed_at,deleted) VALUES
(1,'event1','request1',1,100,'recommend','view',@cycle,0),
(2,'event2','request2',1,100,'recommend','view',@cycle,0),
(3,'event3','request3',1,101,'recommend','view',@now,0),
(4,'event4','request4',1,102,'recommend','view',DATE_SUB(@cycle,INTERVAL 1 SECOND),0),
(5,'event5','request5',2,103,'recommend','view',@now,0),
(6,'event6','request6',1,104,'recommend','skip',@now,0),
(7,'event7','request7',1,105,'recommend','detail',@now,0),
(8,'event8','request8',1,106,'recommend','like',@now,0),
(9,'event9','request9',1,107,'recommend','never',@now,0),
(10,'event10','request10',1,108,'recommend','issued',@now,0),
(11,'event11','request11',1,109,'recommend','view',@now,1),
(12,'event12','request12',1,110,'recommend','view',DATE_ADD(@cycle,INTERVAL 1 DAY),0);
""")


for name, status, expiry, quota in [
    ("active VIP", "active", "NULL", 20),
    ("normal account", "inactive", "NULL", 10),
    ("expired VIP", "active", "DATE_SUB(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR),INTERVAL 1 DAY)", 10),
]:
    fixture(status, expiry)
    output = query(SQL)
    assert output.startswith("completed\t"), output
    summary = json.loads(output.split("\t", 1)[1])
    assert summary["before_view_rows"] == 3 and summary["before_unique_candidates"] == 2
    assert summary["browse_quota"] == quota and summary["restored_remaining"] == quota
    assert summary["before_remaining"] == quota - 2 and summary["remaining_view_rows"] == 0
    assert query("SELECT GROUP_CONCAT(id ORDER BY id) FROM ct_recommend_view_log;") == "4,5,6,7,8,9,10,11,12"
    assert query("SELECT GROUP_CONCAT(id ORDER BY id) FROM ops_bak_20261010_recommend_views;") == "1,2,3"
    query("""INSERT INTO ct_recommend_view_log (id,event_no,request_id,user_id,candidate_user_id,scene,action,viewed_at)
VALUES (13,'event13','request13',1,111,'recommend','view',DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR));""")
    assert query(SQL).startswith("already_completed\t")
    assert query("SELECT COUNT(*) FROM ct_recommend_view_log WHERE id=13;") == "1"
    print(f"PASS: {name}, exact scope, backup, unique counting and repeat protection")

for name, identity_change in [
    ("missing account", "DELETE FROM app_user WHERE id=1;"),
    ("duplicate account", f"INSERT INTO app_user VALUES (3,NULL,'{HASH}',0);"),
]:
    fixture()
    query(identity_change)
    query(SQL, success=False)
    assert query("SELECT COUNT(*) FROM ct_recommend_view_log;") == "12"
    assert query("SELECT COUNT(*) FROM ops_bak_20261010_recommend_views;") == "0"
    print(f"PASS: {name}, reset rejected with all logs preserved")

query(f"DROP DATABASE {DB};", database=False)
print("All recommendation reset database scenarios passed")
