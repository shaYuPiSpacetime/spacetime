#!/usr/bin/env python3
"""Apply PRD-03 SQL and seed idempotent message-interaction demo facts."""

from __future__ import annotations

import argparse
from pathlib import Path

import pymysql


ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / "backend" / ".env.local"
MIGRATION = ROOT / "deploy" / "sql" / "prod" / "070_prd03_message_center_closure.sql"
SEED = ROOT / "deploy" / "sql" / "ops" / "071_prd03_message_interaction_demo_seed.sql"


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def connect():
    env = load_env()
    return pymysql.connect(
        host=env["DEV_DB_HOST"],
        port=int(env.get("DEV_DB_PORT", "3306")),
        user=env["DEV_DB_USER"],
        password=env["DEV_DB_PASSWORD"],
        database=env["DEV_DB_NAME"],
        charset="utf8mb4",
        autocommit=False,
    )


def statements(sql: str):
    delimiter = ";"
    buffer: list[str] = []
    for raw in sql.splitlines():
        stripped = raw.strip()
        if stripped.upper().startswith("DELIMITER "):
            delimiter = stripped.split(None, 1)[1]
            continue
        if not stripped or stripped.startswith("--"):
            continue
        buffer.append(raw)
        joined = "\n".join(buffer).rstrip()
        if joined.endswith(delimiter):
            yield joined[: -len(delimiter)].strip()
            buffer.clear()
    if buffer:
        yield "\n".join(buffer).strip()


def execute_file(connection, path: Path) -> int:
    count = 0
    with connection.cursor() as cursor:
        for statement in statements(path.read_text(encoding="utf-8")):
            cursor.execute(statement)
            count += 1
    connection.commit()
    return count


def probe(connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id,nickname,account_status FROM app_user "
            "WHERE deleted=0 ORDER BY id LIMIT 8"
        )
        print("users:", cursor.fetchall())
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.columns "
            "WHERE table_schema=DATABASE() AND table_name='app_message_record' "
            "AND column_name='receiver_read_status'"
        )
        print("receiver_read_status_column:", cursor.fetchone()[0])
        for table in ("app_message_record", "app_message_whisper", "app_system_message",
                      "app_assistant_message", "community_report"):
            cursor.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema=DATABASE() AND table_name=%s AND is_nullable='NO' "
                "AND column_default IS NULL AND extra NOT LIKE '%%auto_increment%%' "
                "ORDER BY ordinal_position",
                (table,),
            )
            print(f"required_columns[{table}]:", [row[0] for row in cursor.fetchall()])


def verify_demo(connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT id,nickname FROM app_user WHERE deleted=0 "
            "AND account_status IN ('ACTIVE','NORMAL') ORDER BY id LIMIT 2"
        )
        users = cursor.fetchall()
        for user_id, nickname in users:
            print(f"demo_user[{user_id}]:", nickname)
            cursor.execute(
                "SELECT send_status,receiver_read_status,COUNT(*) FROM app_message_record "
                "WHERE deleted=0 AND conversation_id IS NOT NULL "
                "AND message_type IN ('text','whisper_reply') "
                "AND (sender_user_id=%s OR receiver_user_id=%s) "
                "GROUP BY send_status,receiver_read_status ORDER BY send_status,receiver_read_status",
                (user_id, user_id),
            )
            print("  private:", cursor.fetchall())
            cursor.execute(
                "SELECT status,delivery_status,COUNT(*) FROM app_message_whisper "
                "WHERE deleted=0 AND (sender_user_id=%s OR receiver_user_id=%s) "
                "GROUP BY status,delivery_status ORDER BY status,delivery_status",
                (user_id, user_id),
            )
            print("  whispers:", cursor.fetchall())
            cursor.execute(
                "SELECT channel,read_status,COUNT(*) FROM ("
                "SELECT 'system' channel,IF(read_at IS NULL,'unread','read') read_status "
                "FROM app_system_message WHERE deleted=0 AND receiver_user_id=%s "
                "UNION ALL SELECT 'assistant',IF(read_at IS NULL,'unread','read') "
                "FROM app_assistant_message WHERE deleted=0 AND receiver_user_id=%s"
                ") p GROUP BY channel,read_status ORDER BY channel,read_status",
                (user_id, user_id),
            )
            print("  platform:", cursor.fetchall())
            cursor.execute(
                "SELECT status,COUNT(*) FROM community_report WHERE deleted=0 "
                "AND (reporter_id=%s OR target_user_id=%s OR reported_user_id=%s) "
                "AND (target_type IN ('chat','message','conversation','whisper') "
                "OR source_scene IN ('chat','whisper')) GROUP BY status ORDER BY status",
                (user_id, user_id, user_id),
            )
            print("  reports:", cursor.fetchall())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("probe", "migrate", "seed", "verify", "all"))
    args = parser.parse_args()
    connection = connect()
    try:
        if args.action in ("migrate", "all"):
            print("migration_statements:", execute_file(connection, MIGRATION))
        if args.action in ("seed", "all"):
            print("seed_statements:", execute_file(connection, SEED))
        if args.action in ("verify", "all"):
            verify_demo(connection)
        probe(connection)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


if __name__ == "__main__":
    main()
