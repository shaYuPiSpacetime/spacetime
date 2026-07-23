#!/usr/bin/env python3
"""Run PRD-02 relation APIs against the configured dev environment.

The script creates temporary Redis login sessions, but all relation records are
created or changed through HTTP APIs. Relation data is intentionally retained so
it can be inspected from the admin console after the run.
"""

from __future__ import annotations

import argparse
import json
import secrets
import sys
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import error, parse, request

import pymysql
import redis


TARGET_USER_ID = 108
RELATION_PERMISSION = "user:app:relation:view"
SCENES = ("profile", "featured", "ideal", "fate", "likes_me", "recent_viewers")


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


def connect_db(env: dict[str, str]):
    return pymysql.connect(
        host=env["DEV_DB_HOST"],
        port=int(env.get("DEV_DB_PORT") or 3306),
        user=env["DEV_DB_USER"],
        password=env["DEV_DB_PASSWORD"],
        database=env["DEV_DB_NAME"],
        charset="utf8mb4",
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
    )


def connect_redis(env: dict[str, str]):
    return redis.Redis(
        host=env["DEV_REDIS_HOST"],
        port=int(env.get("DEV_REDIS_PORT") or 6379),
        username=env.get("DEV_REDIS_USERNAME") or None,
        password=env.get("DEV_REDIS_PASSWORD") or None,
        db=int(env.get("DEV_REDIS_DATABASE") or 1),
        decode_responses=True,
    )


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.results: list[dict[str, Any]] = []

    def call(
        self,
        case_id: str,
        method: str,
        path: str,
        token: str | None = None,
        body: Any = None,
        expected_code: int = 200,
        expected_http: int = 200,
    ) -> Any:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["X-Auth-Token"] = token
        payload = None if body is None else json.dumps(body).encode("utf-8")
        req = request.Request(self.base_url + path, data=payload, headers=headers, method=method)
        http_status = 0
        result: dict[str, Any]
        try:
            with request.urlopen(req, timeout=30) as response:
                http_status = response.status
                result = json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            http_status = exc.code
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                result = json.loads(raw)
            except json.JSONDecodeError:
                result = {"code": exc.code, "msg": raw}

        actual_code = int(result.get("code", -1))
        passed = http_status == expected_http and actual_code == expected_code
        self.results.append(
            {
                "caseId": case_id,
                "method": method,
                "path": path,
                "httpStatus": http_status,
                "code": actual_code,
                "passed": passed,
            }
        )
        if not passed:
            raise AssertionError(
                f"{case_id} {method} {path}: expected HTTP/code "
                f"{expected_http}/{expected_code}, got {http_status}/{actual_code}, "
                f"msg={result.get('msg')}"
            )
        return result.get("data")


def create_session(cache, prefix: str, user: dict[str, Any], permissions: list[str] | None = None):
    token = f"prd02-e2e-{secrets.token_urlsafe(24)}"
    context = {
        "id": user["id"],
        "nickname": user.get("nickname") or f"user-{user['id']}",
        "roles": [],
        "permissions": permissions or [],
    }
    key = prefix + token
    context_json = json.dumps(context, ensure_ascii=False)
    # RedisConfig applies GenericJackson2JsonRedisSerializer to String values.
    # A Java login therefore stores the serialized UserContext JSON as a JSON
    # string scalar rather than as a raw Redis JSON object.
    cache.setex(key, 7200, json.dumps(context_json, ensure_ascii=False))
    return token, key


def select_open_users(cursor, target_user_id: int, count: int):
    cursor.execute(
        """
        SELECT u.id, u.nickname, u.gender
        FROM app_user u
        JOIN (
            SELECT latest.user_id, COUNT(*) AS approved_count
            FROM app_user_audit_record record
            JOIN (
                SELECT user_id, audit_type, MAX(id) AS id
                FROM app_user_audit_record
                WHERE audit_type IN ('REAL_NAME', 'EDUCATION', 'AVATAR')
                  AND deleted=0
                GROUP BY user_id, audit_type
            ) latest ON latest.id=record.id
            WHERE record.status='APPROVED' AND record.deleted=0
            GROUP BY latest.user_id
        ) cert ON cert.user_id=u.id AND cert.approved_count=3
        WHERE u.id=%s AND u.deleted=0 AND u.account_status='NORMAL'
          AND u.first_login_completed=1
        """,
        (target_user_id,),
    )
    target = cursor.fetchone()
    if target is None:
        raise RuntimeError(f"target user {target_user_id} is not an open relation user")

    cursor.execute(
        """
        SELECT u.id, u.nickname, u.gender
        FROM app_user u
        JOIN (
            SELECT latest.user_id, COUNT(*) AS approved_count
            FROM app_user_audit_record record
            JOIN (
                SELECT user_id, audit_type, MAX(id) AS id
                FROM app_user_audit_record
                WHERE audit_type IN ('REAL_NAME', 'EDUCATION', 'AVATAR')
                  AND deleted=0
                GROUP BY user_id, audit_type
            ) latest ON latest.id=record.id
            WHERE record.status='APPROVED' AND record.deleted=0
            GROUP BY latest.user_id
        ) cert ON cert.user_id=u.id AND cert.approved_count=3
        WHERE u.id<>%s AND u.deleted=0 AND u.account_status='NORMAL'
          AND u.first_login_completed=1
          AND u.gender IS NOT NULL AND u.gender<>%s
        ORDER BY u.id DESC
        LIMIT %s
        """,
        (target_user_id, target["gender"], count),
    )
    counterparties = cursor.fetchall()
    if len(counterparties) < count:
        raise RuntimeError(f"need {count} open counterparties, found {len(counterparties)}")
    return target, counterparties


def select_admin(cursor):
    cursor.execute(
        """
        SELECT DISTINCT u.id, u.nickname
        FROM sys_user u
        JOIN sys_user_role ur ON ur.user_id=u.id
        JOIN sys_role r ON r.id=ur.role_id AND r.status='ENABLED' AND r.deleted=0
        JOIN sys_role_menu rm ON rm.role_id=r.id
        JOIN sys_menu m ON m.id=rm.menu_id AND m.status='ENABLED' AND m.deleted=0
        WHERE u.status='ENABLED' AND u.deleted=0 AND m.perms=%s
        ORDER BY u.id
        LIMIT 1
        """,
        (RELATION_PERMISSION,),
    )
    admin = cursor.fetchone()
    if admin is None:
        raise RuntimeError(f"no enabled admin user owns permission {RELATION_PERMISSION}")
    cursor.execute(
        """
        SELECT DISTINCT m.perms
        FROM sys_user_role ur
        JOIN sys_role r ON r.id=ur.role_id AND r.status='ENABLED' AND r.deleted=0
        JOIN sys_role_menu rm ON rm.role_id=r.id
        JOIN sys_menu m ON m.id=rm.menu_id AND m.status='ENABLED' AND m.deleted=0
        WHERE ur.user_id=%s AND m.perms IS NOT NULL AND m.perms<>''
        ORDER BY m.perms
        """,
        (admin["id"],),
    )
    return admin, [row["perms"] for row in cursor.fetchall()]


def active_like_pairs(cursor, target_user_id: int, counterparty_ids: list[int]):
    cursor.execute(
        """
        SELECT from_user_id, to_user_id
        FROM app_relation_like
        WHERE deleted=0 AND like_status='active' AND active_marker=1
          AND (
            (from_user_id=%s AND to_user_id IN %s)
            OR (to_user_id=%s AND from_user_id IN %s)
          )
        """,
        (target_user_id, counterparty_ids, target_user_id, counterparty_ids),
    )
    return {(row["from_user_id"], row["to_user_id"]) for row in cursor.fetchall()}


def verify_database(cursor, batch: str, target_user_id: int, counterparty_ids: list[int]):
    like_pattern = f"{batch}-LIKE-%"
    visit_pattern = f"{batch}-VIS-%"
    cursor.execute(
        """
        SELECT like_status, COUNT(*) AS count
        FROM app_relation_like
        WHERE deleted=0 AND request_id LIKE %s
        GROUP BY like_status
        """,
        (like_pattern,),
    )
    like_statuses = {row["like_status"]: row["count"] for row in cursor.fetchall()}
    cursor.execute(
        """
        SELECT COUNT(*) AS count
        FROM app_relation_visit_event
        WHERE deleted=0 AND event_no LIKE %s
        """,
        (visit_pattern,),
    )
    visit_events = cursor.fetchone()["count"]
    cursor.execute(
        """
        SELECT match_status, COUNT(*) AS count
        FROM app_relation_match
        WHERE deleted=0
          AND (
            (user_low_id=%s AND user_high_id IN %s)
            OR (user_high_id=%s AND user_low_id IN %s)
          )
          AND matched_time >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        GROUP BY match_status
        """,
        (target_user_id, counterparty_ids, target_user_id, counterparty_ids),
    )
    match_statuses = {row["match_status"]: row["count"] for row in cursor.fetchall()}
    return {
        "likesByStatus": like_statuses,
        "visitEvents": visit_events,
        "matchesByStatus": match_statuses,
    }


def run(args):
    if not args.confirm_dev_data:
        raise RuntimeError("real dev data write requires --confirm-dev-data")

    root = Path(__file__).resolve().parents[1]
    backend_env = load_env(root / "backend" / ".env.local")
    e2e_env = load_env(root / "frontend" / "e2e-tests" / ".env")
    base_url = args.api_url or e2e_env.get("API_URL")
    if not base_url:
        raise RuntimeError("API_URL is not configured in frontend/e2e-tests/.env")

    batch = args.batch or datetime.now().strftime("API-E2E-%Y%m%d%H%M%S")
    client = ApiClient(base_url)
    cache = connect_redis(backend_env)
    session_keys: list[str] = []

    with connect_db(backend_env) as connection, connection.cursor() as cursor:
        target, counterparties = select_open_users(cursor, args.target_user_id, args.user_count)
        admin, admin_permissions = select_admin(cursor)
        target_token, key = create_session(cache, "miniapp:token:", target)
        session_keys.append(key)
        admin_token, key = create_session(cache, "admin:token:", admin, admin_permissions)
        session_keys.append(key)

        tokens: dict[int, str] = {}
        for user in counterparties:
            token, key = create_session(cache, "miniapp:token:", user)
            tokens[user["id"]] = token
            session_keys.append(key)

        try:
            client.call(
                "MOB-L1-AUTH-01",
                "GET",
                "/miniapp/relation/likes-me?page=1&size=20",
                expected_code=401,
                expected_http=401,
            )

            # Make the run repeatable by closing active test pairs through the public API.
            pairs = active_like_pairs(cursor, target["id"], [user["id"] for user in counterparties])
            for user in counterparties:
                user_id = user["id"]
                if (user_id, target["id"]) in pairs:
                    client.call(
                        f"MOB-L1-SETUP-IN-{user_id}",
                        "DELETE",
                        f"/miniapp/relation/likes/{target['id']}",
                        tokens[user_id],
                    )
                if (target["id"], user_id) in pairs:
                    client.call(
                        f"MOB-L1-SETUP-OUT-{user_id}",
                        "DELETE",
                        f"/miniapp/relation/likes/{user_id}",
                        target_token,
                    )

            inbound_like_nos: list[str] = []
            visit_nos: list[str] = []
            for index, user in enumerate(counterparties, start=1):
                user_id = user["id"]
                scene = SCENES[(index - 1) % len(SCENES)]
                event_no = f"{batch}-VIS-{user_id}"
                visit_body = {
                    "eventNo": event_no,
                    "targetUserId": target["id"],
                    "sourceScene": scene,
                }
                first_visit = client.call(
                    f"MOB-L1-VISIT-CREATE-{index:02d}",
                    "POST",
                    "/miniapp/relation/visits",
                    tokens[user_id],
                    visit_body,
                )
                second_visit = client.call(
                    f"MOB-L1-VISIT-IDEMPOTENT-{index:02d}",
                    "POST",
                    "/miniapp/relation/visits",
                    tokens[user_id],
                    visit_body,
                )
                if first_visit["visitNo"] != second_visit["visitNo"] or not second_visit["deduplicated"]:
                    raise AssertionError(f"visit idempotency failed for user {user_id}")
                visit_nos.append(first_visit["visitNo"])

                like_body = {
                    "requestId": f"{batch}-LIKE-IN-{user_id}",
                    "targetUserId": target["id"],
                    "sourceScene": scene,
                }
                first_like = client.call(
                    f"MOB-L1-LIKE-CREATE-{index:02d}",
                    "POST",
                    "/miniapp/relation/likes",
                    tokens[user_id],
                    like_body,
                )
                second_like = client.call(
                    f"MOB-L1-LIKE-IDEMPOTENT-{index:02d}",
                    "POST",
                    "/miniapp/relation/likes",
                    tokens[user_id],
                    like_body,
                )
                if first_like["likeNo"] != second_like["likeNo"]:
                    raise AssertionError(f"like idempotency failed for user {user_id}")
                inbound_like_nos.append(first_like["likeNo"])

            likes_before_read = client.call(
                "MOB-L1-LIKES-ME-01",
                "GET",
                "/miniapp/relation/likes-me?page=1&size=20",
                target_token,
            )
            if not likes_before_read.get("readCursor") or likes_before_read.get("newCount", 0) < args.user_count:
                raise AssertionError("likes-me did not return the expected unread snapshot")
            client.call(
                "MOB-L1-LIKES-READ-01",
                "POST",
                "/miniapp/relation/likes-me/read",
                target_token,
                {"readCursor": likes_before_read["readCursor"]},
            )
            likes_after_read = client.call(
                "MOB-L1-LIKES-ME-02",
                "GET",
                "/miniapp/relation/likes-me?page=1&size=20",
                target_token,
            )
            if likes_after_read.get("newCount") != 0:
                raise AssertionError("likes-me read cursor was not advanced")

            viewers = client.call(
                "MOB-L1-RECENT-VIEWERS-01",
                "GET",
                "/miniapp/relation/recent-viewers?page=1&size=20",
                target_token,
            )
            if viewers.get("total", 0) < args.user_count:
                raise AssertionError("recent-viewers total is lower than submitted visitors")

            match_nos: list[str] = []
            for index, user in enumerate(counterparties, start=1):
                user_id = user["id"]
                match = client.call(
                    f"MOB-L1-LIKE-BACK-{index:02d}",
                    "POST",
                    "/miniapp/relation/likes",
                    target_token,
                    {
                        "requestId": f"{batch}-LIKE-OUT-{user_id}",
                        "targetUserId": user_id,
                        "sourceScene": "likes_me",
                    },
                )
                if not match.get("matched") or not match.get("matchNo"):
                    raise AssertionError(f"mutual match was not created for user {user_id}")
                match_nos.append(match["matchNo"])

                popup = client.call(
                    f"MOB-L1-POPUP-PENDING-{index:02d}",
                    "GET",
                    "/miniapp/relation/match-popup/pending",
                    tokens[user_id],
                )
                if popup is None or popup.get("matchNo") != match["matchNo"]:
                    raise AssertionError(f"pending popup mismatch for user {user_id}")
                client.call(
                    f"MOB-L1-POPUP-READ-{index:02d}",
                    "POST",
                    f"/miniapp/relation/match-popup/{parse.quote(match['matchNo'])}/read",
                    tokens[user_id],
                    {"action": "profile" if index % 2 else "chat"},
                )

            matches_before_cancel = client.call(
                "MOB-L1-MUTUAL-MATCHES-01",
                "GET",
                "/miniapp/relation/mutual-matches?page=1&size=20",
                target_token,
            )
            if matches_before_cancel.get("total", 0) < args.user_count:
                raise AssertionError("mutual-matches total is lower than created matches")

            cancelled_user = counterparties[-1]
            cancelled = client.call(
                "MOB-L1-LIKE-CANCEL-01",
                "DELETE",
                f"/miniapp/relation/likes/{cancelled_user['id']}",
                target_token,
            )
            if cancelled.get("likeStatus") != "cancelled":
                raise AssertionError("cancel-like did not return cancelled status")
            matches_after_cancel = client.call(
                "MOB-L1-MUTUAL-MATCHES-02",
                "GET",
                "/miniapp/relation/mutual-matches?page=1&size=20",
                target_token,
            )
            if matches_after_cancel.get("total", 0) != matches_before_cancel.get("total", 0) - 1:
                raise AssertionError("cancel-like did not remove one active mutual match")

            # The target queue can contain older unavailable demo users. The endpoint
            # still must remain callable; each new match popup was verified above.
            client.call(
                "MOB-L1-POPUP-TARGET-QUERY-01",
                "GET",
                "/miniapp/relation/match-popup/pending",
                target_token,
            )

            admin_summary = client.call(
                "ADM-L1-RELATION-SUMMARY-01",
                "GET",
                f"/admin/users/app/{target['id']}/relations/summary",
                admin_token,
            )
            admin_likes = client.call(
                "ADM-L1-RELATION-LIKES-01",
                "GET",
                f"/admin/users/app/{target['id']}/relations/likes?page=1&size=50",
                admin_token,
            )
            admin_visits = client.call(
                "ADM-L1-RELATION-VISITS-01",
                "GET",
                f"/admin/users/app/{target['id']}/relations/visits?page=1&size=50",
                admin_token,
            )
            admin_matches = client.call(
                "ADM-L1-RELATION-MATCHES-01",
                "GET",
                f"/admin/users/app/{target['id']}/relations/matches?page=1&size=50",
                admin_token,
            )

            db_verification = verify_database(
                cursor, batch, target["id"], [user["id"] for user in counterparties]
            )
            if db_verification["visitEvents"] != args.user_count:
                raise AssertionError("visit event idempotency verification failed in database")
            if db_verification["likesByStatus"].get("active", 0) != args.user_count * 2 - 1:
                raise AssertionError("unexpected active like count for current batch")
            if db_verification["likesByStatus"].get("cancelled", 0) != 1:
                raise AssertionError("cancelled like was not retained in database")

            summary = {
                "batch": batch,
                "targetUser": {"id": target["id"], "nickname": target["nickname"]},
                "counterpartyUserIds": [user["id"] for user in counterparties],
                "submitted": {
                    "likes": len(inbound_like_nos) + len(match_nos),
                    "visitors": len(visit_nos),
                    "mutualMatchesCreated": len(match_nos),
                    "mutualMatchesRetained": len(match_nos) - 1,
                    "cancelledLikes": 1,
                },
                "mobileQuery": {
                    "likesTotal": likes_after_read.get("total"),
                    "likesVisibleTotal": likes_after_read.get("visibleTotal"),
                    "newCountAfterRead": likes_after_read.get("newCount"),
                    "visitorTotal": viewers.get("total"),
                    "visitorPv7d": viewers.get("visitorPv7d"),
                    "mutualTotalAfterCancel": matches_after_cancel.get("total"),
                },
                "adminQuery": {
                    "summary": admin_summary,
                    "likesTotal": admin_likes.get("total"),
                    "visitsTotal": admin_visits.get("total"),
                    "matchesTotal": admin_matches.get("total"),
                },
                "database": db_verification,
                "apiCases": len(client.results),
                "passedApiCases": sum(1 for item in client.results if item["passed"]),
                "cases": client.results,
            }
            print(json.dumps(summary, ensure_ascii=False, indent=2, default=str))
            return summary
        finally:
            if session_keys:
                cache.delete(*session_keys)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm-dev-data", action="store_true")
    parser.add_argument("--target-user-id", type=int, default=TARGET_USER_ID)
    parser.add_argument("--user-count", type=int, default=9)
    parser.add_argument("--api-url")
    parser.add_argument("--batch")
    return parser.parse_args()


if __name__ == "__main__":
    try:
        run(parse_args())
    except Exception as exc:
        print(f"PRD02_REAL_API_TEST_FAILED: {exc}", file=sys.stderr)
        raise
