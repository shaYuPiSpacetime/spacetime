#!/usr/bin/env python3
"""Generate the deterministic sensitive-word production seed from the approved vocabulary archive.

The script emits aggregate validation only. It never prints word content.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import zipfile
from collections import Counter
import subprocess
import sys
from pathlib import Path
from typing import Iterable


EXPECTED_ARCHIVE_SHA256 = "f54fa00072be1b86a8cdf5723dcaf34b04c27bf4e78c9b2352f2e62f8b3132c1"
EXPECTED_RAW_RECORDS = 89_452
EXPECTED_CATEGORY_RECORDS = 76_702
EXPECTED_GLOBAL_WORDS = 51_344
CLEAN_ARCHIVE_SHA256 = "83efc5d2250d3f5b8053d50550c9d6fba18f8a346f243b9da31c1d28d7a1f879"
CLEAN3_ARCHIVE_SHA256 = "1099308ba86bcc95d8bbd84b7bcc66fcfd7b5057948422a57ad9caff3dd6084a"
APPROVED_ARCHIVES = {
    EXPECTED_ARCHIVE_SHA256: (89_452, 76_702, 51_344),
    CLEAN_ARCHIVE_SHA256: (73_560, 73_560, 49_188),
    CLEAN3_ARCHIVE_SHA256: (48_244, 48_244, 48_244),
}

CATEGORIES = (
    ("SENSITIVE_LEXICON", "SensitiveLexicon.json"),
    ("COVID_19", "COVID-19词库.txt"),
    ("GFW_SUPPLEMENT", "GFW补充词库.txt"),
    ("OTHER", "其他词库.txt"),
    ("REACTIONARY", "反动词库.txt"),
    ("ADVERTISEMENT", "广告类型.txt"),
    ("POLITICS", "政治类型.txt"),
    ("NEW_THOUGHT", "新思想启蒙.txt"),
    ("TERRORISM", "暴恐词库.txt"),
    ("LIVELIHOOD", "民生词库.txt"),
    ("WEAPONS", "涉枪涉爆.txt"),
    ("NETEASE", "网易前端过滤敏感词库.txt"),
    ("PORNOGRAPHY_TYPE", "色情类型.txt"),
    ("PORNOGRAPHY", "色情词库.txt"),
    ("SUPPLEMENT", "补充词库.txt"),
    ("CORRUPTION", "贪腐词库.txt"),
    ("TENCENT", "零时-Tencent.txt"),
    ("ILLEGAL_URL", "非法网址.txt"),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def archive_members(archive: Path) -> dict[str, str]:
    if zipfile.is_zipfile(archive):
        members = {}
        with zipfile.ZipFile(archive) as zipped:
            for info in zipped.infolist():
                if info.is_dir():
                    continue
                decoded = info.filename if info.flag_bits & 0x800 else info.filename.encode("cp437").decode("gb18030")
                basename = decoded.replace(chr(92), "/").rsplit("/", 1)[-1]
                if basename in members:
                    raise ValueError("archive contains duplicate basename")
                members[basename] = info.filename
        return members
    result = subprocess.run(
        ["tar", "-tf", str(archive)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    decoded = result.stdout.decode("gb18030")
    members: dict[str, str] = {}
    for member in decoded.splitlines():
        basename = member.replace("\\", "/").rsplit("/", 1)[-1]
        if basename:
            if basename in members:
                raise ValueError(f"archive contains duplicate basename: {basename}")
            members[basename] = member
    return members


def read_member(archive: Path, member: str) -> str:
    if zipfile.is_zipfile(archive):
        with zipfile.ZipFile(archive) as zipped:
            return zipped.read(member).decode("utf-8-sig")
    result = subprocess.run(
        ["tar", "-xOf", str(archive), member],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout.decode("utf-8-sig")


def source_words(filename: str, content: str) -> list[str]:
    if filename.lower().endswith(".json"):
        document = json.loads(content)
        words = document.get("words")
        if not isinstance(words, list) or not all(isinstance(word, str) for word in words):
            raise ValueError(f"{filename}: JSON field 'words' must be a string array")
        return words
    return content.splitlines()


def normalized_records(words: Iterable[str]) -> tuple[int, list[str]]:
    raw_count = 0
    unique: dict[str, None] = {}
    for original in words:
        word = trim_word(original)
        if not word:
            continue
        raw_count += 1
        unique.setdefault(word, None)
    return raw_count, list(unique)


def sql_utf8(value: str) -> str:
    """Encode data as a utf8mb4 hex literal, avoiding SQL escape ambiguity."""
    return f"CONVERT(0x{value.encode('utf-8').hex()} USING utf8mb4)"



TRIM_CODEPOINTS = (
    list(range(0x0009, 0x000E)) + list(range(0x001C, 0x0021))
    + [0x0085, 0x00A0, 0x1680] + list(range(0x2000, 0x200B))
    + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000]
)
TRIM_CHARACTERS = "".join(chr(value) for value in TRIM_CODEPOINTS)
CATEGORY_RANDOM_SEED = 20260908


def trim_word(value: str) -> str:
    """Same two-ended whitespace set as the Java API."""
    return value.strip(TRIM_CHARACTERS)


def assign_categories(entries: Iterable[tuple[str, str]]) -> list[tuple[str, str]]:
    """Globally deduplicate exact trimmed originals, deterministically choose one source category."""
    candidates: dict[str, set[str]] = {}
    for category, original in entries:
        word = trim_word(original)
        if word:
            if len(word.encode("utf-16-le")) // 2 > 256:
                raise ValueError("a word exceeds the Java/API UTF-16 length limit")
            candidates.setdefault(word, set()).add(category)
    generator = random.Random(CATEGORY_RANDOM_SEED)
    return [(generator.choice(sorted(candidates[word])), word) for word in sorted(candidates)]


def seed_sql(rows: list[tuple[str, str]], status: str, archive_sha256: str = EXPECTED_ARCHIVE_SHA256) -> str:
    """Transaction handler rolls back every inserted batch on any failure."""
    if status not in ("ENABLED", "DISABLED", "REQUIRED"):
        raise ValueError("initial status must be ENABLED, DISABLED or REQUIRED")
    initial_value = "@sensitive_word_initial_status" if status == "REQUIRED" else "\'" + status + "\'"
    lines = [
        "-- Generated by scripts/generate_sensitive_word_seed.py.",
        "-- Apply with scripts/apply_sensitive_word_migration.py to serialize procedure DDL.",
        "-- Data only; global exact dedup; deterministic single source category.",
        "-- Existing table data, including deleted rows, causes the WHOLE seed to be skipped.",
        f"-- Archive SHA-256: {archive_sha256}",
        f"-- Initial status: {status}; expected records: {len(rows)}.",
        "DELIMITER $$",
        "DROP PROCEDURE IF EXISTS seed_content_sensitive_word_20260908$$",
        "CREATE PROCEDURE seed_content_sensitive_word_20260908()",
        "BEGIN",
        "    DECLARE existing_count BIGINT DEFAULT 0;",
        "    DECLARE revision_value BIGINT DEFAULT NULL;",
        f"    DECLARE initial_status VARCHAR(20) DEFAULT {initial_value};",
        "    DECLARE EXIT HANDLER FOR SQLEXCEPTION",
        "    BEGIN",
        "        ROLLBACK;",
        "        RESIGNAL;",
        "    END;",
        "    IF initial_status IS NULL OR initial_status NOT IN (\'ENABLED\', \'DISABLED\') THEN",
        "        SIGNAL SQLSTATE \'45000\' SET MESSAGE_TEXT = \'Set initial sensitive word status explicitly\';",
        "    END IF;",
        "    START TRANSACTION;",
        "    SELECT revision INTO revision_value FROM content_sensitive_word_revision",
        "    WHERE id = 1 AND deleted = 0 FOR UPDATE;",
        "    IF revision_value IS NULL THEN",
        "        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sensitive word revision row is missing';",
        "    END IF;",
        "    SELECT COUNT(*) INTO existing_count FROM content_sensitive_word;",
        "    IF existing_count = 0 THEN",
    ]
    for offset in range(0, len(rows), 500):
        lines.append("        INSERT INTO content_sensitive_word (category_code, word, status, create_time, update_time, deleted) VALUES")
        values = [
            f"({sql_utf8(category)}, {sql_utf8(word)}, initial_status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)"
            for category, word in rows[offset:offset + 500]
        ]
        lines.append(",\n".join(values) + ";")
    lines.extend([
        "        UPDATE content_sensitive_word_revision",
        "        SET revision = revision + 1, update_time = CURRENT_TIMESTAMP WHERE id = 1 AND deleted = 0;",
        "        IF ROW_COUNT() <> 1 THEN",
        "            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sensitive word revision update failed';",
        "        END IF;",
        "    END IF;",
        "    COMMIT;",
        f"    SELECT IF(existing_count = 0, 'INITIALIZED', 'SKIPPED_NONEMPTY') AS seed_result, IF(existing_count = 0, {len(rows)}, existing_count) AS records;",
        "END$$",
        "CALL seed_content_sensitive_word_20260908()$$",
        "DROP PROCEDURE seed_content_sensitive_word_20260908$$",
        "DELIMITER ;",
        "",
    ])
    return "\n".join(lines)


def collect_entries(archive: Path) -> tuple[list[tuple[str, str]], dict[str, object]]:
    actual_sha = sha256_file(archive)
    if actual_sha not in APPROVED_ARCHIVES:
        raise ValueError("archive SHA-256 does not match the approved vocabulary")
    members = archive_members(archive)
    entries: list[tuple[str, str]] = []
    category_counts = {}
    raw_total = 0
    for category, filename in CATEGORIES:
        if filename not in members:
            raise ValueError(f"missing source category: {category}")
        raw, words = normalized_records(source_words(filename, read_member(archive, members[filename])))
        raw_total += raw
        entries.extend((category, word) for word in words)
        category_counts[category] = {"sourceFile": filename, "rawRecords": raw, "uniqueRecords": len(words)}
    expected_raw, expected_categories, expected_global = APPROVED_ARCHIVES[actual_sha]
    if (raw_total, len(entries), len({word for _, word in entries})) != (
            expected_raw, expected_categories, expected_global):
        raise ValueError("source word counts do not match the approved archive")
    summary = {"archiveSha256": actual_sha, "categoryCount": len(CATEGORIES), "rawRecords": raw_total,
               "categoryUniqueRecords": len(entries), "globalUniqueWords": expected_global,
               "sourceCategories": category_counts}
    combined_name = "全库合并总表.txt"
    if combined_name in members:
        combined_raw, combined_words = normalized_records(
            source_words(combined_name, read_member(archive, members[combined_name])))
        if set(combined_words) != {word for _, word in entries}:
            raise ValueError("combined word list differs from category files")
        summary["combinedListVerification"] = {
            "sourceFile": combined_name, "rawRecords": combined_raw,
            "uniqueRecords": len(combined_words), "matchesCategoryWords": True,
            "importedSeparately": False,
        }
    return entries, summary


def generate(archive: Path, output: Path, summary_output: Path | None, status: str) -> dict[str, object]:
    entries, summary = collect_entries(archive)
    rows = assign_categories(entries)
    sql = seed_sql(rows, status, summary["archiveSha256"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(sql, encoding="utf-8", newline="\n")
    assigned = Counter(category for category, _ in rows)
    summary.update({
        "initialStatus": status, "categoryRandomSeed": CATEGORY_RANDOM_SEED,
        "initializedRecords": len(rows), "duplicateActiveOriginalWords": 0,
        "maxWordUtf16Units": max(len(word.encode("utf-16-le")) // 2 for _, word in rows),
        "assignedCategoryCounts": {category: assigned[category] for category, _ in CATEGORIES},
        "sqlSha256": hashlib.sha256(sql.encode("utf-8")).hexdigest(),
    })
    if summary_output:
        summary_output.parent.mkdir(parents=True, exist_ok=True)
        summary_output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return summary


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("deploy/sql/prod/082_content_sensitive_word_seed.sql"))
    parser.add_argument("--summary", type=Path)
    parser.add_argument("--status", required=True, choices=["ENABLED", "DISABLED", "REQUIRED"],
                        help="explicitly selected initial status; never silently enables a seed")
    args = parser.parse_args()
    try:
        result = generate(args.archive, args.output, args.summary, args.status)
    except (OSError, subprocess.CalledProcessError, UnicodeError, ValueError) as exc:
        print("seed generation failed: " + str(exc), file=sys.stderr)
        return 1
    print(json.dumps({key: result[key] for key in [
        "categoryCount", "rawRecords", "categoryUniqueRecords", "initializedRecords",
        "initialStatus", "assignedCategoryCounts", "sqlSha256"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
