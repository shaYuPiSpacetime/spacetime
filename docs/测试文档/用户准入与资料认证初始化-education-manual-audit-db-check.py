import json
import os
import sys
from pathlib import Path

import pymysql


phase = sys.argv[1] if len(sys.argv) > 1 else ""
if phase not in {"before", "after"}:
    raise SystemExit("用法: python ...education-manual-audit-db-check.py before|after")

state_file = Path(os.environ.get(
    "TEST_STATE_FILE", "backend/tmp/education-manual-audit-state.json"
))
state = json.loads(state_file.read_text(encoding="utf-8"))

connection = pymysql.connect(
    host=os.environ["DEV_DB_HOST"],
    port=int(os.environ.get("DEV_DB_PORT", "3306")),
    user=os.environ["DEV_DB_USER"],
    password=os.environ["DEV_DB_PASSWORD"],
    database=os.environ["DEV_DB_NAME"],
    charset="utf8mb4",
)
try:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, user_id, audit_type, status, audit_source,
                   auditor_id, audit_time, provider_task_id
              FROM app_user_audit_record
             WHERE id = %s
            """,
            (state["recordId"],),
        )
        row = cursor.fetchone()
        if row is None:
            raise AssertionError("学历审核记录不存在")
        cursor.execute(
            """
            SELECT COUNT(*)
              FROM external_provider_task
             WHERE user_id = %s
               AND provider_type = 'EDUCATION_VERIFICATION'
            """,
            (state["userId"],),
        )
        provider_count = cursor.fetchone()[0]
finally:
    connection.close()

result = {
    "id": row[0],
    "userId": row[1],
    "auditType": row[2],
    "status": row[3],
    "auditSource": row[4],
    "auditorId": "NULL" if row[5] is None else "SET",
    "auditTime": "NULL" if row[6] is None else "SET",
    "providerTaskId": "NULL" if row[7] is None else "SET",
    "educationProviderTaskCount": provider_count,
}

assert result["auditType"] == "EDUCATION"
assert result["auditSource"] == "MANUAL"
assert result["providerTaskId"] == "NULL"
assert result["educationProviderTaskCount"] == 0
if phase == "before":
    assert result["status"] == "PENDING"
    assert result["auditorId"] == "NULL"
    assert result["auditTime"] == "NULL"
else:
    assert result["status"] == "APPROVED"
    assert result["auditorId"] == "SET"
    assert result["auditTime"] == "SET"

print(json.dumps({"phase": phase, **result}, ensure_ascii=False))
