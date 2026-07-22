#!/usr/bin/env python3
"""Seed repeatable PRD-02 relation demo flows in the configured dev database."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib import request

import pymysql


SCENES = ("profile", "featured", "ideal", "fate", "likes_me", "recent_viewers")
INVALID_REASONS = ("blocked", "account_frozen", "account_deleted", "risk_banned", "certification_revoked")
TARGET_USER_ID = 108
DEMO_PREFIX = "PRD02-DEMO-U108"


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def api_json(base_url: str, method: str, path: str, body: Any = None, token: str | None = None) -> Any:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Auth-Token"] = token
    payload = None if body is None else json.dumps(body).encode("utf-8")
    req = request.Request(base_url + path, data=payload, headers=headers, method=method)
    with request.urlopen(req, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    if result.get("code") != 200:
        raise RuntimeError(f"{method} {path} failed: code={result.get('code')}, msg={result.get('msg')}")
    return result.get("data")


def connect(env: dict[str, str], *, autocommit: bool):
    return pymysql.connect(
        host=env["DEV_DB_HOST"],
        port=int(env.get("DEV_DB_PORT") or 3306),
        user=env["DEV_DB_USER"],
        password=env["DEV_DB_PASSWORD"],
        database=env["DEV_DB_NAME"],
        charset="utf8mb4",
        autocommit=autocommit,
        cursorclass=pymysql.cursors.DictCursor,
    )


def approve_target_certifications(env: dict[str, str], base_url: str, user_id: int) -> list[str]:
    with connect(env, autocommit=True) as conn, conn.cursor() as cursor:
        cursor.execute(
            """
            SELECT record.id, record.audit_type, record.status
            FROM app_user_audit_record record
            JOIN (
                SELECT audit_type, MAX(id) AS id
                FROM app_user_audit_record
                WHERE user_id=%s
                  AND audit_type IN ('REAL_NAME', 'EDUCATION', 'AVATAR')
                  AND deleted=0
                GROUP BY audit_type
            ) latest ON latest.id=record.id
            ORDER BY record.audit_type
            """,
            (user_id,),
        )
        records = cursor.fetchall()
    if {row["audit_type"] for row in records} != {"REAL_NAME", "EDUCATION", "AVATAR"}:
        raise RuntimeError(f"user {user_id} does not have all three certification records")

    pending = [row for row in records if row["status"] != "APPROVED"]
    token = None
    if pending:
        account = env.get("DEV_ADMIN_ACCOUNT")
        password = env.get("DEV_ADMIN_PASSWORD")
        if not account or not password:
            raise RuntimeError(
                "DEV_ADMIN_ACCOUNT and DEV_ADMIN_PASSWORD are required to approve pending certifications"
            )
        login = api_json(
            base_url,
            "POST",
            "/admin/login",
            {"account": account, "password": password},
        )
        token = login["token"]

    endpoints = {
        "REAL_NAME": "real-name",
        "EDUCATION": "education",
        "AVATAR": "avatar",
    }
    approved: list[str] = []
    for row in records:
        if row["status"] != "APPROVED":
            api_json(
                base_url,
                "POST",
                f"/admin/verify/{endpoints[row['audit_type']]}/{row['id']}/audit",
                {"action": "APPROVE"},
                token,
            )
        approved.append(row["audit_type"])
    return approved


def select_counterparties(cursor, user_id: int, count: int) -> list[dict[str, Any]]:
    cursor.execute(
        """
        SELECT id, nickname
        FROM app_user
        WHERE id<>%s AND deleted=0 AND account_status='NORMAL'
        ORDER BY id DESC
        LIMIT %s
        """,
        (user_id, count),
    )
    users = cursor.fetchall()
    if len(users) < count:
        raise RuntimeError(f"need {count} normal counterparties, found {len(users)}")
    return users


def ensure_like(cursor, like_no: str, request_id: str, from_user_id: int, to_user_id: int,
                scene: str, liked_time: datetime) -> str:
    cursor.execute(
        """
        SELECT like_no
        FROM app_relation_like
        WHERE from_user_id=%s AND to_user_id=%s AND like_status='active'
          AND active_marker=1 AND deleted=0
        LIMIT 1
        """,
        (from_user_id, to_user_id),
    )
    existing = cursor.fetchone()
    if existing:
        return existing["like_no"]
    cursor.execute(
        """
        INSERT INTO app_relation_like (
            like_no, request_id, from_user_id, to_user_id, source_scene,
            like_status, active_marker, liked_time,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,%s,'active',1,%s,%s,%s,%s,%s,0)
        """,
        (
            like_no,
            request_id,
            from_user_id,
            to_user_id,
            scene,
            liked_time,
            liked_time,
            liked_time,
            from_user_id,
            from_user_id,
        ),
    )
    return like_no


def ensure_closed_like(cursor, index: int, from_user_id: int, to_user_id: int,
                       scene: str, liked_time: datetime) -> None:
    status = "cancelled" if index % 2 else "invalid"
    invalid_reason = "like_cancelled" if status == "cancelled" else INVALID_REASONS[(index // 2) % len(INVALID_REASONS)]
    invalid_time = liked_time + timedelta(minutes=15)
    cancelled_time = invalid_time if status == "cancelled" else None
    cursor.execute(
        """
        INSERT INTO app_relation_like (
            like_no, request_id, from_user_id, to_user_id, source_scene,
            like_status, active_marker, liked_time, cancelled_time, invalid_reason, invalid_time,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,%s,%s,NULL,%s,%s,%s,%s,%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            from_user_id=VALUES(from_user_id), to_user_id=VALUES(to_user_id),
            source_scene=VALUES(source_scene), like_status=VALUES(like_status), active_marker=NULL,
            liked_time=VALUES(liked_time), cancelled_time=VALUES(cancelled_time),
            invalid_reason=VALUES(invalid_reason), invalid_time=VALUES(invalid_time),
            update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            f"LIK-DEMO-U108-HISTORY-{index:03d}",
            f"{DEMO_PREFIX}-LIKE-HISTORY-{index:03d}",
            from_user_id,
            to_user_id,
            scene,
            status,
            liked_time,
            cancelled_time,
            invalid_reason,
            invalid_time,
            liked_time,
            invalid_time,
            from_user_id,
            from_user_id,
        ),
    )


def ensure_match(cursor, index: int, user_a: int, user_b: int, inbound_like_no: str,
                 outbound_like_no: str, matched_time: datetime) -> tuple[int, str]:
    low, high = sorted((user_a, user_b))
    cursor.execute(
        """
        SELECT id, match_no
        FROM app_relation_match
        WHERE user_low_id=%s AND user_high_id=%s AND match_status='matched'
          AND active_marker=1 AND deleted=0
        LIMIT 1
        """,
        (low, high),
    )
    match = cursor.fetchone()
    if not match:
        match_no = f"MAT-DEMO-U108-{index:03d}"
        cursor.execute(
            """
            INSERT INTO app_relation_match (
                match_no, user_low_id, user_high_id, primary_source,
                match_status, active_marker, matched_time,
                create_time, update_time, created_by, updated_by, deleted
            ) VALUES (%s,%s,%s,'double_like','matched',1,%s,%s,%s,%s,%s,0)
            """,
            (match_no, low, high, matched_time, matched_time, matched_time, user_a, user_a),
        )
        match = {"id": cursor.lastrowid, "match_no": match_no}

    event_no = "|".join(sorted((inbound_like_no, outbound_like_no)))
    source_no = f"MTS-DEMO-U108-{index:03d}-LIKE"
    cursor.execute(
        """
        INSERT INTO app_relation_match_source (
            source_no, match_id, source_type, source_event_no, source_status,
            effective_time, create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,'double_like',%s,'active',%s,%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            match_id=VALUES(match_id), source_status='active', revoked_time=NULL,
            invalid_reason=NULL, effective_time=VALUES(effective_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            source_no,
            match["id"],
            event_no,
            matched_time,
            matched_time,
            matched_time,
            user_a,
            user_a,
        ),
    )

    extra_source = "whisper_reply" if index % 2 == 0 else "featured_heart_return_like"
    cursor.execute(
        """
        INSERT INTO app_relation_match_source (
            source_no, match_id, source_type, source_event_no, source_status,
            effective_time, create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,'active',%s,%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            match_id=VALUES(match_id), source_status='active', revoked_time=NULL,
            invalid_reason=NULL, effective_time=VALUES(effective_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            f"MTS-DEMO-U108-{index:03d}-EXTRA",
            match["id"],
            extra_source,
            f"{DEMO_PREFIX}-MATCH-EVENT-{index:03d}",
            matched_time + timedelta(minutes=1),
            matched_time,
            matched_time,
            user_a,
            user_a,
        ),
    )

    for popup_user_id in (low, high):
        is_target = popup_user_id == TARGET_USER_ID
        popup_status = "read" if index % 3 == 0 else "pending"
        read_time = matched_time + timedelta(minutes=5) if popup_status == "read" else None
        read_action = "chat" if is_target and popup_status == "read" else (
            "profile" if popup_status == "read" else None
        )
        cursor.execute(
            """
            INSERT INTO app_relation_match_popup (
                match_id, match_no, user_id, popup_status, delivered_time,
                read_time, read_action, create_time, update_time, created_by, updated_by, deleted
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0)
            ON DUPLICATE KEY UPDATE
                popup_status=VALUES(popup_status), delivered_time=VALUES(delivered_time),
                read_time=VALUES(read_time), read_action=VALUES(read_action),
                cancelled_time=NULL, update_time=VALUES(update_time), deleted=0
            """,
            (
                match["id"],
                match["match_no"],
                popup_user_id,
                popup_status,
                matched_time + timedelta(minutes=2),
                read_time,
                read_action,
                matched_time,
                matched_time,
                user_a,
                user_a,
            ),
        )
    return match["id"], match["match_no"]


def ensure_visit(cursor, index: int, visitor_user_id: int, target_user_id: int,
                 scene: str, status: str, last_visit_time: datetime,
                 invalid_reason: str | None = None, invalid_time: datetime | None = None) -> str:
    visit_no = f"VIS-DEMO-U108-{index:03d}"
    first_visit_time = last_visit_time - timedelta(minutes=10)
    cursor.execute(
        """
        INSERT INTO app_relation_visit (
            visit_no, visitor_user_id, target_user_id, source_scene, visit_status,
            first_visit_time, last_visit_time, pv_count, invalid_reason, invalid_time,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,3,%s,%s,%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            visitor_user_id=VALUES(visitor_user_id), target_user_id=VALUES(target_user_id),
            source_scene=VALUES(source_scene), visit_status=VALUES(visit_status),
            first_visit_time=VALUES(first_visit_time), last_visit_time=VALUES(last_visit_time),
            pv_count=3, invalid_reason=VALUES(invalid_reason), invalid_time=VALUES(invalid_time),
            update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            visit_no,
            visitor_user_id,
            target_user_id,
            scene,
            status,
            first_visit_time,
            last_visit_time,
            invalid_reason,
            invalid_time,
            first_visit_time,
            last_visit_time,
            visitor_user_id,
            visitor_user_id,
        ),
    )
    cursor.execute("SELECT id FROM app_relation_visit WHERE visit_no=%s", (visit_no,))
    visit_id = cursor.fetchone()["id"]
    for event_index in range(1, 4):
        visit_time = first_visit_time + timedelta(minutes=5 * (event_index - 1))
        cursor.execute(
            """
            INSERT INTO app_relation_visit_event (
                event_no, visit_id, visitor_user_id, target_user_id, source_scene,
                visit_time, create_time, update_time, created_by, updated_by, deleted
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,0)
            ON DUPLICATE KEY UPDATE
                visit_id=VALUES(visit_id), visitor_user_id=VALUES(visitor_user_id),
                target_user_id=VALUES(target_user_id), source_scene=VALUES(source_scene),
                visit_time=VALUES(visit_time), update_time=VALUES(update_time), deleted=0
            """,
            (
                f"VIE-DEMO-U108-{index:03d}-{event_index}",
                visit_id,
                visitor_user_id,
                target_user_id,
                SCENES[(index + event_index) % len(SCENES)],
                visit_time,
                visit_time,
                visit_time,
                visitor_user_id,
                visitor_user_id,
            ),
        )
    cursor.execute(
        """
        INSERT INTO app_relation_visit_cursor (
            visitor_user_id, target_user_id, current_visit_id, last_visit_time,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            current_visit_id=VALUES(current_visit_id), last_visit_time=VALUES(last_visit_time),
            update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            visitor_user_id,
            target_user_id,
            visit_id,
            last_visit_time,
            first_visit_time,
            last_visit_time,
            visitor_user_id,
            visitor_user_id,
        ),
    )
    return visit_no


def ensure_unlock(cursor, index: int, user_id: int, target_user_id: int,
                  target_type: str, target_no: str, effective_time: datetime) -> None:
    unlock_no = f"ULK-DEMO-U108-{index:03d}"
    unlock_scene = "likes_unlock_one" if target_type == "like" else "viewers_unlock_one"
    cursor.execute(
        """
        INSERT INTO app_user_unlock_record (
            unlock_no, request_id, user_id, target_user_id, target_biz_type, target_biz_no,
            active_marker, unlock_scene, unlock_method, coin_cost,
            effective_time, expire_time, status,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,%s,%s,%s,%s,1,%s,'coin',8,%s,NULL,'active',%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            request_id=VALUES(request_id), target_user_id=VALUES(target_user_id),
            target_biz_type=VALUES(target_biz_type),
            target_biz_no=VALUES(target_biz_no), active_marker=1,
            unlock_scene=VALUES(unlock_scene), unlock_method='coin', coin_cost=8,
            effective_time=VALUES(effective_time), expire_time=NULL, status='active',
            refund_no=NULL, update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            unlock_no,
            f"{DEMO_PREFIX}-UNLOCK-{index:03d}",
            user_id,
            target_user_id,
            target_type,
            target_no,
            unlock_scene,
            effective_time,
            effective_time,
            effective_time,
            user_id,
            user_id,
        ),
    )
    cursor.execute("SELECT id FROM app_user_unlock_record WHERE unlock_no=%s", (unlock_no,))
    unlock_id = cursor.fetchone()["id"]
    starting_balance = 8984
    balance_before = starting_balance - (index - 1) * 8
    balance_after = balance_before - 8
    cursor.execute(
        """
        INSERT INTO app_user_coin_log (
            flow_no, user_id, flow_type, change_amount, balance_before, balance_after,
            biz_scene, biz_desc, ref_id, ref_type,
            create_time, update_time, created_by, updated_by, deleted
        ) VALUES (%s,%s,'consume',-8,%s,%s,%s,%s,%s,'unlock_record',%s,%s,%s,%s,0)
        ON DUPLICATE KEY UPDATE
            change_amount=-8, balance_before=VALUES(balance_before), balance_after=VALUES(balance_after),
            biz_scene=VALUES(biz_scene), biz_desc=VALUES(biz_desc), ref_id=VALUES(ref_id),
            update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
        """,
        (
            f"CF-DEMO-U108-{index:03d}",
            user_id,
            balance_before,
            balance_after,
            "likes_unlock" if target_type == "like" else "viewers_unlock",
            f"PRD02 demo relation unlock {target_type}:{target_no}",
            unlock_id,
            effective_time,
            effective_time,
            user_id,
            user_id,
        ),
    )


def seed(env: dict[str, str], user_id: int, count: int) -> dict[str, Any]:
    now = datetime.now().replace(microsecond=0)
    with connect(env, autocommit=False) as conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id FROM app_user WHERE id=%s AND deleted=0", (user_id,))
                if not cursor.fetchone():
                    raise RuntimeError(f"target user {user_id} does not exist")
                counterparties = select_counterparties(cursor, user_id, count)
                inbound_likes: list[str] = []
                visits: list[str] = []

                for index, counterparty in enumerate(counterparties, start=1):
                    other_id = counterparty["id"]
                    scene = SCENES[(index - 1) % len(SCENES)]
                    base_time = now - timedelta(hours=index * 2)
                    inbound_like = ensure_like(
                        cursor,
                        f"LIK-DEMO-U108-IN-{index:03d}",
                        f"{DEMO_PREFIX}-LIKE-IN-{index:03d}",
                        other_id,
                        user_id,
                        scene,
                        base_time,
                    )
                    outbound_like = ensure_like(
                        cursor,
                        f"LIK-DEMO-U108-OUT-{index:03d}",
                        f"{DEMO_PREFIX}-LIKE-OUT-{index:03d}",
                        user_id,
                        other_id,
                        SCENES[index % len(SCENES)],
                        base_time + timedelta(minutes=10),
                    )
                    ensure_match(
                        cursor,
                        index,
                        user_id,
                        other_id,
                        inbound_like,
                        outbound_like,
                        base_time + timedelta(minutes=10),
                    )
                    closed_from, closed_to = (
                        (other_id, user_id) if index % 2 else (user_id, other_id)
                    )
                    ensure_closed_like(
                        cursor,
                        index,
                        closed_from,
                        closed_to,
                        SCENES[(index + 2) % len(SCENES)],
                        base_time + timedelta(minutes=20),
                    )
                    visit_status = ("visible", "expired_window", "invalid")[(index - 1) % 3]
                    visit_time = (
                        now - timedelta(days=8 + index)
                        if visit_status == "expired_window"
                        else base_time + timedelta(minutes=30)
                    )
                    visit_invalid_reason = (
                        INVALID_REASONS[index % len(INVALID_REASONS)]
                        if visit_status == "invalid"
                        else None
                    )
                    visit_invalid_time = (
                        visit_time + timedelta(minutes=30)
                        if visit_status == "invalid"
                        else None
                    )
                    visit_no = ensure_visit(
                        cursor,
                        index,
                        other_id,
                        user_id,
                        scene,
                        visit_status,
                        visit_time,
                        visit_invalid_reason,
                        visit_invalid_time,
                    )
                    inbound_likes.append(inbound_like)
                    visits.append(visit_no)

                for index, counterparty in enumerate(counterparties, start=1):
                    target_type = "like" if index % 2 else "visit"
                    target_no = inbound_likes[index - 1] if target_type == "like" else visits[index - 1]
                    ensure_unlock(
                        cursor,
                        index,
                        user_id,
                        counterparty["id"],
                        target_type,
                        target_no,
                        now - timedelta(hours=index),
                    )

                cursor.execute(
                    """
                    INSERT INTO app_user_asset (
                        user_id, vip_status, vip_expire_time, coin_balance,
                        today_free_whisper_remain, total_recharge, last_consume_time, last_purchase_time,
                        create_time, update_time, created_by, updated_by, deleted
                    ) VALUES (%s,'active',%s,8888,5,999.00,%s,%s,%s,%s,%s,%s,0)
                    ON DUPLICATE KEY UPDATE
                        vip_status='active', vip_expire_time=VALUES(vip_expire_time),
                        coin_balance=8888, today_free_whisper_remain=5,
                        total_recharge=GREATEST(total_recharge,999.00),
                        last_consume_time=VALUES(last_consume_time),
                        update_time=VALUES(update_time), updated_by=VALUES(updated_by), deleted=0
                    """,
                    (
                        user_id,
                        now + timedelta(days=90),
                        now,
                        now - timedelta(days=7),
                        now,
                        now,
                        user_id,
                        user_id,
                    ),
                )

                count_queries = {
                    "likes": "SELECT COUNT(*) AS c FROM app_relation_like WHERE deleted=0 AND (from_user_id=%s OR to_user_id=%s)",
                    "visits": "SELECT COUNT(*) AS c FROM app_relation_visit WHERE deleted=0 AND (visitor_user_id=%s OR target_user_id=%s)",
                    "matches": "SELECT COUNT(*) AS c FROM app_relation_match WHERE deleted=0 AND (user_low_id=%s OR user_high_id=%s)",
                    "unlocks": "SELECT COUNT(*) AS c FROM app_user_unlock_record WHERE deleted=0 AND (user_id=%s OR target_user_id=%s)",
                    "visitEvents": "SELECT COUNT(*) AS c FROM app_relation_visit_event WHERE deleted=0 AND (visitor_user_id=%s OR target_user_id=%s)",
                    "matchSources": "SELECT COUNT(*) AS c FROM app_relation_match_source s JOIN app_relation_match m ON m.id=s.match_id WHERE s.deleted=0 AND m.deleted=0 AND (m.user_low_id=%s OR m.user_high_id=%s)",
                    "matchPopups": "SELECT COUNT(*) AS c FROM app_relation_match_popup p JOIN app_relation_match m ON m.id=p.match_id WHERE p.deleted=0 AND m.deleted=0 AND (m.user_low_id=%s OR m.user_high_id=%s)",
                }
                counts: dict[str, int] = {}
                for key, sql in count_queries.items():
                    cursor.execute(sql, (user_id, user_id))
                    counts[key] = int(cursor.fetchone()["c"])
                if any(counts[key] < count for key in ("likes", "visits", "matches", "unlocks")):
                    raise RuntimeError(f"seed verification failed: {counts}")

                status_counts: dict[str, dict[str, int]] = {}
                status_queries = {
                    "likes": (
                        "SELECT like_status AS status, COUNT(*) AS c FROM app_relation_like "
                        "WHERE deleted=0 AND (from_user_id=%s OR to_user_id=%s) GROUP BY like_status"
                    ),
                    "visits": (
                        "SELECT visit_status AS status, COUNT(*) AS c FROM app_relation_visit "
                        "WHERE deleted=0 AND (visitor_user_id=%s OR target_user_id=%s) GROUP BY visit_status"
                    ),
                }
                for key, sql in status_queries.items():
                    cursor.execute(sql, (user_id, user_id))
                    status_counts[key] = {row["status"]: int(row["c"]) for row in cursor.fetchall()}
                if not {"active", "cancelled", "invalid"}.issubset(status_counts["likes"]):
                    raise RuntimeError(f"like status verification failed: {status_counts['likes']}")
                if not {"visible", "expired_window", "invalid"}.issubset(status_counts["visits"]):
                    raise RuntimeError(f"visit status verification failed: {status_counts['visits']}")
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    return {"userId": user_id, "counterparties": count, "counts": counts, "statusCounts": status_counts}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, default=TARGET_USER_ID)
    parser.add_argument("--count", type=int, default=12)
    parser.add_argument("--api-url", default="http://127.0.0.1:8080")
    parser.add_argument("--confirm-dev-data", action="store_true")
    args = parser.parse_args()
    if not args.confirm_dev_data:
        parser.error("--confirm-dev-data is required")
    if args.count < 10:
        parser.error("--count must be at least 10")
    if args.user_id != TARGET_USER_ID:
        parser.error(f"this seed is scoped to user {TARGET_USER_ID}")

    env = load_env(Path(".env"))
    env.update(load_env(Path("backend/.env.local")))
    required = ("DEV_DB_HOST", "DEV_DB_NAME", "DEV_DB_USER", "DEV_DB_PASSWORD")
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise RuntimeError(f"missing dev database settings: {', '.join(missing)}")

    approved = approve_target_certifications(env, args.api_url.rstrip("/"), args.user_id)
    result = seed(env, args.user_id, args.count)
    result["approvedCertifications"] = approved
    print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
