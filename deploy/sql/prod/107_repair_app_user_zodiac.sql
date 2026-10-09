-- 统一修复有出生日期用户的历史星座缓存。
-- 应用读取已改为按生日实时派生；本迁移同步修正存量字段，避免导出或离线任务继续使用旧值。

SET NAMES utf8mb4;

-- 首次执行时保存旧值，便于出现边界规则争议时按用户回滚。
-- INSERT IGNORE 保证发布重试不会覆盖首次备份。
CREATE TABLE IF NOT EXISTS app_user_zodiac_backup_20261009 (
    user_id BIGINT NOT NULL COMMENT 'app_user.id',
    old_zodiac VARCHAR(16) NULL COMMENT '修复前星座',
    backed_up_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '备份时间',
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='2026-10-09 星座历史值修复备份';

INSERT IGNORE INTO app_user_zodiac_backup_20261009 (user_id, old_zodiac)
SELECT id, zodiac
FROM app_user
WHERE birthday IS NOT NULL
  AND deleted = 0;

UPDATE app_user
SET zodiac = CASE
    WHEN (MONTH(birthday) = 1 AND DAY(birthday) >= 20)
      OR (MONTH(birthday) = 2 AND DAY(birthday) <= 18) THEN '水瓶座'
    WHEN (MONTH(birthday) = 2 AND DAY(birthday) >= 19)
      OR (MONTH(birthday) = 3 AND DAY(birthday) <= 20) THEN '双鱼座'
    WHEN (MONTH(birthday) = 3 AND DAY(birthday) >= 21)
      OR (MONTH(birthday) = 4 AND DAY(birthday) <= 19) THEN '白羊座'
    WHEN (MONTH(birthday) = 4 AND DAY(birthday) >= 20)
      OR (MONTH(birthday) = 5 AND DAY(birthday) <= 20) THEN '金牛座'
    WHEN (MONTH(birthday) = 5 AND DAY(birthday) >= 21)
      OR (MONTH(birthday) = 6 AND DAY(birthday) <= 21) THEN '双子座'
    WHEN (MONTH(birthday) = 6 AND DAY(birthday) >= 22)
      OR (MONTH(birthday) = 7 AND DAY(birthday) <= 22) THEN '巨蟹座'
    WHEN (MONTH(birthday) = 7 AND DAY(birthday) >= 23)
      OR (MONTH(birthday) = 8 AND DAY(birthday) <= 22) THEN '狮子座'
    WHEN (MONTH(birthday) = 8 AND DAY(birthday) >= 23)
      OR (MONTH(birthday) = 9 AND DAY(birthday) <= 22) THEN '处女座'
    WHEN (MONTH(birthday) = 9 AND DAY(birthday) >= 23)
      OR (MONTH(birthday) = 10 AND DAY(birthday) <= 23) THEN '天秤座'
    WHEN (MONTH(birthday) = 10 AND DAY(birthday) >= 24)
      OR (MONTH(birthday) = 11 AND DAY(birthday) <= 22) THEN '天蝎座'
    WHEN (MONTH(birthday) = 11 AND DAY(birthday) >= 23)
      OR (MONTH(birthday) = 12 AND DAY(birthday) <= 21) THEN '射手座'
    ELSE '摩羯座'
END
WHERE birthday IS NOT NULL
  AND deleted = 0;

SELECT ROW_COUNT() AS repaired_user_count;
